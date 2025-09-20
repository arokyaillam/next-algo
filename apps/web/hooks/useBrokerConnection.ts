// hooks/useBrokerConnection.ts
'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/components/AuthProvider'

export interface BrokerConnection {
  id: string
  broker_name: 'upstox' | 'zerodha' | 'angel'
  broker_user_id: string
  is_active: boolean
  is_verified: boolean
  token_expires_at: string | null
  last_verified_at: string | null
  created_at: string
  updated_at: string
}

export interface BrokerCredentials {
  broker_name: 'upstox' | 'zerodha' | 'angel'
  broker_user_id: string
  api_key: string
  api_secret: string
}

export function useBrokerConnection() {
  const { user } = useAuth()
  const [connections, setConnections] = useState<BrokerConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Fetch user's broker connections
  const fetchConnections = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('broker_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setConnections(data || [])
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Add new broker connection
  const addBrokerConnection = async (credentials: BrokerCredentials) => {
    if (!user) throw new Error('User not authenticated')

    setLoading(true)
    setError(null)

    try {
      // Skip validation for development - Direct save to database
      console.log('Adding broker connection:', credentials.broker_name)
      
      // Encrypt sensitive data (in real app, do this on server-side)
      const encryptedData = {
        api_secret_encrypted: btoa(credentials.api_secret), // Simple base64 - use proper encryption in production
        access_token_encrypted: null,
        refresh_token_encrypted: null,
      }

      const { data, error } = await supabase
        .from('broker_connections')
        .insert({
          user_id: user.id,
          broker_name: credentials.broker_name,
          broker_user_id: credentials.broker_user_id,
          api_key: credentials.api_key,
          ...encryptedData,
          is_active: false, // Will be activated after OAuth
          is_verified: false, // Will be verified after OAuth
          last_verified_at: null,
        })
        .select()
        .single()

      if (error) throw error

      // Update user profile
      await supabase
        .from('profiles')
        .update({ 
          broker_connected: false, // Will be true after OAuth success
          broker_connection_status: 'connecting'
        })
        .eq('id', user.id)

      await fetchConnections()
      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Validate broker credentials
  const validateBrokerCredentials = async (credentials: BrokerCredentials): Promise<boolean> => {
    try {
      if (credentials.broker_name === 'upstox') {
        // Import Upstox validation function
        const { validateUpstoxCredentials } = await import('@/utils/upstox/api')
        return await validateUpstoxCredentials({
          api_key: credentials.api_key,
          api_secret: credentials.api_secret,
          broker_user_id: credentials.broker_user_id
        })
      }
      
      // Add other broker validations here
      return false
    } catch (error) {
      console.error('Validation error:', error)
      return false
    }
  }

  // Remove broker connection
  const removeBrokerConnection = async (connectionId: string) => {
    if (!user) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('broker_connections')
        .delete()
        .eq('id', connectionId)
        .eq('user_id', user.id)

      if (error) throw error

      // Update user profile if no connections left
      const remainingConnections = connections.filter(c => c.id !== connectionId)
      if (remainingConnections.length === 0) {
        await supabase
          .from('profiles')
          .update({ 
            broker_connected: false,
            broker_connection_status: 'disconnected'
          })
          .eq('id', user.id)
      }

      await fetchConnections()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Check token expiry and refresh if needed
  const refreshTokenIfNeeded = async (connectionId: string) => {
    const connection = connections.find(c => c.id === connectionId)
    if (!connection || !connection.token_expires_at) return

    const expiryTime = new Date(connection.token_expires_at)
    const now = new Date()
    const timeToExpiry = expiryTime.getTime() - now.getTime()

    // Refresh if expires within 10 minutes
    if (timeToExpiry < 10 * 60 * 1000) {
      await refreshBrokerToken(connectionId)
    }
  }

  // Refresh broker token
  const refreshBrokerToken = async (connectionId: string) => {
    setLoading(true)
    try {
      // Mock token refresh - implement actual broker API calls
      const newTokenExpiry = new Date()
      newTokenExpiry.setHours(newTokenExpiry.getHours() + 24) // 24 hours from now

      const { error } = await supabase
        .from('broker_connections')
        .update({
          token_expires_at: newTokenExpiry.toISOString(),
          last_verified_at: new Date().toISOString(),
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', connectionId)
        .eq('user_id', user?.id)

      if (error) throw error
      await fetchConnections()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Auto-fetch connections when user changes
  useEffect(() => {
    if (user) {
      fetchConnections()
    } else {
      setConnections([])
    }
  }, [user])

  return {
    connections,
    loading,
    error,
    addBrokerConnection,
    removeBrokerConnection,
    refreshTokenIfNeeded,
    refreshBrokerToken,
    fetchConnections,
  }
}