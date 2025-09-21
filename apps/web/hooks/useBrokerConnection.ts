'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useAuth } from '@/components/AuthProvider'
import { User } from '@supabase/supabase-js'

// Calculate Upstox token expiry (3:30 AM next day)
function calculateUpstoxTokenExpiry(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(3, 30, 0, 0) // 3:30 AM next day
  return tomorrow.toISOString()
}

export interface BrokerConnection {
  id: string
  broker_name: 'upstox' | 'zerodha' | 'angel'
  broker_user_id: string
  api_key: string
  api_secret_encrypted: string | null
  access_token_encrypted: string | null
  refresh_token_encrypted: string | null
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

export interface BrokerConnectionHookReturn {
  connections: BrokerConnection[]
  loading: boolean
  error: string | null
  user: User | null
  addBrokerConnection: (credentials: BrokerCredentials) => Promise<any>
  removeBrokerConnection: (connectionId: string) => Promise<void>
  refreshTokenIfNeeded: (connectionId: string) => Promise<void>
  refreshBrokerToken: (connectionId: string) => Promise<void>
  reauthorizeBrokerConnection: (connectionId: string) => Promise<void>
  testBrokerConnection: (connectionId: string) => Promise<boolean>
  fetchConnections: () => Promise<void>
}

export function useBrokerConnection(): BrokerConnectionHookReturn {
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
      // Check if connection already exists for this broker
      const existingConnection = connections.find(c => c.broker_name === credentials.broker_name)
      if (existingConnection) {
        throw new Error(`A connection for ${credentials.broker_name} already exists. Please remove the existing connection first or update it.`)
      }

      // Validate credentials format first
      const isValid = await validateBrokerCredentials(credentials)
      if (!isValid) {
        throw new Error('Invalid broker credentials. Please check your API key, secret, and user ID.')
      }

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

      // Start OAuth flow immediately after storing credentials
      await startOAuthFlow(data.id, credentials)

      return data
    } catch (err: any) {
      setError(err.message)
      throw err
    } finally {
      setLoading(false)
    }
  }

  // Start OAuth flow for broker connection
  const startOAuthFlow = async (connectionId: string, credentials: BrokerCredentials) => {
    try {
      if (credentials.broker_name === 'upstox') {
        // Import Upstox OAuth function
        const { generateUpstoxAuthUrl } = await import('@/utils/upstox/api')

        const redirectUri = `${window.location.origin}/auth/upstox/callback`
        const state = user!.id // Use user ID as state for security

        const authUrl = generateUpstoxAuthUrl({
          api_key: credentials.api_key,
          api_secret: credentials.api_secret,
          broker_user_id: credentials.broker_user_id
        }, redirectUri, state)

        console.log('Redirecting to Upstox OAuth:', authUrl)

        // Redirect to Upstox OAuth page
        window.location.href = authUrl
      } else {
        throw new Error(`OAuth flow not implemented for broker: ${credentials.broker_name}`)
      }
    } catch (error) {
      console.error('Failed to start OAuth flow:', error)
      throw error
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
    const connection = connections.find(c => c.id === connectionId)
    try {
      if (!connection) {
        throw new Error('Broker connection not found')
      }

      if (connection.broker_name === 'upstox') {
        // Import Upstox refresh function
        const { refreshUpstoxToken } = await import('@/utils/upstox/api')

        // Decrypt refresh token
        if (!connection.refresh_token_encrypted) {
          throw new Error('No refresh token available')
        }

        if (!connection.api_secret_encrypted) {
          throw new Error('No API secret available')
        }

        // For Upstox, we use the extended token for refresh attempts
        // Note: Upstox may require re-authorization if refresh fails
        const extendedToken = atob(connection.refresh_token_encrypted)
        const credentials = {
          api_key: connection.api_key,
          api_secret: atob(connection.api_secret_encrypted),
          broker_user_id: connection.broker_user_id
        }

        const tokenResponse = await refreshUpstoxToken(extendedToken, credentials)

        // Calculate new expiry (Upstox tokens expire at 3:30 AM next day)
        const expiryTime = calculateUpstoxTokenExpiry()

        // Update database with new tokens
        const { error } = await supabase
          .from('broker_connections')
          .update({
            access_token_encrypted: btoa(tokenResponse.access_token),
            refresh_token_encrypted: tokenResponse.extended_token ? btoa(tokenResponse.extended_token) : null,
            token_expires_at: expiryTime,
            last_verified_at: new Date().toISOString(),
            is_active: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)
          .eq('user_id', user?.id)

        if (error) throw error
      } else {
        throw new Error(`Token refresh not implemented for broker: ${connection.broker_name}`)
      }

      await fetchConnections()
    } catch (err: any) {
      console.error('Token refresh failed:', err)
      // If refresh fails, mark connection as needing re-authorization
      if (connection!.broker_name === 'upstox') {
        await supabase
          .from('broker_connections')
          .update({
            is_active: false,
            is_verified: false,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)
          .eq('user_id', user?.id)
        await fetchConnections()
      }
      setError(`Token refresh failed: ${err.message}. You may need to re-authorize your Upstox connection.`)
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

  // Test broker connection by making a simple API call
  const testBrokerConnection = async (connectionId: string): Promise<boolean> => {
    try {
      const connection = connections.find(c => c.id === connectionId)
      if (!connection || !connection.access_token_encrypted) {
        return false
      }

      if (connection.broker_name === 'upstox') {
        // Import Upstox market data function
        const { getMarketData } = await import('@/utils/upstox/api')

        if (!connection.access_token_encrypted) {
          return false
        }

        const accessToken = atob(connection.access_token_encrypted)

        // Test connection by fetching market data
        await getMarketData(accessToken)
        return true
      }

      return false
    } catch (error) {
      console.error('Connection test failed:', error)
      return false
    }
  }

  // Reauthorize broker connection (start OAuth flow again)
  const reauthorizeBrokerConnection = async (connectionId: string) => {
    setLoading(true)
    setError(null)
    try {
      const connection = connections.find(c => c.id === connectionId)
      if (!connection) {
        throw new Error('Broker connection not found')
      }

      if (!connection.api_secret_encrypted) {
        throw new Error('API secret not found. Please remove and add the connection again.')
      }

      if (connection.broker_name === 'upstox') {
        // Import Upstox OAuth function
        const { generateUpstoxAuthUrl } = await import('@/utils/upstox/api')

        const redirectUri = `${window.location.origin}/auth/upstox/callback`
        const state = user!.id // Use user ID as state for security

        // Decrypt API secret
        const credentials = {
          api_key: connection.api_key,
          api_secret: atob(connection.api_secret_encrypted),
          broker_user_id: connection.broker_user_id
        }

        const authUrl = generateUpstoxAuthUrl(credentials, redirectUri, state)

        console.log('Redirecting to Upstox OAuth for reauthorization:', authUrl)

        // Update connection status
        await supabase
          .from('broker_connections')
          .update({
            is_active: false,
            is_verified: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', connectionId)
          .eq('user_id', user?.id)

        // Update user profile
        await supabase
          .from('profiles')
          .update({
            broker_connected: false,
            broker_connection_status: 'reconnecting'
          })
          .eq('id', user!.id)

        // Redirect to Upstox OAuth page
        window.location.href = authUrl
      } else {
        throw new Error(`Reauthorization not implemented for broker: ${connection.broker_name}`)
      }
    } catch (err: any) {
      console.error('Failed to reauthorize connection:', err)
      setError(err.message || 'Failed to reauthorize connection')
    } finally {
      setLoading(false)
    }
  }

  return {
    connections,
    loading,
    error,
    user, // Include user in return
    addBrokerConnection,
    removeBrokerConnection,
    refreshTokenIfNeeded,
    refreshBrokerToken,
    reauthorizeBrokerConnection,
    testBrokerConnection,
    fetchConnections,
  }
}