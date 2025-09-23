// packages/market-data/src/utils/index.ts
import type { LiveMarketData, OptionData } from '../types';

// Option Chain Calculations
export class OptionChainCalculator {
  
  // Calculate ATM strike based on underlying price
  static getATMStrike(underlyingPrice: number, tickSize: number = 50): number {
    return Math.round(underlyingPrice / tickSize) * tickSize;
  }

  // Generate strike prices around ATM
  static generateStrikes(atmStrike: number, range: number = 500, interval: number = 50): number[] {
    const strikes: number[] = [];
    
    for (let strike = atmStrike - range; strike <= atmStrike + range; strike += interval) {
      if (strike > 0) { // Ensure positive strikes only
        strikes.push(strike);
      }
    }
    
    return strikes.sort((a, b) => a - b);
  }

  // Calculate intrinsic value
  static calculateIntrinsicValue(
    underlyingPrice: number, 
    strikePrice: number, 
    optionType: 'CE' | 'PE'
  ): number {
    if (optionType === 'CE') {
      return Math.max(0, underlyingPrice - strikePrice);
    } else {
      return Math.max(0, strikePrice - underlyingPrice);
    }
  }

  // Calculate time value
  static calculateTimeValue(optionPrice: number, intrinsicValue: number): number {
    return Math.max(0, optionPrice - intrinsicValue);
  }

  // Determine if option is ITM, ATM, or OTM
  static getMoneyness(
    underlyingPrice: number, 
    strikePrice: number, 
    optionType: 'CE' | 'PE'
  ): 'ITM' | 'ATM' | 'OTM' {
    const diff = Math.abs(underlyingPrice - strikePrice);
    
    if (diff <= 25) return 'ATM'; // Within 25 points considered ATM
    
    if (optionType === 'CE') {
      return underlyingPrice > strikePrice ? 'ITM' : 'OTM';
    } else {
      return underlyingPrice < strikePrice ? 'ITM' : 'OTM';
    }
  }

  // Calculate Put-Call Ratio
  static calculatePCR(ceData: OptionData[], peData: OptionData[]): {
    byVolume: number;
    byOI: number;
  } {
    const totalCEVolume = ceData.reduce((sum, opt) => sum + (opt.volume || 0), 0);
    const totalPEVolume = peData.reduce((sum, opt) => sum + (opt.volume || 0), 0);
    const totalCEOI = ceData.reduce((sum, opt) => sum + (opt.oi || 0), 0);
    const totalPEOI = peData.reduce((sum, opt) => sum + (opt.oi || 0), 0);

    return {
      byVolume: totalCEVolume > 0 ? totalPEVolume / totalCEVolume : 0,
      byOI: totalCEOI > 0 ? totalPEOI / totalCEOI : 0
    };
  }
}

// Market Data Formatters
export class MarketDataFormatter {
  
  // Format price with appropriate decimal places
  static formatPrice(price: number, decimals: number = 2): string {
    return price.toFixed(decimals);
  }

