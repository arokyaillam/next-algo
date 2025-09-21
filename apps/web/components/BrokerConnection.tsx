'use client'

import { useState } from 'react'
import { useBrokerConnection, BrokerCredentials, BrokerConnection } from '@/hooks/useBrokerConnection'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/select"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@workspace/ui/components/tooltip"
import { Loader2, Plus, Trash2, RefreshCw, AlertCircle, CheckCircle, Clock, KeyRound } from "lucide-react"

// BrokerConnectionCard Component
export function BrokerConnectionCard() {
  const { 
    connections, 
    loading, 
    error, 
    addBrokerConnection, 
    removeBrokerConnection, 
    refreshBrokerToken,
    reauthorizeBrokerConnection
  } = useBrokerConnection()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [newConnection, setNewConnection] = useState({
    broker_name: 'upstox' as 'upstox' | 'zerodha' | 'angel',
    broker_user_id: '',
    api_key: '',
    api_secret: '',
  })

  const handleAddConnection = async () => {
    setActionError(null)
    try {
      await addBrokerConnection(newConnection)
      setIsAddDialogOpen(false)
      setNewConnection({
        broker_name: 'upstox',
        broker_user_id: '',
        api_key: '',
        api_secret: '',
      })
    } catch (err) {
      console.error('Failed to add connection:', err)
    }
  }

  const handleRemoveConnection = async (connectionId: string) => {
    setActionError(null)
    try {
      await removeBrokerConnection(connectionId)
    } catch (err: any) {
      console.error('Failed to remove connection:', err)
      setActionError(err.message || 'Failed to remove connection. Please try again.')
    }
  }

  const handleRefreshToken = async (connectionId: string) => {
    try {
      await refreshBrokerToken(connectionId)
    } catch (err) {
      console.error('Failed to refresh token:', err)
    }
  }
  
  const handleReauthorize = async (connectionId: string) => {
    setActionError(null)
    try {
      await reauthorizeBrokerConnection(connectionId)
    } catch (err: any) {
      console.error('Failed to reauthorize connection:', err)
      setActionError(err.message || 'Failed to reauthorize connection. Please try again.')
    }
  }

  const getBrokerDisplayName = (brokerName: string) => {
    switch (brokerName) {
      case 'upstox': return 'Upstox'
      case 'zerodha': return 'Zerodha'
      case 'angel': return 'Angel One'
      default: return brokerName
    }
  }

  const getStatusBadge = (connection: BrokerConnection) => {
    if (connection.is_verified && connection.is_active) {
      return <Badge className="bg-green-100 text-green-800">Active</Badge>
    } else if (connection.is_verified) {
      return <Badge className="bg-yellow-100 text-yellow-800">Verified</Badge>
    } else {
      return <Badge className="bg-red-100 text-red-800">Not Verified</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Existing Connections */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Broker Connections</CardTitle>
            <CardDescription>
              Manage your broker API connections for automated trading
            </CardDescription>
          </div>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Connection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Broker Connection</DialogTitle>
                <DialogDescription>
                  Connect your trading account to enable automated trading
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="broker">Broker</Label>
                  <Select
                    value={newConnection.broker_name}
                    onValueChange={(value) => setNewConnection(prev => ({ ...prev, broker_name: value as 'upstox' | 'zerodha' | 'angel' }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upstox">Upstox</SelectItem>
                      <SelectItem value="zerodha">Zerodha</SelectItem>
                      <SelectItem value="angel">Angel One</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="user_id">Broker User ID</Label>
                  <Input
                    id="user_id"
                    value={newConnection.broker_user_id}
                    onChange={(e) => setNewConnection(prev => ({ ...prev, broker_user_id: e.target.value }))}
                    placeholder="Enter your broker user ID"
                  />
                </div>
                <div>
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={newConnection.api_key}
                    onChange={(e) => setNewConnection(prev => ({ ...prev, api_key: e.target.value }))}
                    placeholder="Enter your API key"
                  />
                </div>
                <div>
                  <Label htmlFor="api_secret">API Secret</Label>
                  <Input
                    id="api_secret"
                    type="password"
                    value={newConnection.api_secret}
                    onChange={(e) => setNewConnection(prev => ({ ...prev, api_secret: e.target.value }))}
                    placeholder="Enter your API secret"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddConnection} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Add Connection
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          {actionError && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800 text-sm">{actionError}</p>
            </div>
          )}
          
          {connections.some(c => !c.is_active || !c.is_verified) && (
            <Alert className="mb-4 bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                One or more of your broker connections needs to be reauthorized. Click the <KeyRound className="h-3 w-3 inline" /> button to reconnect.
              </AlertDescription>
            </Alert>
          )}

          {loading && connections.length === 0 ? (
            <div className="text-center py-8">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Loading connections...</p>
            </div>
          ) : connections.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="text-4xl mb-2">🔗</div>
              <p className="text-sm">No broker connections yet</p>
              <p className="text-xs mt-1">Add a connection to start automated trading</p>
            </div>
          ) : (
            <div className="space-y-4">
              {connections.map((connection) => (
                <div key={connection.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div>
                      <div className="font-medium">{getBrokerDisplayName(connection.broker_name)}</div>
                      <div className="text-sm text-muted-foreground">ID: {connection.broker_user_id}</div>
                      {connection.last_verified_at && (
                        <div className="text-xs text-muted-foreground">
                          Last verified: {new Date(connection.last_verified_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(connection)}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRefreshToken(connection.id)}
                      disabled={loading}
                      title="Refresh token"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReauthorize(connection.id)}
                            disabled={loading}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Re-authorize Upstox connection</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRemoveConnection(connection.id)}
                      disabled={loading}
                      title="Remove connection"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}