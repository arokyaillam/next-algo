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
  extended_token?: string
  email: string
  exchanges: string[]
  products: string[]
  broker: string
  user_id: string
  user_name: string
  order_types: string[]
  user_type: string
  poa: boolean
  is_active: boolean
  // Note: expires_in is not returned, tokens expire at 3:30 AM next day
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
  console.log('🔄 Exchanging authorization code for tokens...')
  console.log('Request details:', {
    url: `${UPSTOX_BASE_URL}/v2/login/authorization/token`,
    code: code.substring(0, 10) + '...',
    client_id: credentials.api_key.substring(0, 8) + '...',
    redirect_uri: redirectUri
  })

  const requestBody = new URLSearchParams({
    code,
    client_id: credentials.api_key,
    client_secret: credentials.api_secret,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  })

  console.log('Request body:', requestBody.toString().replace(/client_secret=[^&]+/, 'client_secret=***'))

  const response = await fetch(`${UPSTOX_BASE_URL}/v2/login/authorization/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'Next-Algo/1.0',
    },
    body: requestBody,
  })

  console.log('HTTP Response:', {
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries())
  })

  let data
  const responseText = await response.text()
  console.log('Raw response text:', responseText)

  if (!responseText || responseText.trim() === '') {
    throw new Error(`Empty response from Upstox API (${response.status} ${response.statusText}). This might be a CORS issue or server error.`)
  }

  try {
    data = JSON.parse(responseText)
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    throw new Error(`Invalid JSON response from Upstox API: ${responseText.substring(0, 200)}...`)
  }

  if (!response.ok) {
    console.error('Upstox API Error Response:', data)
    const errorMessage = data?.errors?.[0]?.message ||
                        data?.error_description ||
                        data?.error ||
                        `HTTP ${response.status}: ${response.statusText}`
    throw new Error(`Upstox API Error: ${errorMessage}`)
  }

  console.log('✅ Token exchange successful:', {
    hasAccessToken: !!data.access_token,
    hasExtendedToken: !!data.extended_token
  })

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
  const url = new URL(`${UPSTOX_BASE_URL}/v2/market-quote/ltp`)
  url.searchParams.append('instrument_key', instrumentKey)

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('Upstox API Error:', response.status, errorText)
    throw new Error(`Failed to fetch market data: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

// Refresh access token using extended token
export async function refreshUpstoxToken(
  extendedToken: string,
  credentials: UpstoxCredentials
): Promise<UpstoxTokenResponse> {
  console.log('🔄 Refreshing Upstox access token...')

  const requestBody = new URLSearchParams({
    refresh_token: extendedToken,
    grant_type: 'refresh_token',
    client_id: credentials.api_key,
    client_secret: credentials.api_secret,
  })

  console.log('Refresh request body:', requestBody.toString().replace(/client_secret=[^&]+/, 'client_secret=***'))

  // Note: Upstox refresh mechanism might require re-authorization
  // For now, we'll try the standard refresh flow
  const response = await fetch(`${UPSTOX_BASE_URL}/v2/login/authorization/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'Next-Algo/1.0',
    },
    body: requestBody,
  })

  console.log('Refresh HTTP Response:', {
    status: response.status,
    statusText: response.statusText
  })

  const responseText = await response.text()
  console.log('Refresh raw response:', responseText)

  if (!responseText || responseText.trim() === '') {
    throw new Error(`Empty response from Upstox refresh API (${response.status} ${response.statusText})`)
  }

  let data
  try {
    data = JSON.parse(responseText)
  } catch (parseError) {
    throw new Error(`Invalid JSON response from Upstox refresh API: ${responseText.substring(0, 200)}...`)
  }

  if (!response.ok) {
    console.error('Upstox refresh error:', data)
    const errorMessage = data?.errors?.[0]?.message ||
                        data?.error_description ||
                        data?.error ||
                        `HTTP ${response.status}: ${response.statusText}`
    throw new Error(`Failed to refresh token: ${errorMessage}`)
  }

  console.log('✅ Token refresh successful:', {
    hasAccessToken: !!data.access_token,
    hasExtendedToken: !!data.extended_token
  })

  return data
}