declare module 'upstox-js-sdk' {
  export interface ApiClient {
    instance: ApiClient
    authentications: {
      OAUTH2: {
        accessToken: string | undefined
      }
    }
  }

  export class MarketDataStreamerV3 {
    connect(): void
    disconnect(): void
    autoReconnect(enable: boolean, interval: number, retries: number): void
    on(event: string, callback: (data: unknown) => void): void
    subscribe(instrumentKeys: string[], mode: string): Promise<void>
    unsubscribe(instrumentKeys: string[]): Promise<void>
    changeMode(instrumentKeys: string[], mode: string): Promise<void>
  }

  export class PortfolioDataStreamer {
    constructor(orderUpdate: boolean, positionUpdate: boolean, holdingUpdate: boolean, gttUpdate: boolean)
    connect(): void
    disconnect(): void
    autoReconnect(enable: boolean, interval: number, retries: number): void
    on(event: string, callback: (data: unknown) => void): void
  }

  export class OptionsApi {
    getPutCallOptionChain(symbol: string, expiry: string): Promise<{ data: unknown }>
  }

  export class MarketQuoteV3Api {
    getLtp(instrumentKeys: string): Promise<{ data: unknown }>
    getMarketQuoteOptionGreek(instrumentKeys: string): Promise<{ data: unknown }>
  }

  export class HistoryV3Api {
    getHistoricalCandleData(
      instrumentKey: string,
      interval: string,
      toDate: string,
      fromDate: string
    ): Promise<{ data: unknown }>
  }

  const UpstoxClient: {
    ApiClient: ApiClient
    MarketDataStreamerV3: typeof MarketDataStreamerV3
    PortfolioDataStreamer: typeof PortfolioDataStreamer
    OptionsApi: typeof OptionsApi
    MarketQuoteV3Api: typeof MarketQuoteV3Api
    HistoryV3Api: typeof HistoryV3Api
  }

  export default UpstoxClient
}
