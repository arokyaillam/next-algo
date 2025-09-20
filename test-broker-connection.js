#!/usr/bin/env node

/**
 * Test script for broker connection functionality
 * Run with: node test-broker-connection.js
 */

const https = require('https')

// Test Upstox API endpoints
async function testUpstoxAPI() {
  console.log('🔍 Testing Upstox API endpoints...\n')

  const endpoints = [
    {
      name: 'Authorization URL Generation',
      url: 'https://api.upstox.com/v2/login/authorization/dialog',
      method: 'GET'
    },
    {
      name: 'Token Exchange',
      url: 'https://api.upstox.com/v2/login/authorization/token',
      method: 'POST'
    },
    {
      name: 'User Profile',
      url: 'https://api.upstox.com/v2/user/profile',
      method: 'GET'
    },
    {
      name: 'Market Data',
      url: 'https://api.upstox.com/v2/market-quote/ltp',
      method: 'GET'
    }
  ]

  for (const endpoint of endpoints) {
    try {
      const response = await makeRequest(endpoint.url, endpoint.method)
      console.log(`✅ ${endpoint.name}: ${response.statusCode} ${response.statusMessage}`)
    } catch (error) {
      console.log(`❌ ${endpoint.name}: ${error.message}`)
    }
  }
}

function makeRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method }, (res) => {
      resolve({
        statusCode: res.statusCode,
        statusMessage: res.statusMessage,
        headers: res.headers
      })
    })

    req.on('error', reject)
    req.setTimeout(5000, () => reject(new Error('Timeout')))
    req.end()
  })
}

// Test database connectivity (placeholder)
function testDatabaseConnection() {
  console.log('\n🗄️  Database Connection Test')
  console.log('⚠️  Manual check required: Verify Supabase connection in the web app')
  console.log('   1. Go to Settings → Broker tab')
  console.log('   2. Try adding a broker connection')
  console.log('   3. Check browser console for database errors')
}

// Test OAuth flow (instructions)
function testOAuthFlow() {
  console.log('\n🔐 OAuth Flow Test Instructions')
  console.log('1. Start the development server: pnpm dev')
  console.log('2. Go to http://localhost:3000/settings')
  console.log('3. Click "Add Connection" in the Broker tab')
  console.log('4. Enter valid Upstox credentials')
  console.log('5. Click "Add Connection"')
  console.log('6. Complete the OAuth flow in the popup')
  console.log('7. Check if tokens are saved successfully')
}

// Main test runner
async function runTests() {
  console.log('🚀 Next-Algo Broker Connection Test Suite\n')
  console.log('=' .repeat(50))

  try {
    await testUpstoxAPI()
    testDatabaseConnection()
    testOAuthFlow()

    console.log('\n' + '=' .repeat(50))
    console.log('✅ Test suite completed!')
    console.log('\n📝 Next steps:')
    console.log('1. Set up your Upstox API credentials')
    console.log('2. Run the database schema: database/schema.sql')
    console.log('3. Test the OAuth flow in the browser')
    console.log('4. Check the browser console for detailed logs')

  } catch (error) {
    console.error('❌ Test suite failed:', error.message)
    process.exit(1)
  }
}

// Run tests if called directly
if (require.main === module) {
  runTests()
}

module.exports = { runTests, testUpstoxAPI }