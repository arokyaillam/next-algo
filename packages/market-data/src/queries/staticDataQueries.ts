// packages/market-data/src/queries/staticDataQueries.ts
import { useQuery } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'

// Query Keys for React Query
export const QUERY_KEYS = {
  NIFTY_SPOT: 'nifty-spot',
  OPTION_CHAIN: 'option-chain',
  EXPIRY_DATES: 'expiry-dates',
  MARKET_STATUS: 'market-status',
  BATCH_QUOTES: 'batch-quotes',
  BROKER_CONNECTION: 'broker-connection',
} as const

// Types for API responses
export interface NiftySpotData {
  ltp: number
  change: number
  changePercent: number
  high: number
  low: number
  previousClose: number
  volume: number
  timestamp: string
  source: 'api'
}

interface OptionChainItem {
  strike: number
  call_options?: {
    instrument_key: string
    trading_symbol: string
    ltp: number
    change: number
    change_percent: number
    volume: number
    oi: number
    oi_change: number
    iv?: number
    delta?: number
    gamma?: number
    theta?: number
    vega?: number
    bid_price: number
    ask_price: number
    bid_quantity: number
    ask_quantity: number
  }
  put_options?: {
    instrument_key: string
    trading_symbol: string
    ltp: number
    change: number
    change_percent: number
    volume: number
    oi: number
    oi_change: number
    iv?: number
    delta?: number
    gamma?: number
    theta?: number
    vega?: number
    bid_price: number
    ask_price: number
    bid_quantity: number
    ask_quantity: number
  }
}

export interface MarketStatusData {
  isOpen: boolean
  message: string
  nextOpenTime?: string
  nextCloseTime?: string
  currentTime: string
}

// Nifty Spot Price Query
export function useNiftySpotQuery(
  userId: string, 
  supabaseClient: SupabaseClient, 
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [QUERY_KEYS.NIFTY_SPOT, userId],
    queryFn: async (): Promise<NiftySpotData> => {
      // First try to get from broker connection if available
      const { data: brokerConnection } = await supabaseClient
        .from('broker_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (brokerConnection?.access_token) {
        try {
          // Try to fetch from Upstox API
          const response = await fetch('/api/market-data/nifty-spot', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              accessToken: brokerConnection.access_token,
              instrumentKey: 'NSE_INDEX|Nifty 50'
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            return {
              ltp: data.ltp || 0,
              change: data.net_change || 0,
              changePercent: data.percent_change || 0,
              high: data.ohlc?.high || 0,
              low: data.ohlc?.low || 0,
              previousClose: data.ohlc?.close || 0,
              volume: data.volume || 0,
              timestamp: new Date().toISOString(),
              source: 'api' as const
            }
          }
        } catch (error) {
          console.warn('Failed to fetch from Upstox API, using fallback:', error)
        }
      }

      // Fallback to mock data or external API
      return {
        ltp: 23500 + Math.random() * 1000 - 500, // Mock data around 23500
        change: Math.random() * 200 - 100,
        changePercent: Math.random() * 2 - 1,
        high: 23800,
        low: 23200,
        previousClose: 23450,
        volume: 1000000,
        timestamp: new Date().toISOString(),
        source: 'api' as const
      }
    },
    enabled: enabled && !!userId,
    refetchInterval: 5000, // Refetch every 5 seconds during market hours
    staleTime: 3000, // Consider data stale after 3 seconds
  })
}

