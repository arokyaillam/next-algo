// Broker Connection Types
export interface BrokerConnection {
  id: string;
  userId: string;
  brokerName: 'upstox' | 'zerodha' | 'angel';
  brokerUserId: string;
  apiKey?: string;
  accessToken?: string;
  refreshToken?: string;
  tokenExpiresAt?: Date;
  isActive: boolean;
  isVerified: boolean;
  lastVerifiedAt?: Date;
}

// Market Data Types
export interface LiveMarketData {
  instrumentKey: string;
  ltp: number; // Last Traded Price
  ltq: number; // Last Traded Quantity
  totalBuyQuantity: number;
  totalSellQuantity: number;
  volume: number;
  averagePrice: number;
  oi: number; // Open Interest
  netChange: number;
  percentChange: number;
  bidPrice: number;
  bidQuantity: number;
  askPrice: number;
  askQuantity: number;
  high: number;
  low: number;
  previousClose: number;
  timestamp: Date;
  // Option Greeks (optional)
  iv?: number;
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
}

// Nifty Option Specific Types
export interface NiftyOptionContract {
  symbol: string;
  instrumentKey: string;
  exchangeToken: string;
  tradingSymbol: string;
  name: string;
  expiry: Date;
  strike: number;
  optionType: 'CE' | 'PE';
  lotSize: number;
  tickSize: number;
  exchange: 'NSE' | 'NFO';
}

export interface OptionChainData {
  underlyingSymbol: string;
  underlyingLtp: number;
  expiry: Date;
  strikes: OptionStrikeData[];
  timestamp: Date;
}

export interface OptionStrikeData {
  strike: number;
  ce?: OptionData;
  pe?: OptionData;
}

export interface OptionData {
  instrumentKey: string;
  tradingSymbol: string;
  ltp: number;
  change: number;
  changePercent: number;
  volume: number;
  oi: number;
  oiChange: number;
  iv: number; // Implied Volatility
  delta?: number;
  gamma?: number;
  theta?: number;
  vega?: number;
  bidPrice: number;
  askPrice: number;
  bidQuantity: number;
  askQuantity: number;
}

// WebSocket Configuration
export interface UpstoxWebSocketConfig {
  accessToken: string;
  apiVersion: 'v3' | 'v2';
  reconnectAttempts?: number;
  reconnectInterval?: number;
}

// Subscription Types
export interface MarketDataSubscription {
  instrumentKey: string;
  mode: 'LTP' | 'QUOTE' | 'FULL';
}

export interface WebSocketMessage {
  type: 'market_data' | 'order_update' | 'error';
  data: any;
  timestamp: Date;
}