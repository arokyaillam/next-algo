// utils/upstox/api.ts
export const UPSTOX_BASE_URL = 'https://api.upstox.com'
export const UPSTOX_LOGIN_URL = 'https://api.upstox.com/v2/login/authorization/dialog'

export interface UpstoxCredentials {
  api_key: string
  api_secret: string
  broker_user_id: string
}

export interface UpstoxTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  refresh_token?: string
}

// Generate Upstox OAuth URL
export function generateUpstoxAuthUrl(credentials: UpstoxCredentials, redirectUri: string, state: string) {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: credentials.api_key,
    redirect_uri: redirectUri,
    state: state, // User ID for security
  })
  
  return `${UPSTOX_LOGIN_URL}?${params.toString()}`
}

// Exchange authorization code for access token
export async function exchangeCodeForToken(
  code: string, 
  credentials: UpstoxCredentials, 
  redirectUri: string
): Promise<UpstoxTokenResponse> {
  const response = await fetch(`${UPSTOX_BASE_URL}/v2/login/authorization/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      code,
      client_id: credentials.api_key,
      client_secret: credentials.api_secret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.errors?.[0]?.message || 'Failed to get access token')
  }

  return data
}

// Validate API credentials by making a test call
export async function validateUpstoxCredentials(credentials: UpstoxCredentials): Promise<boolean> {
  try {
    // For now, validate format and basic checks
    const hasValidFormat = 
      credentials.api_key && credentials.api_key.length >= 8 &&
      credentials.api_secret && credentials.api_secret.length >= 8 &&
      credentials.broker_user_id && credentials.broker_user_id.length >= 6

    if (!hasValidFormat) {
      return false
    }

    // TODO: Add real API validation call here when ready
    // For development, return true if format is valid
    console.log('Validating Upstox credentials:', {
      api_key: credentials.api_key.substring(0, 4) + '...',
      broker_user_id: credentials.broker_user_id,
      api_secret: '***masked***'
    })
    
    return true // Accept for now
    
    /* Real validation would be:
    const response = await fetch(`${UPSTOX_BASE_URL}/v2/user/profile`, {
      headers: {
        'Api-Version': '2.0',
        'Authorization': `Bearer temporary_token_for_validation`
      }
    })
    return response.ok
    */
  } catch (error) {
    console.error('Validation error:', error)
    return false
  }
}

// Get user profile from Upstox
export async function getUpstoxUserProfile(accessToken: string) {
  const response = await fetch(`${UPSTOX_BASE_URL}/v2/user/profile`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user profile')
  }

  return response.json()
}

// Get market data (for testing connection)
export async function getMarketData(accessToken: string, instrumentKey: string = 'NSE_INDEX|Nifty 50') {
  const response = await fetch(`${UPSTOX_BASE_URL}/v2/market-quote/ltp`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
    // Add query params
  })

  if (!response.ok) {
    throw new Error('Failed to fetch market data')
  }

  return response.json()
}

// Refresh access token
export async function refreshUpstoxToken(
  refreshToken: string,
  credentials: UpstoxCredentials
): Promise<UpstoxTokenResponse> {
  const response = await fetch(`${UPSTOX_BASE_URL}/v2/login/authorization/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
    },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
      client_id: credentials.api_key,
      client_secret: credentials.api_secret,
    }),
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(data.errors?.[0]?.message || 'Failed to refresh token')
  }

  return data
}