  // Format volume with K/L suffixes
  static formatVolume(volume: number): string {
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(2)}Cr`;
    } else if (volume >= 100000) {
      return `${(volume / 100000).toFixed(2)}L`;
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)}K`;
    }
    return volume.toString();
  }

  // Format change with + or - prefix
  static formatChange(change: number, showSign: boolean = true): string {
    const formatted = Math.abs(change).toFixed(2);
    if (!showSign) return formatted;
    return change >= 0 ? `+${formatted}` : `-${formatted}`;
  }

  // Format percentage change
  static formatPercentChange(change: number): string {
    return `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
  }

  // Format Open Interest
  static formatOI(oi: number): string {
    if (oi >= 10000000) {
      return `${(oi / 10000000).toFixed(2)}Cr`;
    } else if (oi >= 100000) {
      return `${(oi / 100000).toFixed(2)}L`;
    } else if (oi >= 1000) {
      return `${(oi / 1000).toFixed(2)}K`;
    }
    return oi.toString();
  }

  // Format Greeks
  static formatGreeks(value: number, decimals: number = 4): string {
    return value.toFixed(decimals);
  }
}

// Instrument Key Utilities
export class InstrumentUtils {
  
  // Generate Nifty option instrument key
  static generateNiftyOptionKey(
    expiry: string, 
    strike: number, 
    optionType: 'CE' | 'PE'
  ): string {
    return `NFO_OPT|NIFTY${expiry}${strike}${optionType}`;
  }

  // Parse instrument key to extract details
  static parseInstrumentKey(instrumentKey: string): {
    exchange: string;
    segment: string;
    symbol: string;
    expiry?: string;
    strike?: number;
    optionType?: 'CE' | 'PE';
  } | null {
    const parts = instrumentKey.split('|');
    if (parts.length !== 2) return null;

    const [exchangeSegment, symbolDetails] = parts;
    if (!exchangeSegment || !symbolDetails) return null;
    const [exchange, segment] = exchangeSegment.split('_');
    if (!exchange || !segment) return null;

    if (segment === 'OPT') {
      // Option instrument
      const match = symbolDetails.match(/^(\w+)(\d{2}[A-Z]{3})(\d+)(CE|PE)$/);
      if (match) {
        const [, symbol, expiry, strikeStr, optionType] = match;
        return {
          exchange: exchange as string,
          segment: segment as string,
          symbol: symbol as string,
          expiry: expiry as string,
          strike: strikeStr ? parseInt(strikeStr) : undefined,
          optionType: optionType as 'CE' | 'PE'
        };
      }
    } else if (segment === 'INDEX' || segment === 'EQ') {
      // Index or Equity instrument
      return {
        exchange: exchange as string,
        segment: segment as string,
        symbol: symbolDetails as string
      };
    }

    return null;
  }

  // Generate multiple instrument keys for a range of strikes
  static generateStrikeRange(
    expiry: string,
    atmStrike: number,
    range: number = 500,
    interval: number = 50
  ): string[] {
    const instrumentKeys: string[] = [];
    
    for (let strike = atmStrike - range; strike <= atmStrike + range; strike += interval) {
      if (strike > 0) {
        instrumentKeys.push(
          this.generateNiftyOptionKey(expiry, strike, 'CE'),
          this.generateNiftyOptionKey(expiry, strike, 'PE')
        );
      }
    }
    
    return instrumentKeys;
  }
}

// Date and Time Utilities
export class DateTimeUtils {
  
  // Check if market is open
  static isMarketOpen(): boolean {
    const now = new Date();
    const day = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Market closed on weekends
    if (day === 0 || day === 6) return false;
    
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const currentTime = hours * 100 + minutes;
    
    // Market hours: 9:15 AM to 3:30 PM
    return currentTime >= 915 && currentTime <= 1530;
  }

  // Format expiry date from API format
  static formatExpiryDate(expiry: string): string {
    // Convert from "24JAN" to "2024-01-25" format if needed
    // This depends on the actual API response format
    return expiry;
  }

  // Get next trading day
  static getNextTradingDay(date: Date = new Date()): Date {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    
    // Skip weekends
    if (nextDay.getDay() === 0) nextDay.setDate(nextDay.getDate() + 1); // Skip Sunday
    if (nextDay.getDay() === 6) nextDay.setDate(nextDay.getDate() + 2); // Skip Saturday
    
    return nextDay;
  }

  // Time until market close
  static getTimeUntilMarketClose(): number {
    const now = new Date();
    const marketClose = new Date(now);
    marketClose.setHours(15, 30, 0, 0); // 3:30 PM
    
    if (now > marketClose) {
      // Market already closed, return time until next day's close
      marketClose.setDate(marketClose.getDate() + 1);
    }
    
    return marketClose.getTime() - now.getTime();
  }
}

// Data Validation Utilities
export class ValidationUtils {
  
  // Validate instrument key format
  static isValidInstrumentKey(key: string): boolean {
    const parsed = InstrumentUtils.parseInstrumentKey(key);
    return parsed !== null;
  }

  // Validate market data completeness
  static validateMarketData(data: Partial<LiveMarketData>): boolean {
    return !!(data.instrumentKey && data.ltp && data.timestamp);
  }

  // Validate option data
  static validateOptionData(data: Partial<OptionData>): boolean {
    return !!(data.instrumentKey && data.tradingSymbol && data.ltp !== undefined);
  }
}

// Performance Monitoring
export class PerformanceMonitor {
  private static metrics = new Map<string, number>();
  
  // Start timing an operation
  static startTimer(operation: string): void {
    this.metrics.set(`${operation}_start`, performance.now());
  }
  
  // End timing and log result
  static endTimer(operation: string): number {
    const startTime = this.metrics.get(`${operation}_start`);
    if (!startTime) return 0;
    
    const duration = performance.now() - startTime;
    console.log(`${operation} took ${duration.toFixed(2)}ms`);
    
    this.metrics.delete(`${operation}_start`);
    return duration;
  }
  
  // Get all metrics
  static getMetrics(): Record<string, number> {
    return Object.fromEntries(this.metrics);
  }
}



// Helper function to calculate option chain summary
export const calculateOptionChainSummary = (
  marketData: Record<string, LiveMarketData>,
  expiry: string,
  atmStrike: number
) => {
  const strikes = OptionChainCalculator.generateStrikes(atmStrike, 500, 50);
  const summary = {
    totalCEVolume: 0,
    totalPEVolume: 0,
    totalCEOI: 0,
    totalPEOI: 0,
    maxCEOI: { strike: 0, oi: 0 },
    maxPEOI: { strike: 0, oi: 0 },
    maxCEVolume: { strike: 0, volume: 0 },
    maxPEVolume: { strike: 0, volume: 0 }
  };

  strikes.forEach(strike => {
    const ceKey = InstrumentUtils.generateNiftyOptionKey(expiry, strike, 'CE');
    const peKey = InstrumentUtils.generateNiftyOptionKey(expiry, strike, 'PE');
    
    const ceData = marketData[ceKey];
    const peData = marketData[peKey];

    if (ceData) {
      summary.totalCEVolume += ceData.volume || 0;
      summary.totalCEOI += ceData.oi || 0;
      
      if ((ceData.oi || 0) > summary.maxCEOI.oi) {
        summary.maxCEOI = { strike, oi: ceData.oi || 0 };
      }
      
      if ((ceData.volume || 0) > summary.maxCEVolume.volume) {
        summary.maxCEVolume = { strike, volume: ceData.volume || 0 };
      }
    }

    if (peData) {
      summary.totalPEVolume += peData.volume || 0;
      summary.totalPEOI += peData.oi || 0;
      
      if ((peData.oi || 0) > summary.maxPEOI.oi) {
        summary.maxPEOI = { strike, oi: peData.oi || 0 };
      }
      
      if ((peData.volume || 0) > summary.maxPEVolume.volume) {
        summary.maxPEVolume = { strike, volume: peData.volume || 0 };
      }
    }
  });

  return summary;
};