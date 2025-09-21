// packages/market-data/src/stores/marketStore.ts
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  LiveMarketData, 
  OptionChainData, 
  BrokerConnection, 
  NiftyOptionContract 
} from '../types';
import { UpstoxMarketDataService } from '../services/upstoxService';

interface MarketState {
  // Connection state
  isConnected: boolean;
  connectionError: string | null;
  brokerConnection: BrokerConnection | null;
  upstoxService: UpstoxMarketDataService | null;

  // Market data
  marketData: Record<string, LiveMarketData>;
  niftyPrice: number;
  niftyChange: number;

  // Option chain data
  optionChain: OptionChainData | null;
  selectedExpiry: string;
  availableExpiries: string[];
  
  // ATM and strikes
  atmStrike: number;
  selectedStrikes: number[];
  
  // Subscriptions
  activeSubscriptions: string[];
  
  // UI state
  isLoading: boolean;
  lastUpdated: Date | null;
}

interface MarketActions {
  // Connection actions
  setConnection: (connection: BrokerConnection) => void;
  connect: () => Promise<void>;
  disconnect: () => void;
  
  // Subscription actions
  subscribeToNifty: () => Promise<void>;
  subscribeToATMOptions: (strikes?: number) => Promise<void>;
  subscribeToSpecificStrikes: (strikes: number[]) => Promise<void>;
  unsubscribeFromAll: () => Promise<void>;
  
  // Data actions
  updateMarketData: (data: Partial<LiveMarketData>) => void;
  updateOptionChain: (data: OptionChainData) => void;
  setSelectedExpiry: (expiry: string) => void;
  
  // Utility actions
  calculateATMStrike: (price: number) => number;
  getOptionData: (strike: number, type: 'CE' | 'PE') => LiveMarketData | null;
  
  // Reset
  reset: () => void;
}

const initialState: MarketState = {
  isConnected: false,
  connectionError: null,
  brokerConnection: null,
  upstoxService: null,
  marketData: {},
  niftyPrice: 0,
  niftyChange: 0,
  optionChain: null,
  selectedExpiry: '',
  availableExpiries: [],
  atmStrike: 0,
  selectedStrikes: [],
  activeSubscriptions: [],
  isLoading: false,
  lastUpdated: null,
};

