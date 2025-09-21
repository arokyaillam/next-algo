// packages/market-data/src/hooks/useMarketData.ts
import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useMarketStore } from '../stores/marketStore';
import type { OptionChainData, LiveMarketData } from '../types';

// Query Keys
export const QUERY_KEYS = {
  OPTION_CHAIN: 'optionChain',
  OPTION_GREEKS: 'optionGreeks',
  LTP: 'ltp',
  HISTORICAL_DATA: 'historicalData',
  NIFTY_OPTIONS: 'niftyOptions',
  BROKER_CONNECTION: 'brokerConnection'
} as const;

// Hook for fetching Option Chain
export const useOptionChain = (symbol: string = 'NIFTY', expiry?: string) => {
  const upstoxService = useMarketStore(state => state.upstoxService);

  return useQuery({
    queryKey: [QUERY_KEYS.OPTION_CHAIN, symbol, expiry],
    queryFn: async () => {
      if (!upstoxService) throw new Error('Upstox service not initialized');
      if (!expiry) throw new Error('Expiry date required');
      
      return await upstoxService.getOptionChain(symbol, expiry);
    },
    enabled: !!upstoxService && !!expiry,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  });
};

// Hook for fetching Option Greeks
export const useOptionGreeks = (instrumentKeys: string[]) => {
  const upstoxService = useMarketStore(state => state.upstoxService);

  return useQuery({
    queryKey: [QUERY_KEYS.OPTION_GREEKS, instrumentKeys],
    queryFn: async () => {
      if (!upstoxService) throw new Error('Upstox service not initialized');
      if (instrumentKeys.length === 0) return {};
      
      return await upstoxService.getOptionGreeks(instrumentKeys);
    },
    enabled: !!upstoxService && instrumentKeys.length > 0,
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchInterval: 15 * 1000, // 15 seconds
  });
};

// Hook for fetching LTP (Last Traded Price)
export const useLTP = (instrumentKeys: string[]) => {
  const upstoxService = useMarketStore(state => state.upstoxService);

  return useQuery({
    queryKey: [QUERY_KEYS.LTP, instrumentKeys],
    queryFn: async () => {
      if (!upstoxService) throw new Error('Upstox service not initialized');
      if (instrumentKeys.length === 0) return {};
      
      return await upstoxService.getLTP(instrumentKeys);
    },
    enabled: !!upstoxService && instrumentKeys.length > 0,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 5 * 1000, // 5 seconds for LTP
  });
};

// Hook for fetching Historical Data
export const useHistoricalData = (
  instrumentKey: string,
  interval: string,
  fromDate: string,
  toDate: string
) => {
  const upstoxService = useMarketStore(state => state.upstoxService);

  return useQuery({
    queryKey: [QUERY_KEYS.HISTORICAL_DATA, instrumentKey, interval, fromDate, toDate],
    queryFn: async () => {
      if (!upstoxService) throw new Error('Upstox service not initialized');
      
      return await upstoxService.getHistoricalData(instrumentKey, interval, fromDate, toDate);
    },
    enabled: !!upstoxService && !!instrumentKey && !!interval && !!fromDate && !!toDate,
    staleTime: 10 * 60 * 1000, // 10 minutes (historical data doesn't change)
  });
};

// Hook for Nifty Options data around ATM
export const useNiftyATMOptions = (strikes: number = 10) => {
  const { niftyPrice, selectedExpiry, upstoxService } = useMarketStore(state => ({
    niftyPrice: state.niftyPrice,
    selectedExpiry: state.selectedExpiry,
    upstoxService: state.upstoxService
  }));

  const calculateATMStrike = (price: number) => Math.round(price / 50) * 50;
  const atmStrike = niftyPrice ? calculateATMStrike(niftyPrice) : 0;

  // Generate instrument keys for strikes around ATM
  const instrumentKeys = React.useMemo(() => {
    if (!atmStrike || !selectedExpiry) return [];
    
    const keys: string[] = [];
    for (let i = -strikes/2; i <= strikes/2; i++) {
      const strike = atmStrike + (i * 50);
      keys.push(
        `NFO_OPT|NIFTY${selectedExpiry}${strike}CE`,
        `NFO_OPT|NIFTY${selectedExpiry}${strike}PE`
      );
    }
    return keys;
  }, [atmStrike, selectedExpiry, strikes]);

  return useQuery({
    queryKey: [QUERY_KEYS.NIFTY_OPTIONS, atmStrike, selectedExpiry, strikes],
    queryFn: async () => {
      if (!upstoxService) throw new Error('Upstox service not initialized');
      
      const ltpData = await upstoxService.getLTP(instrumentKeys);
      const greeksData = await upstoxService.getOptionGreeks(instrumentKeys);
      
      return {
        ltp: ltpData,
        greeks: greeksData,
        atmStrike,
        strikes: instrumentKeys
      };
    },
    enabled: !!upstoxService && instrumentKeys.length > 0,
    staleTime: 1 * 60 * 1000, // 1 minute
    refetchInterval: 10 * 1000, // 10 seconds
  });
};