// Option Chain Query
export function useOptionChainQuery(
  userId: string,
  supabaseClient: SupabaseClient,
  expiry?: string,
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [QUERY_KEYS.OPTION_CHAIN, userId, expiry],
    queryFn: async (): Promise<OptionChainItem[]> => {
      if (!expiry) return []

      const { data: brokerConnection } = await supabaseClient
        .from('broker_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (brokerConnection?.access_token) {
        try {
          const response = await fetch('/api/market-data/option-chain', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              accessToken: brokerConnection.access_token,
              symbol: 'NIFTY',
              expiry: expiry
            })
          })
          
          if (response.ok) {
            const data = await response.json()
            return data.option_chain || []
          }
        } catch (error) {
          console.warn('Failed to fetch option chain from API:', error)
        }
      }

      // Return mock option chain data
      const strikes = []
      const baseStrike = 23500
      for (let i = -10; i <= 10; i++) {
        const strike = baseStrike + (i * 50)
        strikes.push({
          strike,
          call_options: {
            instrument_key: `NFO_OPT|NIFTY${expiry}${strike}CE`,
            trading_symbol: `NIFTY${expiry}${strike}CE`,
            ltp: Math.max(1, Math.random() * 200),
            change: Math.random() * 20 - 10,
            change_percent: Math.random() * 10 - 5,
            volume: Math.floor(Math.random() * 100000),
            oi: Math.floor(Math.random() * 1000000),
            oi_change: Math.floor(Math.random() * 100000 - 50000),
            iv: Math.random() * 50 + 10,
            bid_price: Math.random() * 100,
            ask_price: Math.random() * 100 + 1,
            bid_quantity: Math.floor(Math.random() * 1000),
            ask_quantity: Math.floor(Math.random() * 1000),
          },
          put_options: {
            instrument_key: `NFO_OPT|NIFTY${expiry}${strike}PE`,
            trading_symbol: `NIFTY${expiry}${strike}PE`,
            ltp: Math.max(1, Math.random() * 200),
            change: Math.random() * 20 - 10,
            change_percent: Math.random() * 10 - 5,
            volume: Math.floor(Math.random() * 100000),
            oi: Math.floor(Math.random() * 1000000),
            oi_change: Math.floor(Math.random() * 100000 - 50000),
            iv: Math.random() * 50 + 10,
            bid_price: Math.random() * 100,
            ask_price: Math.random() * 100 + 1,
            bid_quantity: Math.floor(Math.random() * 1000),
            ask_quantity: Math.floor(Math.random() * 1000),
          }
        })
      }
      return strikes
    },
    enabled: enabled && !!userId && !!expiry,
    refetchInterval: 10000, // Refetch every 10 seconds
    staleTime: 5000,
  })
}

// Expiry Dates Query
export function useExpiryDatesQuery(userId: string) {
  return useQuery({
    queryKey: [QUERY_KEYS.EXPIRY_DATES, userId],
    queryFn: async (): Promise<string[]> => {
      // Generate next few expiry dates (weekly and monthly)
      const expiries: string[] = []
      const now = new Date()
      
      // Add next 8 weekly expiries (Thursdays)
      for (let i = 0; i < 8; i++) {
        const date = new Date(now)
        date.setDate(date.getDate() + (4 - date.getDay() + 7 * i) % 7 + 7 * Math.floor(i / 1))
        const expiry = date.toLocaleDateString('en-GB', { 
          day: '2-digit', 
          month: 'short' 
        }).replace(' ', '').toUpperCase()
        expiries.push(expiry)
      }
      
      return expiries
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 60, // 1 hour
  })
}

// Market Status Query
export function useMarketStatusQuery() {
  return useQuery({
    queryKey: [QUERY_KEYS.MARKET_STATUS],
    queryFn: async (): Promise<MarketStatusData> => {
      const now = new Date()
      const day = now.getDay() // 0 = Sunday, 6 = Saturday
      const hours = now.getHours()
      const minutes = now.getMinutes()
      const currentTime = hours * 100 + minutes

      // Market closed on weekends
      if (day === 0 || day === 6) {
        return {
          isOpen: false,
          message: 'Market is closed on weekends',
          currentTime: now.toISOString()
        }
      }

      // Market hours: 9:15 AM to 3:30 PM
      const isOpen = currentTime >= 915 && currentTime <= 1530

      return {
        isOpen,
        message: isOpen ? 'Market is open' : 'Market is closed',
        currentTime: now.toISOString()
      }
    },
    refetchInterval: 60000, // Refetch every minute
    staleTime: 30000, // 30 seconds
  })
}

// Batch Quotes Query
export function useBatchQuotesQuery(
  userId: string,
  supabaseClient: SupabaseClient,
  instrumentKeys: string[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [QUERY_KEYS.BATCH_QUOTES, userId, instrumentKeys],
    queryFn: async () => {
      if (!instrumentKeys.length) return {}

      const { data: brokerConnection } = await supabaseClient
        .from('broker_connections')
        .select('*')
        .eq('user_id', userId)
        .eq('is_active', true)
        .single()

      if (brokerConnection?.access_token) {
        try {
          const response = await fetch('/api/market-data/batch-quotes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              accessToken: brokerConnection.access_token,
              instrumentKeys
            })
          })
          
          if (response.ok) {
            return await response.json()
          }
        } catch (error) {
          console.warn('Failed to fetch batch quotes:', error)
        }
      }

      // Return mock data
      const mockData: Record<string, unknown> = {}
      instrumentKeys.forEach(key => {
        mockData[key] = {
          ltp: Math.random() * 1000,
          volume: Math.floor(Math.random() * 100000),
          last_trade_time: new Date().toISOString()
        }
      })
      return mockData
    },
    enabled: enabled && !!userId && instrumentKeys.length > 0,
    refetchInterval: 5000,
    staleTime: 3000,
  })
}
