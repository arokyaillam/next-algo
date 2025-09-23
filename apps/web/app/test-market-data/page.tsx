'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/utils/supabase/client'
import { useBrokerConnection } from '@/hooks/useBrokerConnection'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Separator } from "@workspace/ui/components/separator"
import { RefreshCw, Activity, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle, Clock } from "lucide-react"
// import { MarketDataDebugger } from '@/components/MarketDataDebugger'
import { mockMarketDataGenerator, generateMockExpiryDates, generateMockMarketStatus } from '@/utils/mockMarketData'

export default function TestMarketDataPage() {
  const { user } = useAuth()
  const supabaseClient = createClient()
  const { connections, loading: brokerLoading, testBrokerConnection } = useBrokerConnection()

  const [selectedExpiry, setSelectedExpiry] = useState<string>()
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'error'>('disconnected')
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dataSource, setDataSource] = useState<'mock' | 'real'>('mock')

  // Market data state
  const [niftyData, setNiftyData] = useState<any>(null)
  const [optionChain, setOptionChain] = useState<any[]>([])
  const [marketStatus, setMarketStatus] = useState<any>(null)
  const [expiryDates, setExpiryDates] = useState<string[]>([])
  const [realDataStore, setRealDataStore] = useState<any>(null)

  // Get active broker connection
  const activeBrokerConnection = connections.find(conn => conn.is_active && conn.is_verified)

  // Initialize data based on available connections
  useEffect(() => {
    setExpiryDates(generateMockExpiryDates())
    setMarketStatus(generateMockMarketStatus())
    setSelectedExpiry(generateMockExpiryDates()[0])

    // Generate initial Nifty data
    setNiftyData(mockMarketDataGenerator.generateNiftyData())

    // Check if we have a real broker connection
    if (activeBrokerConnection) {
      setDataSource('real')
    } else {
      setDataSource('mock')
    }
  }, [activeBrokerConnection])

  // Test connection function
  const testConnection = async () => {
    if (!user?.id) return

    setIsTestingConnection(true)
    setConnectionStatus('connecting')
    setError(null)

    try {
      if (activeBrokerConnection && dataSource === 'real') {
        // Test real broker connection
        console.log('Testing real broker connection:', activeBrokerConnection.broker_name)

        try {
          console.log('🔍 Testing broker connection:', {
            id: activeBrokerConnection.id,
            broker_name: activeBrokerConnection.broker_name,
            is_active: activeBrokerConnection.is_active,
            is_verified: activeBrokerConnection.is_verified,
            has_access_token: !!activeBrokerConnection.access_token_encrypted,
            token_expires_at: activeBrokerConnection.token_expires_at
          });

          const isRealConnectionWorking = await testBrokerConnection(activeBrokerConnection.id)

          if (isRealConnectionWorking) {
            // Initialize real market data store
            const { useLiveDataStore } = await import('@workspace/market-data')
            const store = useLiveDataStore.getState()

            await store.initialize(user.id, supabaseClient)

            // Subscribe to Nifty data
            await store.subscribe(['NSE_INDEX|Nifty 50'], 'full')

            setRealDataStore(store)
            setConnectionStatus('connected')
            setIsConnected(true)

            console.log('✅ Real broker connection established (REST API polling mode)')
          } else {
            throw new Error('Broker connection test failed - API returned false')
          }
        } catch (brokerError) {
          console.warn('Real broker connection failed:', brokerError)
          throw new Error(`Broker API Error: ${brokerError instanceof Error ? brokerError.message : 'Unknown error'}`)
        }
      } else {
        // Fall back to mock data
        console.log('Using mock data (no active broker connection)')

        // Simulate connection delay
        await new Promise(resolve => setTimeout(resolve, 2000))

        // Start mock data generation
        const unsubscribe = mockMarketDataGenerator.subscribe((data) => {
          setNiftyData(data)
        })

        mockMarketDataGenerator.startLiveData(1000) // Update every second

        setConnectionStatus('connected')
        setIsConnected(true)

        // Store unsubscribe function for cleanup
        ;(window as any).mockDataUnsubscribe = unsubscribe

        console.log('✅ Mock data connection established')
      }

    } catch (err) {
      console.error('Connection test failed:', err)

      // Fall back to mock data if real connection fails
      if (dataSource === 'real') {
        console.log('Real broker connection failed, falling back to mock data...')
        setDataSource('mock')
        setError(`Real broker connection failed: ${err instanceof Error ? err.message : 'Unknown error'}. Using mock data instead.`)

        // Start mock data after a brief delay
        setTimeout(async () => {
          try {
            setConnectionStatus('connecting')
            setError(null)

            // Start mock data generation
            const unsubscribe = mockMarketDataGenerator.subscribe((data) => {
              setNiftyData(data)
            })

            mockMarketDataGenerator.startLiveData(1000)

            setConnectionStatus('connected')
            setIsConnected(true)

            // Store unsubscribe function for cleanup
            ;(window as any).mockDataUnsubscribe = unsubscribe

            console.log('✅ Mock data connection established as fallback')
          } catch (mockErr) {
            console.error('Mock data fallback failed:', mockErr)
            setError('Both real and mock data connections failed')
            setConnectionStatus('error')
          } finally {
            setIsTestingConnection(false)
          }
        }, 1000)
        return
      } else {
        setError(`Failed to connect to mock data: ${err instanceof Error ? err.message : 'Unknown error'}`)
        setConnectionStatus('error')
      }
    } finally {
      if (dataSource !== 'real' || connectionStatus !== 'connecting') {
        setIsTestingConnection(false)
      }
    }
  }

  const disconnect = () => {
    if (dataSource === 'real' && realDataStore) {
      // Disconnect real data store
      realDataStore.disconnect()
      setRealDataStore(null)
    } else {
      // Disconnect mock data
      mockMarketDataGenerator.stopLiveData()
      if ((window as any).mockDataUnsubscribe) {
        ;(window as any).mockDataUnsubscribe()
      }
    }
    setConnectionStatus('disconnected')
    setIsConnected(false)
  }

  const clearError = () => {
    setError(null)
  }

  const getNiftyData = () => {
    if (dataSource === 'real' && realDataStore) {
      // Get real Nifty data
      const liveData = realDataStore.liveData.get('NSE_INDEX|Nifty 50')
      if (liveData) {
        setNiftyData({
          ltp: liveData.ltp,
          change: liveData.change,
          changePercent: liveData.changePercent,
          high: liveData.high,
          low: liveData.low,
          volume: liveData.volume,
          timestamp: liveData.timestamp
        })
      }
    } else {
      // Get mock data
      const data = mockMarketDataGenerator.generateNiftyData()
      setNiftyData(data)
    }
  }

  // Generate option chain when expiry changes
  useEffect(() => {
    if (selectedExpiry) {
      if (dataSource === 'real' && realDataStore) {
        // For real data, we would fetch real option chain
        // For now, still use mock data for option chain as it's complex to implement
        const chain = mockMarketDataGenerator.generateOptionChain(selectedExpiry)
        setOptionChain(chain)
      } else {
        const chain = mockMarketDataGenerator.generateOptionChain(selectedExpiry)
        setOptionChain(chain)
      }
    }
  }, [selectedExpiry, dataSource, realDataStore])

  // Subscribe to real-time data updates when using real broker connection
  useEffect(() => {
    if (dataSource === 'real' && realDataStore && isConnected) {
      // Poll for data updates instead of using Zustand subscription to avoid conflicts
      const pollInterval = setInterval(() => {
        const niftyLiveData = realDataStore.getNiftyData()

        if (niftyLiveData) {
          setNiftyData({
            ltp: niftyLiveData.ltp,
            change: niftyLiveData.netChange,
            changePercent: niftyLiveData.percentChange,
            high: niftyLiveData.high,
            low: niftyLiveData.low,
            volume: niftyLiveData.volume,
            timestamp: niftyLiveData.timestamp
          })
        }
      }, 1000) // Check for updates every second

      return () => {
        clearInterval(pollInterval)
      }
    }
  }, [dataSource, realDataStore, isConnected])

  // Connection status badge
  const getConnectionStatusBadge = () => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>
      case 'connecting':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Connecting</Badge>
      case 'disconnected':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Disconnected</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="w-3 h-3 mr-1" />Error</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  // Format price with proper styling
  const formatPrice = (price: number, change?: number) => {
    const changeClass = change && change > 0 ? 'text-green-600' : change && change < 0 ? 'text-red-600' : 'text-gray-600'
    const icon = change && change > 0 ? <TrendingUp className="w-4 h-4" /> : 
                 change && change < 0 ? <TrendingDown className="w-4 h-4" /> : 
                 <Minus className="w-4 h-4" />
    
    return (
      <div className={`flex items-center gap-2 ${changeClass}`}>
        {icon}
        <span className="font-mono text-lg">₹{price.toFixed(2)}</span>
        {change && (
          <span className="text-sm">
            ({change > 0 ? '+' : ''}{change.toFixed(2)})
          </span>
        )}
      </div>
    )
  }

  if (!user) {
    return (
      <div className="container mx-auto p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Please log in to test market data functionality.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Market Data Test Page</h1>
          <p className="text-muted-foreground">Test live market data connections and functionality</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={dataSource === 'real' ? "default" : "outline"}>
              {dataSource === 'real' ? '🔗 Real Broker Data' : '🎭 Mock Data'}
            </Badge>
            {activeBrokerConnection && (
              <Badge variant="secondary">
                {activeBrokerConnection.broker_name.toUpperCase()}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {getConnectionStatusBadge()}
          {activeBrokerConnection && (
            <Button
              onClick={() => {
                disconnect()
                setDataSource(dataSource === 'real' ? 'mock' : 'real')
                setError(null)
              }}
              variant="outline"
              size="sm"
              disabled={isTestingConnection}
            >
              Switch to {dataSource === 'real' ? 'Mock' : 'Real'} Data
            </Button>
          )}
          <Button
            onClick={testConnection}
            disabled={isTestingConnection || connectionStatus === 'connecting'}
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isTestingConnection ? 'animate-spin' : ''}`} />
            Test Connection
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant={error.includes('Using mock data instead') ? "default" : "destructive"}>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button
              variant="outline"
              size="sm"
              onClick={clearError}
              className="ml-2"
            >
              Clear
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {dataSource === 'mock' && activeBrokerConnection && !error && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            You have a broker connection available ({activeBrokerConnection.broker_name.toUpperCase()}), but using mock data for testing.
            Click "Test Connection" to try using real broker data.
          </AlertDescription>
        </Alert>
      )}

      {dataSource === 'real' && isConnected && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            🌐 Using browser-compatible mode: Real market data is fetched via REST API polling (every 2 seconds) instead of WebSocket streaming for browser compatibility.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nifty">Nifty Data</TabsTrigger>
          <TabsTrigger value="options">Option Chain</TabsTrigger>
          <TabsTrigger value="session">Trading Session</TabsTrigger>
          <TabsTrigger value="metrics">Mock Controls</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Connection Status</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{connectionStatus}</div>
                <p className="text-xs text-muted-foreground">
                  {isConnected ? 'Live data streaming' : 'No live connection'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Market Status</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {marketStatus?.isOpen ? 'Open' : 'Closed'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {marketStatus?.message || 'Unknown session'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Data Points</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {mockMarketDataGenerator.getStatus().subscriberCount}
                </div>
                <p className="text-xs text-muted-foreground">
                  Last update: {niftyData?.timestamp ? new Date(niftyData.timestamp).toLocaleTimeString() : 'Never'}
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nifty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Nifty 50 Live Data</CardTitle>
              <CardDescription>Real-time Nifty 50 index data</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {niftyData ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">LTP</p>
                    {formatPrice(niftyData.ltp, niftyData.change)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">High</p>
                    <p className="font-mono text-lg">₹{niftyData.high?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Low</p>
                    <p className="font-mono text-lg">₹{niftyData.low?.toFixed(2) || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Volume</p>
                    <p className="font-mono text-lg">{niftyData.volume?.toLocaleString() || 'N/A'}</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No Nifty data available. {isConnected ? 'Waiting for data...' : 'Connect to see live data.'}
                </div>
              )}
              
              <Separator />
              
              <div className="flex gap-2">
                <Button
                  onClick={getNiftyData}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh Nifty Data
                </Button>
                <Button
                  onClick={disconnect}
                  variant="outline"
                  size="sm"
                  disabled={!isConnected}
                >
                  Disconnect
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="options" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Option Chain Data</CardTitle>
              <CardDescription>Live option chain for selected expiry</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Select Expiry:</label>
                  <select
                    value={selectedExpiry || ''}
                    onChange={(e) => setSelectedExpiry(e.target.value)}
                    className="ml-2 p-2 border rounded"
                  >
                    <option value="">Select expiry...</option>
                    {expiryDates.map(expiry => (
                      <option key={expiry} value={expiry}>{expiry}</option>
                    ))}
                  </select>
                </div>

                {optionChain && optionChain.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Strike</th>
                          <th className="text-left p-2">Call LTP</th>
                          <th className="text-left p-2">Call Volume</th>
                          <th className="text-left p-2">Put LTP</th>
                          <th className="text-left p-2">Put Volume</th>
                        </tr>
                      </thead>
                      <tbody>
                        {optionChain.slice(0, 10).map((option, index) => (
                          <tr key={index} className="border-b">
                            <td className="p-2 font-mono">{option.strike_price}</td>
                            <td className="p-2 font-mono">{option.call_options?.ltp?.toFixed(2) || 'N/A'}</td>
                            <td className="p-2 font-mono">{option.call_options?.volume?.toLocaleString() || 'N/A'}</td>
                            <td className="p-2 font-mono">{option.put_options?.ltp?.toFixed(2) || 'N/A'}</td>
                            <td className="p-2 font-mono">{option.put_options?.volume?.toLocaleString() || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    {selectedExpiry ? 'Loading option chain data...' : 'Select an expiry to view option chain'}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="session" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Trading Session Info</CardTitle>
              <CardDescription>Current trading session details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Market Status</p>
                  <p className="text-lg font-semibold">
                    {marketStatus?.isOpen ? '🟢 Open' : '🔴 Closed'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Message</p>
                  <p className="text-lg font-semibold">{marketStatus?.message || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Next Open</p>
                  <p className="text-lg font-semibold">{marketStatus?.nextOpenTime || 'Unknown'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Time</p>
                  <p className="text-lg font-semibold">{marketStatus?.currentTime || 'Unknown'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Data Source & Controls</CardTitle>
              <CardDescription>
                {dataSource === 'real'
                  ? `Connected to ${activeBrokerConnection?.broker_name.toUpperCase()} broker for real market data`
                  : 'Using mock data generator for testing'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Data Source</p>
                  <p className="text-2xl font-bold">{dataSource === 'real' ? 'Real' : 'Mock'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {dataSource === 'real' ? 'Broker' : 'Mock Status'}
                  </p>
                  <p className="text-2xl font-bold">
                    {dataSource === 'real'
                      ? activeBrokerConnection?.broker_name.toUpperCase() || 'N/A'
                      : mockMarketDataGenerator.getStatus().isRunning ? 'Running' : 'Stopped'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {dataSource === 'real' ? 'Connection Status' : 'Current Price'}
                  </p>
                  <p className="text-2xl font-bold">
                    {dataSource === 'real'
                      ? (activeBrokerConnection?.is_active ? 'Active' : 'Inactive')
                      : `₹${mockMarketDataGenerator.getStatus().currentPrice.toFixed(2)}`
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    {dataSource === 'real' ? 'Last Update' : 'Base Price'}
                  </p>
                  <p className="text-2xl font-bold">
                    {dataSource === 'real'
                      ? (niftyData?.timestamp ? new Date(niftyData.timestamp).toLocaleTimeString() : 'Never')
                      : `₹${mockMarketDataGenerator.getStatus().basePrice.toFixed(2)}`
                    }
                  </p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  {dataSource === 'real' ? 'Real Data Controls' : 'Mock Data Controls'}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {dataSource === 'real' ? (
                    <>
                      <Button
                        onClick={getNiftyData}
                        variant="outline"
                        size="sm"
                        disabled={!isConnected}
                      >
                        Refresh Real Data
                      </Button>
                      <Button
                        onClick={() => {
                          if (realDataStore) {
                            realDataStore.subscribe(['NSE_INDEX|Nifty 50'], 'full')
                          }
                        }}
                        variant="outline"
                        size="sm"
                        disabled={!isConnected || !realDataStore}
                      >
                        Resubscribe
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => mockMarketDataGenerator.simulateMarketEvent('spike')}
                        variant="outline"
                        size="sm"
                        disabled={!isConnected}
                      >
                        Simulate Spike
                      </Button>
                      <Button
                        onClick={() => mockMarketDataGenerator.simulateMarketEvent('drop')}
                        variant="outline"
                        size="sm"
                        disabled={!isConnected}
                      >
                        Simulate Drop
                      </Button>
                      <Button
                        onClick={() => mockMarketDataGenerator.simulateMarketEvent('volatility')}
                        variant="outline"
                        size="sm"
                        disabled={!isConnected}
                      >
                        High Volatility
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
