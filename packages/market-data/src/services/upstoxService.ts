// packages/market-data/src/services/upstoxService.ts

import UpstoxClient from 'upstox-js-sdk';
import type { BrokerConnection, LiveMarketData, WebSocketMessage } from '../types';

// Define market data structure from Upstox
export interface UpstoxMarketData {
  instrument_key: string;
  last_price: number;
  volume: number;
  open_interest?: number;
  net_change?: number;
  percent_change?: number;
  depth?: {
    buy?: Array<{ price: number; quantity: number }>;
    sell?: Array<{ price: number; quantity: number }>;
  };
  ohlc?: {
    high: number;
    low: number;
    close: number;
  };
  timestamp: string;
}

// Define portfolio data structure
export interface UpstoxPortfolioData {
  type: 'order' | 'position' | 'holding' | 'gtt';
  data: Record<string, any>;
  timestamp: string;
}

// Define more specific types for Upstox SDK
interface UpstoxApiClient {
  authentications: {
    OAUTH2: {
      accessToken: string | undefined;
    };
  };
  instance: UpstoxApiClient;
}

interface UpstoxStreamer {
  connect(): void;
  disconnect(): void;
  autoReconnect(enable: boolean, interval: number, retries: number): void;
  on(event: string, callback: (data: any) => void): void;
  subscribe(instrumentKeys: string[], mode: string): Promise<void>;
  unsubscribe(instrumentKeys: string[]): Promise<void>;
  changeMode(instrumentKeys: string[], mode: string): Promise<void>;
}

export class UpstoxMarketDataService {
  private client!: UpstoxApiClient;
  private marketStreamer!: UpstoxStreamer;
  private portfolioStreamer!: UpstoxStreamer;
  private isConnected = false;
  private subscriptions = new Set<string>();

  constructor(private brokerConnection: BrokerConnection) {
    this.initializeClient();
  }

  private initializeClient(): void {
    const defaultClient = UpstoxClient.ApiClient.instance;
    const OAUTH2 = defaultClient.authentications['OAUTH2'];
    OAUTH2.accessToken = this.brokerConnection.accessToken;
    this.client = defaultClient;
  }

  // Market Data WebSocket Connection
  connectMarketData(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Initialize MarketDataStreamerV3
        this.marketStreamer = new UpstoxClient.MarketDataStreamerV3();

        // Configure auto-reconnect
        this.marketStreamer.autoReconnect(true, 10, 5); // 10 sec interval, 5 retries

        // Event Listeners
        this.marketStreamer.on('open', () => {
          console.log('Upstox Market Data WebSocket Connected');
          this.isConnected = true;
          resolve();
        });

        this.marketStreamer.on('message', (data: Buffer) => {
          try {
            const feed = data.toString('utf-8');
            const marketData = JSON.parse(feed) as UpstoxMarketData;
            this.handleMarketData(marketData);
          } catch (error) {
            console.error('Error parsing market data:', error);
          }
        });

        this.marketStreamer.on('error', (error: Error) => {
          console.error('Market Data WebSocket Error:', error);
          this.isConnected = false;
          reject(error);
        });

        this.marketStreamer.on('close', () => {
          console.log('Market Data WebSocket Disconnected');
          this.isConnected = false;
        });

        this.marketStreamer.on('reconnecting', () => {
          console.log('Market Data WebSocket Reconnecting...');
        });

        this.marketStreamer.on('autoReconnectStopped', (data: { reason: string; attempts: number }) => {
          console.log('Auto-reconnect stopped:', data);
          this.isConnected = false;
        });

        // Connect
        this.marketStreamer.connect();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Portfolio WebSocket Connection
  connectPortfolioData(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Initialize PortfolioDataStreamer with all updates enabled
        this.portfolioStreamer = new UpstoxClient.PortfolioDataStreamer(
          true,  // orderUpdate
          true,  // positionUpdate
          true,  // holdingUpdate
          true   // gttUpdate
        );

        // Configure auto-reconnect
        this.portfolioStreamer.autoReconnect(true, 10, 5);

        // Event Listeners
        this.portfolioStreamer.on('open', () => {
          console.log('Upstox Portfolio WebSocket Connected');
          resolve();
        });

        this.portfolioStreamer.on('message', (data: Buffer) => {
          try {
            const feed = data.toString('utf-8');
            const portfolioData = JSON.parse(feed) as UpstoxPortfolioData;
            this.handlePortfolioData(portfolioData);
          } catch (error) {
            console.error('Error parsing portfolio data:', error);
          }
        });

        this.portfolioStreamer.on('error', (error: Error) => {
          console.error('Portfolio WebSocket Error:', error);
          reject(error);
        });

        this.portfolioStreamer.on('close', () => {
          console.log('Portfolio WebSocket Disconnected');
        });

        // Connect
        this.portfolioStreamer.connect();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Subscribe to Nifty Options
  async subscribeToNiftyOptions(instrumentKeys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks' = 'full'): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Market data connection not established');
    }

    try {
      await this.marketStreamer.subscribe(instrumentKeys, mode);
      
      // Track subscriptions
      instrumentKeys.forEach(key => this.subscriptions.add(key));
      
      console.log(`Subscribed to ${instrumentKeys.length} instruments in ${mode} mode`);
    } catch (error) {
      console.error('Error subscribing to instruments:', error);
      throw error;
    }
  }

