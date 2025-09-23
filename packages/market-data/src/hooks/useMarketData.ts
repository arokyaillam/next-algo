// packages/market-data/src/hooks/useMarketData.ts
import { useEffect, useMemo } from 'react'
import { useLiveDataStore } from '../stores/liveDataStore'
import { 
  useNiftySpotQuery, 
  useOptionChainQuery, 
  useExpiryDatesQuery, 
  useMarketStatusQuery 
} from '../queries/staticDataQueries'

// Main Market Data Hook - Combines Live + Static Data
export function useMarketData(userId: string, supabaseClient: any) {
  const {
    connectionStatus,
    isConnected,
    error,
    initialize,
    disconnect,
    getNiftyData,
    getMarketData,
    reconnect,
    clearError
  } = useLiveDataStore()

  // Static data queries (React Query)
  const niftySpotQuery = useNiftySpotQuery(userId, supabaseClient, !isConnected)
  const marketStatusQuery = useMarketStatusQuery()

  // Auto-initialize when user is available
  useEffect(() => {
    if (userId && connectionStatus === 'disconnected') {
      initialize(userId, supabaseClient)
    }
    
    return () => {
      if (connectionStatus === 'connected') {
        disconnect()
      }
    }
  }, [userId])

  // Get best available Nifty data (live first, then fallback)
  const niftyData = useMemo(() => {
    const liveData = getNiftyData()
    if (liveData) {
      return {
        ...liveData,
        source: 'live' as const,
        isLive: true
      }
    }

    if (niftySpotQuery.data) {
      return {
        ...niftySpotQuery.data,
        source: 'api' as const,
        isLive: false
      }
    }

    return null
  }, [getNiftyData, niftySpotQuery.data])

  return {
    // Connection Status
    connectionStatus,
    isConnected,
    error: error || niftySpotQuery.error,
    
    // Market Data
    niftyData,
    marketStatus: marketStatusQuery.data,
    
    // Data Source Info
    hasLiveData: !!getNiftyData(),
    dataSource: niftyData?.source || 'none',
    
    // Actions
    getMarketData,
    reconnect: () => reconnect(supabaseClient),
    clearError,
    
    // Query Actions
    refetchNifty: niftySpotQuery.refetch,
    refetchMarketStatus: marketStatusQuery.refetch,
    
    // Loading States
    isLoading: connectionStatus === 'connecting' || niftySpotQuery.isLoading
  }
}

// Option Chain Hook - Static Structure + Live Prices
export function useOptionChainData(
  userId: string,
  supabaseClient: any,
  selectedExpiry?: string
) {
  const { getMarketData } = useLiveDataStore()

  // Static data queries
  const expiryDatesQuery = useExpiryDatesQuery(userId)
  const optionChainQuery = useOptionChainQuery(
    userId, 
    supabaseClient, 
    selectedExpiry, 
    !!selectedExpiry
  )

  // Extract instrument keys from option chain
  const instrumentKeys = useMemo(() => {
    if (!optionChainQuery.data) return []
    
    const keys: string[] = []
    optionChainQuery.data.forEach((chain) => {
      if (chain.call_options?.instrument_key) {
        keys.push(chain.call_options.instrument_key)
      }
      if (chain.put_options?.instrument_key) {
        keys.push(chain.put_options.instrument_key)
      }
    })
    
    return keys
  }, [optionChainQuery.data])

  // Merge static option chain with live data
  const enrichedOptionChain = useMemo(() => {
    if (!optionChainQuery.data) return []

    return optionChainQuery.data.map((chain) => {
      const callLiveData = chain.call_options?.instrument_key 
        ? getMarketData(chain.call_options.instrument_key)
        : null

      const putLiveData = chain.put_options?.instrument_key 
        ? getMarketData(chain.put_options.instrument_key)
        : null

      return {
        ...chain,
        call_options: chain.call_options ? {
          ...chain.call_options,
          live_ltp: callLiveData?.ltp,
          current_ltp: callLiveData?.ltp || chain.call_options.ltp,
          isLive: !!callLiveData
        } : null,
        put_options: chain.put_options ? {
          ...chain.put_options,
          live_ltp: putLiveData?.ltp,
          current_ltp: putLiveData?.ltp || chain.put_options.ltp,
          isLive: !!putLiveData
        } : null
      }
    })
  }, [optionChainQuery.data, getMarketData])

  // Calculate how much live data we have
  const liveDataPercentage = useMemo(() => {
    if (instrumentKeys.length === 0) return 0
    
    const liveCount = instrumentKeys.filter(key => !!getMarketData(key)).length
    return Math.round((liveCount / instrumentKeys.length) * 100)
  }, [instrumentKeys, getMarketData])

  return {
    // Data
    expiries: expiryDatesQuery.data || [],
    optionChain: enrichedOptionChain,
    
    // Status
    isLoading: expiryDatesQuery.isLoading || optionChainQuery.isLoading,
    error: expiryDatesQuery.error || optionChainQuery.error,
    
    // Live Data Info
    hasLiveData: liveDataPercentage > 0,
    liveDataPercentage,
    instrumentKeysCount: instrumentKeys.length,
    
    // Actions
    refetch: () => {
      expiryDatesQuery.refetch()
      optionChainQuery.refetch()
    }
  }
}

