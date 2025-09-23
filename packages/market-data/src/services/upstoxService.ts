// packages/market-data/src/services/upstoxService.ts

// @ts-ignore: No type definitions available
import UpstoxClient from 'upstox-js-sdk';
import type { BrokerConnection, LiveMarketData } from '../types';

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

interface UpstoxPortfolioStreamer {
  connect(): void;
  disconnect(): void;
  autoReconnect(enable: boolean, interval: number, retries: number): void;
  on(event: string, callback: (data: any) => void): void;
}

export class UpstoxMarketDataService {
  private client!: UpstoxApiClient;
  private marketStreamer!: UpstoxStreamer;
  private portfolioStreamer!: UpstoxPortfolioStreamer;
  private isConnected = false;
  private subscriptions = new Set<string>();

  constructor(private brokerConnection: BrokerConnection) {
    this.initializeClient();
  }

  private initializeClient(): void {
    const defaultClient = UpstoxClient.ApiClient.instance;
    const OAUTH2 = defaultClient.authentications['OAUTH2'];

    try {
      OAUTH2.accessToken = this.getAccessToken();
      this.client = defaultClient;
      console.log('🔑 Upstox client initialized with access token');
    } catch (error) {
      console.error('❌ Failed to initialize Upstox client:', error);
      throw error;
    }
  }