// Mutation for connecting to market data
export const useConnectMarketData = () => {
  const { connect, setConnection } = useMarketStore(state => ({
    connect: state.connect,
    setConnection: state.setConnection
  }));
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (brokerConnection: any) => {
      setConnection(brokerConnection);
      await connect();
    },
    onSuccess: () => {
      // Invalidate all queries to refetch with new connection
      queryClient.invalidateQueries();
    },
    onError: (error) => {
      console.error('Failed to connect:', error);
    }
  });
};

// Mutation for subscribing to instruments
export const useSubscribeInstruments = () => {
  const { upstoxService, subscribeToSpecificStrikes } = useMarketStore(state => ({
    upstoxService: state.upstoxService,
    subscribeToSpecificStrikes: state.subscribeToSpecificStrikes
  }));

  return useMutation({
    mutationFn: async (strikes: number[]) => {
      if (!upstoxService) throw new Error('Not connected to market data');
      await subscribeToSpecificStrikes(strikes);
    },
    onError: (error) => {
      console.error('Subscription failed:', error);
    }
  });
};

// Custom hook combining real-time and REST data
export const useNiftyOptionsData = (selectedStrikes: number[]) => {
  const { 
    marketData, 
    selectedExpiry, 
    niftyPrice,
    isConnected 
  } = useMarketStore(state => ({
    marketData: state.marketData,
    selectedExpiry: state.selectedExpiry,
    niftyPrice: state.niftyPrice,
    isConnected: state.isConnected
  }));

  // Get REST API data
  const instrumentKeys = React.useMemo(() => {
    if (!selectedExpiry || selectedStrikes.length === 0) return [];
    
    return selectedStrikes.flatMap(strike => [
      `NFO_OPT|NIFTY${selectedExpiry}${strike}CE`,
      `NFO_OPT|NIFTY${selectedExpiry}${strike}PE`
    ]);
  }, [selectedExpiry, selectedStrikes]);

  const { data: ltpData, isLoading: isLtpLoading } = useLTP(instrumentKeys);
  const { data: greeksData, isLoading: isGreeksLoading } = useOptionGreeks(instrumentKeys);

  // Combine real-time WebSocket data with REST API data
  const combinedData = React.useMemo(() => {
    if (!selectedExpiry || selectedStrikes.length === 0) return [];
    
    return selectedStrikes.map(strike => {
      const ceKey = `NFO_OPT|NIFTY${selectedExpiry}${strike}CE`;
      const peKey = `NFO_OPT|NIFTY${selectedExpiry}${strike}PE`;
      
      // Get real-time data from WebSocket (if available)
      const ceRealTime = marketData[ceKey] || {};
      const peRealTime = marketData[peKey] || {};
      
      // Get REST API data
      const ceLTP = ltpData?.[ceKey] || {};
      const peLTP = ltpData?.[peKey] || {};
      const ceGreeks = greeksData?.[ceKey] || {};
      const peGreeks = greeksData?.[peKey] || {};
      
      return {
        strike,
        ce: {
          ...ceRealTime,
          ...ceLTP,
          ...ceGreeks,
          instrumentKey: ceKey
        },
        pe: {
          ...peRealTime,
          ...peLTP,
          ...peGreeks,
          instrumentKey: peKey
        }
      };
    });
  }, [selectedStrikes, selectedExpiry, marketData, ltpData, greeksData]);

  return {
    data: combinedData,
    niftyPrice,
    isConnected,
    isLoading: isLtpLoading || isGreeksLoading || !selectedExpiry
  };
};

// Hook for managing WebSocket subscriptions
export const useWebSocketSubscription = () => {
  const {
    subscribeToNifty,
    subscribeToATMOptions,
    subscribeToSpecificStrikes,
    unsubscribeFromAll,
    activeSubscriptions,
    isConnected
  } = useMarketStore(state => ({
    subscribeToNifty: state.subscribeToNifty,
    subscribeToATMOptions: state.subscribeToATMOptions,
    subscribeToSpecificStrikes: state.subscribeToSpecificStrikes,
    unsubscribeFromAll: state.unsubscribeFromAll,
    activeSubscriptions: state.activeSubscriptions,
    isConnected: state.isConnected
  }));

  return {
    subscribeToNifty,
    subscribeToATMOptions,
    subscribeToSpecificStrikes,
    unsubscribeFromAll,
    activeSubscriptions,
    isConnected
  };
};

// Hook for Nifty 50 real-time data
export const useNiftyRealTime = () => {
  const { niftyPrice, niftyChange, marketData, isConnected } = useMarketStore(state => ({
    niftyPrice: state.niftyPrice,
    niftyChange: state.niftyChange,
    marketData: state.marketData,
    isConnected: state.isConnected
  }));

  const niftyData = marketData['NSE_INDEX|Nifty 50'];

  return {
    price: niftyPrice || niftyData?.ltp || 0,
    change: niftyChange || niftyData?.netChange || 0,
    changePercent: niftyData?.percentChange || 0,
    high: niftyData?.high || 0,
    low: niftyData?.low || 0,
    volume: niftyData?.volume || 0,
    lastUpdated: niftyData?.timestamp,
    isConnected
  };
};

