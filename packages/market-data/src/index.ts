// packages/market-data/src/index.ts
// Main hooks for easy consumption
export {
  useMarketData,
  useOptionChainData,
  useTradingSession,
  useMarketDataMetrics
} from './hooks/useMarketData'

// Individual query hooks for advanced usage
export {
  useNiftySpotQuery,
  useOptionChainQuery,
  useExpiryDatesQuery,
  useMarketStatusQuery,
  useBatchQuotesQuery,
  QUERY_KEYS
} from './queries/staticDataQueries'

// Store for direct access if needed
export {
  useLiveDataStore
} from './stores/liveDataStore'

// Services for custom implementations
export {
  UpstoxService
} from './services/upstoxService'

// TypeScript types
export type {
  MarketData,
  OptionChainData,
  HistoricalData,
  MarketStatus,
  BrokerConnection,
  ConnectionStatus
} from './types'

// Ready-to-use components will be added later
// export { MarketDataProvider } from './components/MarketDataProvider'