export const useMarketStore = create<MarketState & MarketActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Connection actions
    setConnection: (connection: BrokerConnection) => {
      const service = new UpstoxMarketDataService(connection);
      set({ 
        brokerConnection: connection,
        upstoxService: service,
        connectionError: null 
      });
    },

    connect: async () => {
      const { upstoxService } = get();
      if (!upstoxService) {
        set({ connectionError: 'No broker connection available' });
        return;
      }

      set({ isLoading: true, connectionError: null });

      try {
        // Connect to market data stream
        await upstoxService.connectMarketData();
        
        // Connect to portfolio stream
        await upstoxService.connectPortfolioData();

        set({ 
          isConnected: true, 
          isLoading: false,
          connectionError: null 
        });

        // Set up event listeners for real-time data
        // Store handler reference for removal
        const marketDataHandler = (event: Event) => {
          const customEvent = event as CustomEvent<Partial<LiveMarketData>>;
          get().updateMarketData(customEvent.detail);
        };
        // @ts-ignore: Custom event type
        window.addEventListener('marketData', marketDataHandler as EventListener);
        // Save handler for later removal
        (window as any)._marketDataHandler = marketDataHandler;

        console.log('Successfully connected to Upstox streams');

      } catch (error) {
        set({ 
          isConnected: false,
          isLoading: false,
          connectionError: error instanceof Error ? error.message : 'Connection failed'
        });
        throw error;
      }
    },

    disconnect: () => {
      const { upstoxService } = get();
      if (upstoxService) {
        upstoxService.disconnect();
      }
      
      // Remove event listeners
      // Remove event listener using stored handler
      const handler = (window as any)._marketDataHandler;
      if (handler) {
        // @ts-ignore: Custom event type
        window.removeEventListener('marketData', handler as EventListener);
        delete (window as any)._marketDataHandler;
      }
      
      set({ 
        isConnected: false,
        upstoxService: null,
        activeSubscriptions: [],
        marketData: {},
        connectionError: null
      });
    },

    // Subscription actions
    subscribeToNifty: async () => {
      const { upstoxService } = get();
      if (!upstoxService) return;

      try {
        await upstoxService.subscribeToNiftyOptions(['NSE_INDEX|Nifty 50'], 'ltpc');
        set(state => ({
          activeSubscriptions: [...state.activeSubscriptions, 'NSE_INDEX|Nifty 50']
        }));
      } catch (error) {
        console.error('Error subscribing to Nifty:', error);
      }
    },

    subscribeToATMOptions: async (strikes = 10) => {
      const { upstoxService, niftyPrice } = get();
      if (!upstoxService || !niftyPrice) return;

      try {
        // Get current expiry (this should come from API)
        const expiry = get().selectedExpiry || '24JAN'; // Default expiry
        
        await upstoxService.subscribeToATMOptions(niftyPrice, expiry, strikes);
        
        // Update ATM strike
        const atmStrike = get().calculateATMStrike(niftyPrice);
        set({ atmStrike });

      } catch (error) {
        console.error('Error subscribing to ATM options:', error);
      }
    },

    subscribeToSpecificStrikes: async (strikes: number[]) => {
      const { upstoxService, selectedExpiry } = get();
      if (!upstoxService || !selectedExpiry) return;

      try {
        const instrumentKeys: string[] = [];
        
        strikes.forEach(strike => {
          instrumentKeys.push(
            `NFO_OPT|NIFTY${selectedExpiry}${strike}CE`,
            `NFO_OPT|NIFTY${selectedExpiry}${strike}PE`
          );
        });

        await upstoxService.subscribeToNiftyOptions(instrumentKeys, 'full');
        set({ selectedStrikes: strikes });

      } catch (error) {
        console.error('Error subscribing to specific strikes:', error);
      }
    },

    unsubscribeFromAll: async () => {
      const { upstoxService, activeSubscriptions } = get();
      if (!upstoxService) return;

      try {
        await upstoxService.unsubscribe(activeSubscriptions);
        set({ 
          activeSubscriptions: [],
          selectedStrikes: [],
          marketData: {}
        });
      } catch (error) {
        console.error('Error unsubscribing:', error);
      }
    },

    // Data actions
    updateMarketData: (data: Partial<LiveMarketData>) => {
      if (!data.instrumentKey) return;

      set(state => {
        const updatedMarketData = {
          ...state.marketData,
          [data.instrumentKey!]: {
            ...state.marketData[data.instrumentKey!],
            ...data
          } as LiveMarketData
        };

        // Update Nifty price if it's Nifty data
        let niftyPrice = state.niftyPrice;
        let niftyChange = state.niftyChange;
        
        if (data.instrumentKey === 'NSE_INDEX|Nifty 50' && data.ltp) {
          niftyPrice = data.ltp;
          niftyChange = data.netChange || 0;
        }

        return {
          marketData: updatedMarketData,
          niftyPrice,
          niftyChange,
          lastUpdated: new Date()
        };
      });
    },

    updateOptionChain: (data: OptionChainData) => {
      set({ optionChain: data });
    },

    setSelectedExpiry: (expiry: string) => {
      set({ selectedExpiry: expiry });
    },

    // Utility actions
    calculateATMStrike: (price: number) => {
      return Math.round(price / 50) * 50;
    },

    getOptionData: (strike: number, type: 'CE' | 'PE') => {
      const { marketData, selectedExpiry } = get();
      const instrumentKey = `NFO_OPT|NIFTY${selectedExpiry}${strike}${type}`;
      return marketData[instrumentKey] || null;
    },

    // Reset
    reset: () => {
      get().disconnect();
      set(initialState);
    }
  }))
);

// Selectors for computed values
export const useNiftyData = () => useMarketStore(state => ({
  price: state.niftyPrice,
  change: state.niftyChange,
  isConnected: state.isConnected
}));

export const useATMOptions = () => useMarketStore(state => {
  if (!state.atmStrike || !state.selectedExpiry) return { ce: null, pe: null };
  
  const ce = state.getOptionData(state.atmStrike, 'CE');
  const pe = state.getOptionData(state.atmStrike, 'PE');
  
  return { ce, pe, atmStrike: state.atmStrike };
});

export const useOptionChainData = () => useMarketStore(state => ({
  optionChain: state.optionChain,
  selectedExpiry: state.selectedExpiry,
  availableExpiries: state.availableExpiries,
  atmStrike: state.atmStrike
}));

export const useConnectionStatus = () => useMarketStore(state => ({
  isConnected: state.isConnected,
  isLoading: state.isLoading,
  error: state.connectionError,
  activeSubscriptions: state.activeSubscriptions
}));