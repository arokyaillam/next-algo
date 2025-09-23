'use client'

import { useState, useEffect } from 'react'
import { useLiveDataStore } from '@workspace/market-data'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Separator } from "@workspace/ui/components/separator"
import { RefreshCw, Bug, CheckCircle, AlertCircle, Clock, Zap } from "lucide-react"

interface DebugLog {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  data?: any
}

export function MarketDataDebugger() {
  const [debugLogs, setDebugLogs] = useState<DebugLog[]>([])
  const [isDebugging, setIsDebugging] = useState(false)
  
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

  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const log: DebugLog = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
      data
    }
    setDebugLogs(prev => [log, ...prev.slice(0, 49)]) // Keep last 50 logs
  }

  const clearLogs = () => {
    setDebugLogs([])
  }

  const testNiftyData = async () => {
    addLog('info', 'Testing Nifty data fetch...')
    try {
      const data = await getNiftyData()
      addLog('info', 'Nifty data received', data)
    } catch (err) {
      addLog('error', 'Nifty data fetch failed', err)
    }
  }

  const testMarketData = async () => {
    addLog('info', 'Testing market data fetch...')
    try {
      const instrumentKey = 'NSE_INDEX|Nifty 50'
      const data = getMarketData(instrumentKey)
      addLog('info', `Market data for ${instrumentKey}`, data)
    } catch (err) {
      addLog('error', 'Market data fetch failed', err)
    }
  }

  const testReconnection = async () => {
    addLog('info', 'Testing reconnection...')
    try {
      // Note: reconnect needs supabaseClient parameter
      addLog('warn', 'Reconnection test skipped - needs supabaseClient parameter')
    } catch (err) {
      addLog('error', 'Reconnection failed', err)
    }
  }

  // Monitor connection status changes
  useEffect(() => {
    addLog('debug', `Connection status changed: ${connectionStatus}`)
  }, [connectionStatus])

  // Monitor errors
  useEffect(() => {
    if (error) {
      addLog('error', `Error occurred: ${error}`)
    }
  }, [error])

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return 'text-red-600 bg-red-50'
      case 'warn': return 'text-yellow-600 bg-yellow-50'
      case 'info': return 'text-blue-600 bg-blue-50'
      case 'debug': return 'text-gray-600 bg-gray-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getLevelIcon = (level: DebugLog['level']) => {
    switch (level) {
      case 'error': return <AlertCircle className="w-3 h-3" />
      case 'warn': return <AlertCircle className="w-3 h-3" />
      case 'info': return <CheckCircle className="w-3 h-3" />
      case 'debug': return <Bug className="w-3 h-3" />
      default: return <Clock className="w-3 h-3" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Market Data Debugger
            </CardTitle>
            <CardDescription>Debug and test market data connections</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "destructive"}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDebugging(!isDebugging)}
            >
              <Zap className="w-4 h-4 mr-2" />
              {isDebugging ? 'Stop' : 'Start'} Debug
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              {error}
              <Button variant="outline" size="sm" onClick={clearError}>
                Clear
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Test Actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={testNiftyData}
            disabled={!isConnected}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Test Nifty
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={testMarketData}
            disabled={!isConnected}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Test Market Data
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={testReconnection}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Test Reconnect
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={clearLogs}
          >
            Clear Logs
          </Button>
        </div>

        <Separator />

        {/* Connection Status */}
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Status</p>
            <p className="font-semibold">{connectionStatus}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Connected</p>
            <p className="font-semibold">{isConnected ? 'Yes' : 'No'}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Logs</p>
            <p className="font-semibold">{debugLogs.length}</p>
          </div>
        </div>

        <Separator />

        {/* Debug Logs */}
        <div>
          <h4 className="text-sm font-semibold mb-2">Debug Logs</h4>
          <div className="max-h-60 overflow-y-auto space-y-1 border rounded p-2 bg-muted/20">
            {debugLogs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No logs yet. Start debugging to see activity.
              </p>
            ) : (
              debugLogs.map((log, index) => (
                <div
                  key={index}
                  className={`text-xs p-2 rounded flex items-start gap-2 ${getLevelColor(log.level)}`}
                >
                  {getLevelIcon(log.level)}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs opacity-70">
                        {log.timestamp}
                      </span>
                      <span className="font-semibold uppercase text-xs">
                        {log.level}
                      </span>
                    </div>
                    <p className="mt-1">{log.message}</p>
                    {log.data && (
                      <pre className="mt-1 text-xs bg-black/10 p-1 rounded overflow-x-auto">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
