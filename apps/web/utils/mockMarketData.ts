// Mock market data generator for testing
export interface MockMarketData {
  ltp: number
  change: number
  changePercent: number
  high: number
  low: number
  volume: number
  timestamp: string
}

export interface MockOptionData {
  strike_price: number
  call_options?: {
    ltp: number
    volume: number
    oi: number
    change: number
  }
  put_options?: {
    ltp: number
    volume: number
    oi: number
    change: number
  }
}

class MockMarketDataGenerator {
  private baseNiftyPrice = 24500
  private priceVariation = 0.002 // 0.2% max variation per update
  private currentNiftyPrice = this.baseNiftyPrice
  private subscribers = new Set<(data: MockMarketData) => void>()
  private intervalId: NodeJS.Timeout | null = null
  private isRunning = false

  constructor() {
    this.currentNiftyPrice = this.baseNiftyPrice + (Math.random() - 0.5) * 200
  }

  // Generate realistic Nifty data
  generateNiftyData(): MockMarketData {
    // Random walk with mean reversion
    const change = (Math.random() - 0.5) * this.priceVariation * this.currentNiftyPrice
    const meanReversion = (this.baseNiftyPrice - this.currentNiftyPrice) * 0.001
    
    this.currentNiftyPrice += change + meanReversion
    
    // Ensure reasonable bounds
    this.currentNiftyPrice = Math.max(
      this.baseNiftyPrice * 0.95,
      Math.min(this.baseNiftyPrice * 1.05, this.currentNiftyPrice)
    )

    const dayChange = this.currentNiftyPrice - this.baseNiftyPrice
    const dayChangePercent = (dayChange / this.baseNiftyPrice) * 100

    return {
      ltp: this.currentNiftyPrice,
      change: dayChange,
      changePercent: dayChangePercent,
      high: this.currentNiftyPrice + Math.random() * 50,
      low: this.currentNiftyPrice - Math.random() * 50,
      volume: Math.floor(Math.random() * 1000000) + 500000,
      timestamp: new Date().toISOString()
    }
  }

  // Generate option chain data
  generateOptionChain(expiry: string): MockOptionData[] {
    const atmStrike = Math.round(this.currentNiftyPrice / 50) * 50
    const strikes: MockOptionData[] = []

    // Generate strikes from ATM-500 to ATM+500 in steps of 50
    for (let strike = atmStrike - 500; strike <= atmStrike + 500; strike += 50) {
      const distanceFromATM = Math.abs(strike - this.currentNiftyPrice)
      const timeValue = Math.max(10, 100 - distanceFromATM * 0.1)
      
      // Call options
      const callLTP = strike < this.currentNiftyPrice 
        ? Math.max(1, this.currentNiftyPrice - strike + timeValue + (Math.random() - 0.5) * 20)
        : Math.max(1, timeValue + (Math.random() - 0.5) * 10)

      // Put options  
      const putLTP = strike > this.currentNiftyPrice
        ? Math.max(1, strike - this.currentNiftyPrice + timeValue + (Math.random() - 0.5) * 20)
        : Math.max(1, timeValue + (Math.random() - 0.5) * 10)

      strikes.push({
        strike_price: strike,
        call_options: {
          ltp: callLTP,
          volume: Math.floor(Math.random() * 10000) + 1000,
          oi: Math.floor(Math.random() * 50000) + 5000,
          change: (Math.random() - 0.5) * 10
        },
        put_options: {
          ltp: putLTP,
          volume: Math.floor(Math.random() * 10000) + 1000,
          oi: Math.floor(Math.random() * 50000) + 5000,
          change: (Math.random() - 0.5) * 10
        }
      })
    }

    return strikes
  }

  // Start generating live data
  startLiveData(intervalMs: number = 1000) {
    if (this.isRunning) return

    this.isRunning = true
    this.intervalId = setInterval(() => {
      const data = this.generateNiftyData()
      this.subscribers.forEach(callback => callback(data))
    }, intervalMs)
  }

  // Stop generating live data
  stopLiveData() {
    if (this.intervalId) {
      clearInterval(this.intervalId)
      this.intervalId = null
    }
    this.isRunning = false
  }

  // Subscribe to live data updates
  subscribe(callback: (data: MockMarketData) => void) {
    this.subscribers.add(callback)
    
    // Send initial data
    callback(this.generateNiftyData())
    
    return () => {
      this.subscribers.delete(callback)
    }
  }

  // Get current status
  getStatus() {
    return {
      isRunning: this.isRunning,
      subscriberCount: this.subscribers.size,
      currentPrice: this.currentNiftyPrice,
      basePrice: this.baseNiftyPrice
    }
  }

  // Simulate market events
  simulateMarketEvent(type: 'spike' | 'drop' | 'volatility') {
    switch (type) {
      case 'spike':
        this.currentNiftyPrice += Math.random() * 100 + 50
        break
      case 'drop':
        this.currentNiftyPrice -= Math.random() * 100 + 50
        break
      case 'volatility':
        // Increase variation temporarily
        const originalVariation = this.priceVariation
        this.priceVariation *= 3
        setTimeout(() => {
          this.priceVariation = originalVariation
        }, 10000) // 10 seconds of high volatility
        break
    }
  }

  // Generate historical data
  generateHistoricalData(days: number = 30): Array<{
    date: string
    open: number
    high: number
    low: number
    close: number
    volume: number
  }> {
    const data = []
    let price = this.baseNiftyPrice
    
    for (let i = days; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      
      const open = price
      const change = (Math.random() - 0.5) * 200
      const close = open + change
      const high = Math.max(open, close) + Math.random() * 50
      const low = Math.min(open, close) - Math.random() * 50
      
      data.push({
        date: date.toISOString().split('T')[0]!,
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 2000000) + 1000000
      })
      
      price = close
    }
    
    return data
  }
}

// Export singleton instance
export const mockMarketDataGenerator = new MockMarketDataGenerator()

// Utility functions
export const generateMockExpiryDates = (): string[] => {
  const dates = []
  const now = new Date()
  
  // Generate next 6 weekly expiries (Thursdays)
  for (let i = 0; i < 6; i++) {
    const expiry = new Date(now)
    const daysUntilThursday = (4 - now.getDay() + 7) % 7 || 7 // Next Thursday
    expiry.setDate(now.getDate() + daysUntilThursday + (i * 7))
    dates.push(expiry.toISOString().split('T')[0]!)
  }
  
  return dates
}

export const generateMockMarketStatus = () => {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const currentTime = hour * 60 + minute
  
  // Market hours: 9:15 AM to 3:30 PM (IST)
  const marketOpen = 9 * 60 + 15  // 9:15 AM
  const marketClose = 15 * 60 + 30 // 3:30 PM
  
  const isOpen = currentTime >= marketOpen && currentTime <= marketClose
  
  return {
    isOpen,
    message: isOpen ? 'Market is open' : 'Market is closed',
    nextOpenTime: isOpen ? null : 'Tomorrow 9:15 AM',
    nextCloseTime: isOpen ? 'Today 3:30 PM' : null,
    currentTime: now.toLocaleTimeString()
  }
}