// Trading Session Status Hook
export function useTradingSession(userId: string, supabaseClient: any) {
  const marketData = useMarketData(userId, supabaseClient)
  
  const sessionStatus = useMemo(() => {
    if (!userId) return 'not-authenticated'
    if (!marketData.marketStatus?.isOpen) return 'market-closed'
    if (marketData.error) return 'error'
    if (!marketData.isConnected && !marketData.niftyData) return 'no-data'
    if (marketData.hasLiveData) return 'live'
    if (marketData.niftyData) return 'api-only'
    return 'initializing'
  }, [userId, marketData])

  const sessionMessage = useMemo(() => {
    switch (sessionStatus) {
      case 'not-authenticated':
        return 'Please log in to access market data'
      case 'market-closed':
        return `Market is closed. ${marketData.marketStatus?.message || ''}`
      case 'error':
        return marketData.error || 'Connection error occurred'
      case 'no-data':
        return 'No market data available. Check your broker connection.'
      case 'live':
        return 'Live market data active'
      case 'api-only':
        return 'Using API data (live connection unavailable)'
      case 'initializing':
        return 'Connecting to market data...'
      default:
        return 'Checking session status...'
    }
  }, [sessionStatus, marketData])

  const canTrade = useMemo(() => {
    return marketData.marketStatus?.isOpen && 
           ['live', 'api-only'].includes(sessionStatus) &&
           !!marketData.niftyData
  }, [marketData.marketStatus?.isOpen, sessionStatus, marketData.niftyData])

  return {
    status: sessionStatus,
    message: sessionMessage,
    canTrade,
    canViewData: ['live', 'api-only', 'error'].includes(sessionStatus),
    isMarketOpen: marketData.marketStatus?.isOpen || false,
    hasConnection: marketData.isConnected,
    hasData: !!marketData.niftyData,
    dataSource: marketData.dataSource
  }
}

// Performance Metrics Hook
export function useMarketDataMetrics() {
  const { 
    connectionStatus, 
    isConnected, 
    liveData, 
    lastUpdateTime 
  } = useLiveDataStore()

  return useMemo(() => {
    const now = Date.now()
    const lastUpdate = lastUpdateTime ? new Date(lastUpdateTime).getTime() : 0
    const dataAge = lastUpdate ? now - lastUpdate : null
    const liveDataCount = liveData.size

    return {
      connectionStatus,
      isConnected,
      liveDataCount,
      dataAge: dataAge ? Math.floor(dataAge / 1000) : null, // seconds
      dataFreshness: dataAge && dataAge < 60000 ? 'fresh' : dataAge && dataAge < 300000 ? 'stale' : 'old',
      lastUpdateTime,
      isHealthy: isConnected && liveDataCount > 0 && (dataAge === null || dataAge < 120000) // 2 minutes
    }
  }, [connectionStatus, isConnected, liveData, lastUpdateTime])
}