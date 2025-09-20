// components/BrokerConnection.tsx
'use client'

import { useState } from 'react'
import { Button } from "@workspace/ui/components/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@workspace/ui/components/dialog"
import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { Badge } from "@workspace/ui/components/badge"
import { Trash2, RefreshCw, Plus, AlertCircle, CheckCircle, Clock } from 'lucide-react'
import { useBrokerConnection, BrokerCredentials } from '@/hooks/useBrokerConnection'

export function BrokerConnectionCard() {
  const { connections, loading, error, addBrokerConnection, removeBrokerConnection, refreshBrokerToken } = useBrokerConnection()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState<BrokerCredentials>({
    broker_name: 'upstox',
    broker_user_id: '',
    api_key: '',
    api_secret: '',
  })
  const [formLoading, setFormLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setFormError(null)

    try {
      await addBrokerConnection(formData)
      setIsDialogOpen(false)
      setFormData({
        broker_name: 'upstox',
        broker_user_id: '',
        api_key: '',
        api_secret: '',
      })
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  const getStatusBadge = (connection: any) => {
    if (!connection.is_active) {
      return <Badge variant="destructive" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Inactive
      </Badge>
    }

    if (connection.is_verified) {
      const expiry = connection.token_expires_at ? new Date(connection.token_expires_at) : null
      const now = new Date()
      const isExpiringSoon = expiry && (expiry.getTime() - now.getTime()) < 2 * 60 * 60 * 1000 // 2 hours

      if (isExpiringSoon) {
        return <Badge variant="outline" className="flex items-center gap-1 text-orange-600">
          <Clock className="h-3 w-3" />
          Expires Soon
        </Badge>
      }

      return <Badge variant="default" className="flex items-center gap-1 bg-green-600">
        <CheckCircle className="h-3 w-3" />
        Connected
      </Badge>
    }

    return <Badge variant="outline" className="flex items-center gap-1">
      <Clock className="h-3 w-3" />
      Verifying
    </Badge>
  }

  const formatExpiry = (expiryDate: string | null) => {
    if (!expiryDate) return 'N/A'
    const date = new Date(expiryDate)
    const now = new Date()
    const diffHours = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60))
    
    if (diffHours < 0) return 'Expired'
    if (diffHours < 24) return `${diffHours}h remaining`
    
    return date.toLocaleDateString('en-IN', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <span>Broker Connections</span>
              {connections.length > 0 && (
                <Badge variant="outline">{connections.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Connect your broker accounts for live trading
            </CardDescription>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Broker
              </Button>
            </DialogTrigger>
            
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Broker Connection</DialogTitle>
                <DialogDescription>
                  Enter your broker API credentials. These will be stored securely.
                </DialogDescription>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="broker">Broker</Label>
                  <Select 
                    value={formData.broker_name} 
                    onValueChange={(value: any) => setFormData({...formData, broker_name: value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select broker" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upstox">Upstox</SelectItem>
                      <SelectItem value="zerodha">Zerodha</SelectItem>
                      <SelectItem value="angel">Angel Broking</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="user_id">Broker User ID</Label>
                  <Input
                    id="user_id"
                    placeholder="Your broker user ID"
                    value={formData.broker_user_id}
                    onChange={(e) => setFormData({...formData, broker_user_id: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_key">API Key</Label>
                  <Input
                    id="api_key"
                    placeholder="Your API key"
                    value={formData.api_key}
                    onChange={(e) => setFormData({...formData, api_key: e.target.value})}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="api_secret">API Secret</Label>
                  <Input
                    id="api_secret"
                    type="password"
                    placeholder="Your API secret"
                    value={formData.api_secret}
                    onChange={(e) => setFormData({...formData, api_secret: e.target.value})}
                    required
                  />
                </div>

                {formError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-red-800">
                      {formError}
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-3 pt-4">
                  <Button type="submit" disabled={formLoading} className="flex-1">
                    {formLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      'Connect Broker'
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setIsDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            Loading connections...
          </div>
        ) : connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="text-4xl mb-2">🔗</div>
            <p className="text-sm">No broker connections yet</p>
            <p className="text-xs">Add a broker to start trading</p>
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div
                key={connection.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="font-medium capitalize">{connection.broker_name}</div>
                    {getStatusBadge(connection)}
                  </div>
                  
                  <div className="text-sm text-muted-foreground space-y-1">
                    <div>User ID: {connection.broker_user_id}</div>
                    <div>Token expires: {formatExpiry(connection.token_expires_at)}</div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => refreshBrokerToken(connection.id)}
                    disabled={loading}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeBrokerConnection(connection.id)}
                    disabled={loading}
                    className="text-red-600 hover:text-red-700"
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
  )
}