  // Subscribe to specific strikes around ATM
  async subscribeToATMOptions(underlyingPrice: number, expiry: string, strikes: number = 10): Promise<void> {
    const atmStrike = Math.round(underlyingPrice / 50) * 50; // Round to nearest 50
    const instrumentKeys: string[] = [];

    // Generate CE and PE instrument keys for strikes around ATM
    for (let i = -strikes/2; i <= strikes/2; i++) {
      const strike = atmStrike + (i * 50);
      
      // Format: NFO_OPT|NIFTY24JAN18000CE and NFO_OPT|NIFTY24JAN18000PE
      const ceKey = `NFO_OPT|NIFTY${expiry}${strike}CE`;
      const peKey = `NFO_OPT|NIFTY${expiry}${strike}PE`;
      
      instrumentKeys.push(ceKey, peKey);
    }

    // Add underlying Nifty 50
    instrumentKeys.push('NSE_INDEX|Nifty 50');

    await this.subscribeToNiftyOptions(instrumentKeys, 'full');
  }

  // Unsubscribe from instruments
  async unsubscribe(instrumentKeys: string[]): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.marketStreamer.unsubscribe(instrumentKeys);
      
      // Remove from tracked subscriptions
      instrumentKeys.forEach(key => this.subscriptions.delete(key));
      
      console.log(`Unsubscribed from ${instrumentKeys.length} instruments`);
    } catch (error) {
      console.error('Error unsubscribing from instruments:', error);
      throw error;
    }
  }

  // Change subscription mode
  async changeMode(instrumentKeys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks'): Promise<void> {
    if (!this.isConnected) return;

    try {
      await this.marketStreamer.changeMode(instrumentKeys, mode);
      console.log(`Changed mode to ${mode} for ${instrumentKeys.length} instruments`);
    } catch (error) {
      console.error('Error changing subscription mode:', error);
      throw error;
    }
  }



  // Handle incoming market data
  private handleMarketData(data: UpstoxMarketData): void {
    // Transform Upstox data to our format
    const marketData: Partial<LiveMarketData> = {
      instrumentKey: data.instrument_key,
      ltp: data.last_price,
      volume: data.volume,
      oi: data.open_interest,
      netChange: data.net_change,
      percentChange: data.percent_change,
      bidPrice: data.depth?.buy?.[0]?.price,
      askPrice: data.depth?.sell?.[0]?.price,
      bidQuantity: data.depth?.buy?.[0]?.quantity,
      askQuantity: data.depth?.sell?.[0]?.quantity,
      high: data.ohlc?.high,
      low: data.ohlc?.low,
      previousClose: data.ohlc?.close,
      timestamp: new Date(data.timestamp)
    };

    // Emit to store/subscribers
    this.emitMarketData(marketData);
  }

  // Handle portfolio data
  private handlePortfolioData(data: UpstoxPortfolioData): void {
    console.log('Portfolio Update:', data);
    // Handle order updates, position updates etc.
    this.emitPortfolioData(data);
  }

  // Event emission methods (to be connected with Zustand store)
  private emitMarketData(data: Partial<LiveMarketData>): void {
    // This will be connected to Zustand store
    window.dispatchEvent(new CustomEvent('marketData', { detail: data }));
  }

  private emitPortfolioData(data: UpstoxPortfolioData): void {
    window.dispatchEvent(new CustomEvent('portfolioData', { detail: data }));
  }

  // REST API Methods
  async getOptionChain(symbol: string, expiry: string): Promise<Record<string, any>> {
    try {
      const optionsApi = new UpstoxClient.OptionsApi();
      const response = await optionsApi.getPutCallOptionChain(symbol, expiry);
      return response.data;
    } catch (error) {
      console.error('Error fetching option chain:', error);
      throw error;
    }
  }

  async getLTP(instrumentKeys: string[]): Promise<Record<string, { ltp: number; volume: number; last_trade_time: string }>> {
    try {
      const marketQuoteApi = new UpstoxClient.MarketQuoteV3Api();
      const response = await marketQuoteApi.getLtp(instrumentKeys.join(','));
      return response.data;
    } catch (error) {
      console.error('Error fetching LTP:', error);
      throw error;
    }
  }

  async getOptionGreeks(instrumentKeys: string[]): Promise<Record<string, { 
    delta: number; 
    gamma: number; 
    theta: number; 
    vega: number; 
    iv: number 
  }>> {
    try {
      const marketQuoteApi = new UpstoxClient.MarketQuoteV3Api();
      const response = await marketQuoteApi.getMarketQuoteOptionGreek(instrumentKeys.join(','));
      return response.data;
    } catch (error) {
      console.error('Error fetching option Greeks:', error);
      throw error;
    }
  }

  // Historical data
  async getHistoricalData(
    instrumentKey: string, 
    interval: string, 
    fromDate: string, 
    toDate: string
  ): Promise<{
    candles: Array<[string, number, number, number, number, number]>; // [timestamp, open, high, low, close, volume]
    status: string;
  }> {
    try {
      const historyApi = new UpstoxClient.HistoryV3Api();
      const response = await historyApi.getHistoricalCandleData(
        instrumentKey,
        interval,
        toDate,
        fromDate
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  // Disconnect all connections
  disconnect(): void {
    if (this.marketStreamer) {
      this.marketStreamer.disconnect();
    }
    if (this.portfolioStreamer) {
      this.portfolioStreamer.disconnect();
    }
    this.isConnected = false;
    this.subscriptions.clear();
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get activeSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }
}