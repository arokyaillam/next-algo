// packages/market-data/src/stores/liveDataStore.ts
import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
import type { LiveMarketData, BrokerConnection } from '../types'
import { UpstoxMarketDataService } from '../services/upstoxService'

// Connection status type
export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting'

interface LiveDataState {
  // Connection state
  connectionStatus: ConnectionStatus
  isConnected: boolean
  error: string | null
  upstoxService: UpstoxMarketDataService | null
  brokerConnection: BrokerConnection | null
  
  // Live market data
  liveData: Map<string, LiveMarketData>
  lastUpdateTime: string | null
  
  // Subscription management
  subscriptions: Set<string>
  subscriptionMode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks'
}

interface LiveDataActions {
  // Connection management
  initialize: (userId: string, supabaseClient: any) => Promise<void>
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: (supabaseClient: any) => Promise<void>
  
  // Data access
  getMarketData: (instrumentKey: string) => LiveMarketData | null
  getNiftyData: () => LiveMarketData | null
  getAllData: () => Map<string, LiveMarketData>
  
  // Subscription management
  subscribe: (instrumentKeys: string[], mode?: 'ltpc' | 'full' | 'full_d30' | 'option_greeks') => Promise<void>
  unsubscribe: (instrumentKeys: string[]) => Promise<void>
  changeMode: (instrumentKeys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks') => Promise<void>
  
  // Data updates
  updateLiveData: (data: Partial<LiveMarketData>) => void
  clearData: () => void
  clearError: () => void
  
  // Utility
  isSubscribed: (instrumentKey: string) => boolean
  getSubscriptionCount: () => number
}

const initialState: LiveDataState = {
  connectionStatus: 'disconnected',
  isConnected: false,
  error: null,
  upstoxService: null,
  brokerConnection: null,
  liveData: new Map(),
  lastUpdateTime: null,
  subscriptions: new Set(),
  subscriptionMode: 'full'
}

export const useLiveDataStore = create<LiveDataState & LiveDataActions>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Initialize connection with user's broker credentials
    initialize: async (userId: string, supabaseClient: any) => {
      set({ connectionStatus: 'connecting', error: null })

      try {
        // Fetch active broker connection
        const { data: brokerConnection, error: fetchError } = await supabaseClient
          .from('broker_connections')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .single()

        if (fetchError || !brokerConnection) {
          throw new Error('No active broker connection found')
        }

        // Validate token expiry
        if (brokerConnection.token_expires_at) {
          const expiryTime = new Date(brokerConnection.token_expires_at)
          if (expiryTime <= new Date()) {
            throw new Error('Access token has expired')
          }
        }

        // Create Upstox service
        const service = new UpstoxMarketDataService(brokerConnection)
        
        set({ 
          upstoxService: service,
          brokerConnection,
          connectionStatus: 'connecting'
        })

        // Connect to WebSocket
        await get().connect()

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initialize connection'
        set({ 
          connectionStatus: 'error',
          error: errorMessage,
          upstoxService: null,
          brokerConnection: null
        })
        throw error
      }
    },

    // Connect to live data stream
    connect: async () => {
      const { upstoxService } = get()
      if (!upstoxService) {
        throw new Error('Upstox service not initialized')
      }

      set({ connectionStatus: 'connecting', error: null })

      try {
        // Connect to market data stream
        await upstoxService.connectMarketData()
        
        // Connect to portfolio stream
        await upstoxService.connectPortfolioData()

        set({ 
          connectionStatus: 'connected',
          isConnected: true,
          error: null
        })

        // Set up event listeners for real-time data
        const handleMarketData = (event: Event) => {
          const customEvent = event as CustomEvent<Partial<LiveMarketData>>
          get().updateLiveData(customEvent.detail)
        }

        window.addEventListener('marketData', handleMarketData as EventListener)
        
        // Store handler for cleanup
        ;(window as any)._liveDataHandler = handleMarketData

        console.log('✅ Connected to live market data stream')

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Connection failed'
        set({ 
          connectionStatus: 'error',
          isConnected: false,
          error: errorMessage
        })
        throw error
      }
    },

    // Disconnect from live data stream
    disconnect: () => {
      const { upstoxService } = get()
      
      if (upstoxService) {
        upstoxService.disconnect()
      }

      // Remove event listeners
      const handler = (window as any)._liveDataHandler
      if (handler) {
        window.removeEventListener('marketData', handler as EventListener)
        delete (window as any)._liveDataHandler
      }

      set({
        connectionStatus: 'disconnected',
        isConnected: false,
        upstoxService: null,
        brokerConnection: null,
        liveData: new Map(),
        subscriptions: new Set(),
        error: null
      })

      console.log('🔌 Disconnected from live market data stream')
    },

