// app/auth/upstox/callback/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/components/AuthProvider'
import { createClient } from '@/utils/supabase/client'
import { exchangeCodeForToken, getUpstoxUserProfile } from '@/utils/upstox/api'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Alert, AlertDescription } from "@workspace/ui/components/alert"
import { CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

// Calculate Upstox token expiry (3:30 AM next day)
function calculateUpstoxTokenExpiry(): string {
  const now = new Date()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  tomorrow.setHours(3, 30, 0, 0) // 3:30 AM next day
  return tomorrow.toISOString()
}

export default function UpstoxCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing')
  const [message, setMessage] = useState('Processing Upstox authentication...')
  const supabase = createClient()

  useEffect(() => {
    const handleCallback = async () => {
      try {
        if (!user) {
          throw new Error('User not authenticated')
        }

        const code = searchParams.get('code')
        const state = searchParams.get('state')
        const error = searchParams.get('error')
        const errorDescription = searchParams.get('error_description')

        console.log('OAuth callback parameters:', {
          hasCode: !!code,
          hasState: !!state,
          hasError: !!error,
          errorDescription
        })

        if (error) {
          throw new Error(`Upstox OAuth error: ${error}${errorDescription ? ` - ${errorDescription}` : ''}`)
        }

        if (!code) {
          throw new Error('No authorization code received from Upstox')
        }

        if (!state) {
          throw new Error('No state parameter received')
        }

        if (state !== user.id) {
          throw new Error('Invalid state parameter - possible security issue')
        }

        setMessage('Exchanging authorization code for access token...')

        // Get user's broker connection from database
        const { data: brokerConnection, error: dbError } = await supabase
          .from('broker_connections')
          .select('*')
          .eq('user_id', user.id)
          .eq('broker_name', 'upstox')
          .single()

        if (dbError || !brokerConnection) {
          throw new Error('Broker connection not found in database')
        }

        // Decrypt API credentials (implement proper decryption)
        if (!brokerConnection.api_secret_encrypted) {
          throw new Error('API secret not found in database')
        }

        const credentials = {
          api_key: brokerConnection.api_key,
          api_secret: atob(brokerConnection.api_secret_encrypted), // Simple base64 decode
          broker_user_id: brokerConnection.broker_user_id
        }

        // Exchange code for tokens
        const tokenResponse = await exchangeCodeForToken(
          code,
          credentials,
          `${window.location.origin}/auth/upstox/callback`
        )

        // Validate token response
        if (!tokenResponse.access_token) {
          throw new Error('No access token received from Upstox')
        }

        console.log('Token response received:', {
          hasAccessToken: !!tokenResponse.access_token,
          hasExtendedToken: !!tokenResponse.extended_token,
          userName: tokenResponse.user_name,
          userId: tokenResponse.user_id,
          isActive: tokenResponse.is_active
        })

        setMessage('Validating connection with Upstox...')

        // User profile is already included in token response
        console.log('User profile from token response:', {
          userName: tokenResponse.user_name,
          userId: tokenResponse.user_id,
          email: tokenResponse.email,
          isActive: tokenResponse.is_active
        })

        // Use profile data from token response
        const userProfile = {
          data: {
            user_name: tokenResponse.user_name,
            user_id: tokenResponse.user_id,
            email: tokenResponse.email
          }
        }

        setMessage('Saving authentication tokens...')

        // Calculate token expiry (Upstox tokens expire at 3:30 AM next day)
        const expiryTime = calculateUpstoxTokenExpiry()
        console.log('Token expiry calculated:', expiryTime)

        // Update database with tokens
        const { error: updateError } = await supabase
          .from('broker_connections')
          .update({
            access_token_encrypted: btoa(tokenResponse.access_token), // Simple base64 encode
            refresh_token_encrypted: tokenResponse.extended_token ? btoa(tokenResponse.extended_token) : null, // Use extended_token as refresh_token
            token_expires_at: expiryTime,
            is_active: true,
            is_verified: true,
            last_verified_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', brokerConnection.id)

        if (updateError) {
          throw new Error('Failed to save authentication tokens')
        }

        // Update user profile
        await supabase
          .from('profiles')
          .update({
            broker_connected: true,
            broker_connection_status: 'connected'
          })
          .eq('id', user.id)

        setStatus('success')
        setMessage(`Successfully connected to Upstox! Welcome ${userProfile.data?.user_name || 'Trader'}`)

        // Redirect to settings after 3 seconds
        setTimeout(() => {
          router.push('/settings?tab=broker&success=connected')
        }, 3000)

      } catch (error: any) {
        console.error('Upstox callback error:', error)
        setStatus('error')
        setMessage(error.message || 'Failed to connect to Upstox')

        // Redirect to settings after 5 seconds
        setTimeout(() => {
          router.push('/settings?tab=broker&error=connection_failed')
        }, 5000)
      }
    }

    if (user && searchParams) {
      handleCallback()
    }
  }, [user, searchParams, router, supabase])

  const getStatusIcon = () => {
    switch (status) {
      case 'processing':
        return <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      case 'success':
        return <CheckCircle className="h-8 w-8 text-green-600" />
      case 'error':
        return <AlertCircle className="h-8 w-8 text-red-600" />
    }
  }

  const getStatusColor = () => {
    switch (status) {
      case 'processing':
        return 'border-blue-200 bg-blue-50'
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-blue-600">
            निफ्टी Options Pro
          </CardTitle>
          <CardDescription>
            Upstox Integration
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          <Alert className={getStatusColor()}>
            <div className="flex items-center space-x-3">
              {getStatusIcon()}
              <div className="flex-1">
                <AlertDescription className={
                  status === 'success' ? 'text-green-800' :
                  status === 'error' ? 'text-red-800' : 'text-blue-800'
                }>
                  {message}
                </AlertDescription>
              </div>
            </div>
          </Alert>

          {status === 'processing' && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Please wait while we set up your Upstox connection...
            </div>
          )}

          {status === 'success' && (
            <div className="mt-4 text-center text-sm text-green-700">
              Redirecting to settings page...
            </div>
          )}

          {status === 'error' && (
            <div className="mt-4 text-center text-sm text-red-700">
              You will be redirected back to settings. Please try again.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}