// Define option data type
interface OptionDataPoint {
  ltp: number;
  change: number;
  volume: number;
  oi: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;
}

// Hook for option chain calculations
export const useOptionChainCalculations = (expiry: string) => {
  const { niftyPrice, marketData } = useMarketStore(state => ({
    niftyPrice: state.niftyPrice,
    marketData: state.marketData
  }));

  return React.useMemo(() => {
    if (!niftyPrice || !expiry) return null;

    const atmStrike = Math.round(niftyPrice / 50) * 50;
    const strikes: Array<{
      strike: number;
      ce: OptionDataPoint | null;
      pe: OptionDataPoint | null;
      isATM: boolean;
      isITM: { ce: boolean; pe: boolean };
      isOTM: { ce: boolean; pe: boolean };
    }> = [];

    // Generate strikes from ATM-500 to ATM+500 with 50 point intervals
    for (let strike = atmStrike - 500; strike <= atmStrike + 500; strike += 50) {
      const ceKey = `NFO_OPT|NIFTY${expiry}${strike}CE`;
      const peKey = `NFO_OPT|NIFTY${expiry}${strike}PE`;
      
      const ceData = marketData[ceKey];
      const peData = marketData[peKey];

      strikes.push({
        strike,
        ce: ceData ? {
          ltp: ceData.ltp || 0,
          change: ceData.netChange || 0,
          volume: ceData.volume || 0,
          oi: ceData.oi || 0,
          iv: ceData.iv || 0, // Implied Volatility
          delta: ceData.delta || 0,
          gamma: ceData.gamma || 0,
          theta: ceData.theta || 0,
          vega: ceData.vega || 0
        } : null,
        pe: peData ? {
          ltp: peData.ltp || 0,
          change: peData.netChange || 0,
          volume: peData.volume || 0,
          oi: peData.oi || 0,
          iv: peData.iv || 0,
          delta: peData.delta || 0,
          gamma: peData.gamma || 0,
          theta: peData.theta || 0,
          vega: peData.vega || 0
        } : null,
        isATM: strike === atmStrike,
        isITM: {
          ce: strike < niftyPrice,
          pe: strike > niftyPrice
        },
        isOTM: {
          ce: strike > niftyPrice,
          pe: strike < niftyPrice
        }
      });
    }

    // Calculate total CE/PE volumes and OI
    const totalCEVolume = strikes.reduce((sum, s) => sum + (s.ce?.volume || 0), 0);
    const totalPEVolume = strikes.reduce((sum, s) => sum + (s.pe?.volume || 0), 0);
    const totalCEOI = strikes.reduce((sum, s) => sum + (s.ce?.oi || 0), 0);
    const totalPEOI = strikes.reduce((sum, s) => sum + (s.pe?.oi || 0), 0);

    // Calculate PCR (Put-Call Ratio)
    const pcrByVolume = totalCEVolume > 0 ? totalPEVolume / totalCEVolume : 0;
    const pcrByOI = totalCEOI > 0 ? totalPEOI / totalCEOI : 0;

    return {
      atmStrike,
      strikes,
      totals: {
        ceVolume: totalCEVolume,
        peVolume: totalPEVolume,
        ceOI: totalCEOI,
        peOI: totalPEOI
      },
      pcr: {
        byVolume: pcrByVolume,
        byOI: pcrByOI
      },
      niftyPrice
    };
  }, [niftyPrice, marketData, expiry]);
};

// Hook for portfolio data
export const usePortfolioData = () => {
  const queryClient = useQueryClient();

  // Listen for portfolio updates from WebSocket
  React.useEffect(() => {
    const handlePortfolioUpdate = (event: any) => {
      const portfolioData = event.detail;
      
      // Update relevant queries based on portfolio updates
      if (portfolioData.type === 'order') {
        queryClient.invalidateQueries({ queryKey: ['orders'] });
      } else if (portfolioData.type === 'position') {
        queryClient.invalidateQueries({ queryKey: ['positions'] });
      }
    };

    window.addEventListener('portfolioData', handlePortfolioUpdate);
    
    return () => {
      window.removeEventListener('portfolioData', handlePortfolioUpdate);
    };
  }, [queryClient]);

  return {
    // Portfolio-related query functions can be added here
  };
};

// Export main hook for easy usage
export const useMarketDataHooks = () => {
  return {
    useOptionChain,
    useOptionGreeks,
    useLTP,
    useHistoricalData,
    useNiftyATMOptions,
    useConnectMarketData,
    useSubscribeInstruments,
    useNiftyOptionsData,
    useWebSocketSubscription,
    useNiftyRealTime,
    useOptionChainCalculations,
    usePortfolioData
  };
};