  // Market Data Connection (Browser-compatible using REST API polling)
  connectMarketData(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For browser compatibility, we'll use REST API polling instead of WebSocket
        // The Upstox SDK WebSocket streamers use Node.js 'ws' library which doesn't work in browsers

        console.log('🌐 Browser environment detected - using REST API polling for market data');

        // Test connection with a simple API call
        this.testConnection()
          .then(() => {
            this.isConnected = true;
            console.log('✅ Upstox Market Data Connection established (REST API mode)');
            resolve();
          })
          .catch((error) => {
            console.error('❌ Upstox connection test failed:', error);
            this.isConnected = false;
            reject(error);
          });

      } catch (error) {
        reject(error);
      }
    });
  }

  // Get decrypted access token
  private getAccessToken(): string {
    // Handle both direct accessToken and encrypted access_token_encrypted
    if (this.brokerConnection.accessToken) {
      return this.brokerConnection.accessToken;
    }

    // Handle encrypted token from database
    if ((this.brokerConnection as any).access_token_encrypted) {
      try {
        return atob((this.brokerConnection as any).access_token_encrypted);
      } catch (error) {
        throw new Error('Failed to decrypt access token');
      }
    }

    throw new Error('No access token available');
  }

  // Test connection using REST API
  private async testConnection(): Promise<void> {
    try {
      const accessToken = this.getAccessToken();

      console.log('🔑 Testing connection with access token:', accessToken.substring(0, 10) + '...');

      // Test with a simple market data call
      const response = await fetch(`https://api.upstox.com/v2/market-quote/ltp?instrument_key=NSE_INDEX|Nifty 50`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ API Error Response:', response.status, errorText);
        throw new Error(`API test failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Upstox API test successful:', data);
    } catch (error) {
      console.error('❌ Upstox API test failed:', error);
      throw error;
    }
  }

  // Portfolio Data Connection (Browser-compatible using REST API)
  connectPortfolioData(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // For browser compatibility, we'll use REST API calls instead of WebSocket
        console.log('🌐 Browser environment detected - portfolio data will use REST API calls');

        // Portfolio data doesn't need persistent connection for testing
        // We'll fetch it on-demand using REST API calls
        resolve();

      } catch (error) {
        reject(error);
      }
    });
  }

  // Subscribe to Nifty Options (Browser-compatible using REST API polling)
  async subscribeToNiftyOptions(instrumentKeys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks' = 'full'): Promise<void> {
    if (!this.isConnected) {
      throw new Error('Market data connection not established');
    }

    try {
      // Debug: Check what we received
      console.log('🔍 subscribeToNiftyOptions called with:', {
        instrumentKeys,
        type: typeof instrumentKeys,
        isArray: Array.isArray(instrumentKeys),
        length: instrumentKeys?.length
      });

      // Ensure instrumentKeys is an array
      if (!Array.isArray(instrumentKeys)) {
        throw new Error(`Expected instrumentKeys to be an array, got ${typeof instrumentKeys}`);
      }

      // Track subscriptions for REST API polling
      instrumentKeys.forEach(key => this.subscriptions.add(key));

      console.log(`📊 Subscribed to ${instrumentKeys.length} instruments in ${mode} mode (REST API polling)`);

      // Start polling for these instruments
      this.startPolling(instrumentKeys, mode);

    } catch (error) {
      console.error('Error subscribing to instruments:', error);
      throw error;
    }
  }

  // Start polling for market data (browser-compatible alternative to WebSocket)
  private pollingInterval: NodeJS.Timeout | null = null;
  private pollingInstruments: string[] = [];

  private startPolling(instrumentKeys: string[], mode: string): void {
    // Debug: Check what we received
    console.log('🔍 startPolling called with:', {
      instrumentKeys,
      type: typeof instrumentKeys,
      isArray: Array.isArray(instrumentKeys),
      length: instrumentKeys?.length
    });

    // Ensure instrumentKeys is an array
    if (!Array.isArray(instrumentKeys)) {
      console.error('❌ startPolling: instrumentKeys is not an array:', instrumentKeys);
      return;
    }

    // Store instruments for polling
    this.pollingInstruments = [...new Set([...this.pollingInstruments, ...instrumentKeys])];

    // Clear existing polling if any
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // Start polling every 2 seconds (to avoid rate limiting)
    this.pollingInterval = setInterval(async () => {
      try {
        await this.pollMarketData();
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, 2000);

    console.log(`🔄 Started polling for ${this.pollingInstruments.length} instruments`);
  }

  // Poll market data using REST API
  private async pollMarketData(): Promise<void> {
    if (this.pollingInstruments.length === 0) return;

    try {
      const accessToken = this.getAccessToken();

      // Upstox API supports multiple instruments in a single call
      const instrumentKeys = this.pollingInstruments.join(',');

      const response = await fetch(`https://api.upstox.com/v2/market-quote/ltp?instrument_key=${encodeURIComponent(instrumentKeys)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Polling Error Response:', response.status, errorText);
        throw new Error(`Polling failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Process the data for each instrument
      if (data.data) {
        Object.entries(data.data).forEach(([instrumentKey, marketData]: [string, any]) => {
          // Normalize instrument key: Upstox returns "NSE_INDEX:Nifty 50" but we use "NSE_INDEX|Nifty 50"
          const normalizedKey = instrumentKey.replace(':', '|');

          this.handleMarketData({
            instrument_key: normalizedKey,
            last_price: marketData.last_price,
            volume: marketData.volume || 0,
            net_change: marketData.net_change || 0,
            percent_change: marketData.percent_change || 0,
            timestamp: new Date().toISOString(),
            ohlc: marketData.ohlc
          });
        });
      }

    } catch (error) {
      console.error('Market data polling error:', error);

      // If we get 401, the token might be expired
      if (error instanceof Error && error.message.includes('401')) {
        console.warn('🔑 Access token might be expired, marking connection as inactive');
        this.isConnected = false;
      }
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
      // Remove from tracked subscriptions
      instrumentKeys.forEach(key => {
        this.subscriptions.delete(key);
        const index = this.pollingInstruments.indexOf(key);
        if (index > -1) {
          this.pollingInstruments.splice(index, 1);
        }
      });

      // If no more instruments to poll, stop polling
      if (this.pollingInstruments.length === 0 && this.pollingInterval) {
        clearInterval(this.pollingInterval);
        this.pollingInterval = null;
      }

      console.log(`📊 Unsubscribed from ${instrumentKeys.length} instruments`);
    } catch (error) {
      console.error('Error unsubscribing from instruments:', error);
      throw error;
    }
  }

  // Change subscription mode (for REST API polling, this just logs the change)
  async changeMode(instrumentKeys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks'): Promise<void> {
    if (!this.isConnected) return;

    try {
      // For REST API mode, we just log the mode change
      // The actual data fetched depends on the API endpoint used
      console.log(`📊 Changed mode to ${mode} for ${instrumentKeys.length} instruments (REST API mode)`);
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
      return response.data as Record<string, any>;
    } catch (error) {
      console.error('Error fetching option chain:', error);
      throw error;
    }
  }

  async getLTP(instrumentKeys: string[]): Promise<Record<string, { ltp: number; volume: number; last_trade_time: string }>> {
    try {
      const marketQuoteApi = new UpstoxClient.MarketQuoteV3Api();
      const response = await marketQuoteApi.getLtp(instrumentKeys.join(','));
      return response.data as Record<string, { ltp: number; volume: number; last_trade_time: string; }>;
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
      return response.data as Record<string, { delta: number; gamma: number; theta: number; vega: number; iv: number; }>;
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
      return response.data as { candles: [string, number, number, number, number, number][]; status: string; };
    } catch (error) {
      console.error('Error fetching historical data:', error);
      throw error;
    }
  }

  // Disconnect all connections
  disconnect(): void {
    // Stop polling
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }

    // Clear state
    this.isConnected = false;
    this.subscriptions.clear();
    this.pollingInstruments = [];

    console.log('📊 Upstox connections disconnected (REST API mode)');
  }

  // Getters
  get connected(): boolean {
    return this.isConnected;
  }

  get activeSubscriptions(): string[] {
    return Array.from(this.subscriptions);
  }
}

// Export alias for backward compatibility
export { UpstoxMarketDataService as UpstoxService }