    // Reconnect to live data stream
    reconnect: async (supabaseClient: any) => {
      const { brokerConnection } = get()
      
      if (!brokerConnection) {
        throw new Error('No broker connection available for reconnection')
      }

      set({ connectionStatus: 'reconnecting', error: null })

      try {
        // Re-initialize with existing connection
        await get().initialize(brokerConnection.userId, supabaseClient)
        
        // Re-subscribe to previous subscriptions
        const { subscriptions, subscriptionMode } = get()
        if (subscriptions.size > 0) {
          await get().subscribe(Array.from(subscriptions), subscriptionMode)
        }

        console.log('✅ Reconnected to live market data stream')

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Reconnection failed'
        set({ 
          connectionStatus: 'error',
          error: errorMessage
        })
        throw error
      }
    },

    // Get market data for specific instrument
    getMarketData: (instrumentKey: string) => {
      const { liveData } = get()
      return liveData.get(instrumentKey) || null
    },

    // Get Nifty 50 data specifically
    getNiftyData: () => {
      return get().getMarketData('NSE_INDEX|Nifty 50')
    },

    // Get all live data
    getAllData: () => {
      return new Map(get().liveData)
    },

    // Subscribe to instruments
    subscribe: async (instrumentKeys: string[], mode = 'full' as const) => {
      const { upstoxService, isConnected } = get()
      
      if (!upstoxService || !isConnected) {
        throw new Error('Not connected to market data stream')
      }

      try {
        await upstoxService.subscribeToNiftyOptions(instrumentKeys, mode)
        
        set(state => ({
          subscriptions: new Set([...state.subscriptions, ...instrumentKeys]),
          subscriptionMode: mode
        }))

        console.log(`📡 Subscribed to ${instrumentKeys.length} instruments in ${mode} mode`)

      } catch (error) {
        console.error('Subscription failed:', error)
        throw error
      }
    },

    // Unsubscribe from instruments
    unsubscribe: async (instrumentKeys: string[]) => {
      const { upstoxService, isConnected } = get()
      
      if (!upstoxService || !isConnected) {
        return // Silently ignore if not connected
      }

      try {
        await upstoxService.unsubscribe(instrumentKeys)
        
        set(state => {
          const newSubscriptions = new Set(state.subscriptions)
          instrumentKeys.forEach(key => newSubscriptions.delete(key))
          
          const newLiveData = new Map(state.liveData)
          instrumentKeys.forEach(key => newLiveData.delete(key))
          
          return {
            subscriptions: newSubscriptions,
            liveData: newLiveData
          }
        })

        console.log(`📡 Unsubscribed from ${instrumentKeys.length} instruments`)

      } catch (error) {
        console.error('Unsubscription failed:', error)
        throw error
      }
    },

    // Change subscription mode
    changeMode: async (instrumentKeys: string[], mode: 'ltpc' | 'full' | 'full_d30' | 'option_greeks') => {
      const { upstoxService, isConnected } = get()
      
      if (!upstoxService || !isConnected) {
        throw new Error('Not connected to market data stream')
      }

      try {
        await upstoxService.changeMode(instrumentKeys, mode)
        set({ subscriptionMode: mode })
        
        console.log(`📡 Changed mode to ${mode} for ${instrumentKeys.length} instruments`)

      } catch (error) {
        console.error('Mode change failed:', error)
        throw error
      }
    },

    // Update live market data
    updateLiveData: (data: Partial<LiveMarketData>) => {
      if (!data.instrumentKey) return

      set(state => {
        const newLiveData = new Map(state.liveData)
        const existing = newLiveData.get(data.instrumentKey!) || {} as LiveMarketData
        
        newLiveData.set(data.instrumentKey!, {
          ...existing,
          ...data,
          timestamp: data.timestamp || new Date()
        } as LiveMarketData)

        return {
          liveData: newLiveData,
          lastUpdateTime: new Date().toISOString()
        }
      })
    },

    // Clear all live data
    clearData: () => {
      set({
        liveData: new Map(),
        lastUpdateTime: null
      })
    },

    // Clear error state
    clearError: () => {
      set({ error: null })
    },

    // Check if instrument is subscribed
    isSubscribed: (instrumentKey: string) => {
      const { subscriptions } = get()
      return subscriptions.has(instrumentKey)
    },

    // Get subscription count
    getSubscriptionCount: () => {
      const { subscriptions } = get()
      return subscriptions.size
    }
  }))
)

// Selectors for common use cases
export const useConnectionStatus = () => useLiveDataStore(state => ({
  status: state.connectionStatus,
  isConnected: state.isConnected,
  error: state.error
}))

export const useNiftyLiveData = () => useLiveDataStore(state => 
  state.getNiftyData()
)

export const useLiveDataMetrics = () => useLiveDataStore(state => ({
  dataCount: state.liveData.size,
  subscriptionCount: state.subscriptions.size,
  lastUpdateTime: state.lastUpdateTime,
  connectionStatus: state.connectionStatus
}))
