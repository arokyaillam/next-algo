# Market Data Test Page

This test page provides a comprehensive interface for testing live market data functionality in the Next.js application. It automatically detects and uses real broker connections when available, falling back to mock data for testing when no broker is connected.

## Data Source Detection

The test page intelligently switches between:
- **Real Broker Data**: When you have an active, verified broker connection (Upstox, Zerodha, etc.)
- **Mock Data**: When no broker connection is available or for testing purposes

## Features

### 1. Overview Tab
- **Connection Status**: Shows current connection state (Connected/Disconnected/Connecting/Error)
- **Market Status**: Displays whether the market is open or closed
- **Data Points**: Shows the number of active subscribers to the mock data stream

### 2. Nifty Data Tab
- **Live Nifty 50 Data**: Real-time mock data including:
  - Last Traded Price (LTP) with change indicators
  - High and Low prices
  - Volume information
- **Manual Refresh**: Button to manually fetch new data
- **Disconnect**: Button to stop the live data stream

### 3. Option Chain Tab
- **Expiry Selection**: Dropdown to select different expiry dates
- **Option Chain Table**: Shows Call and Put options with:
  - Strike prices
  - LTP (Last Traded Price)
  - Volume data
- **Dynamic Updates**: Option chain updates when expiry is changed

### 4. Trading Session Tab
- **Market Status**: Current market open/closed status
- **Session Information**: Details about current trading session
- **Timing Information**: Next open/close times

### 5. Data Source & Controls Tab
- **Data Source Information**: Shows whether using real broker data or mock data
- **Connection Details**: Displays broker name and connection status for real data
- **Dynamic Controls**: Different controls based on data source:

  **For Real Broker Data**:
  - **Refresh Real Data**: Manually fetch latest data from broker
  - **Resubscribe**: Resubscribe to live data streams

  **For Mock Data**:
  - **Simulate Spike**: Triggers a sudden price increase
  - **Simulate Drop**: Triggers a sudden price decrease
  - **High Volatility**: Increases price fluctuation for 10 seconds

## How to Use

### Starting the Test
1. Navigate to `/test-market-data` in your browser
2. Ensure you're logged in (required for testing)
3. The page will automatically detect if you have an active broker connection
4. Click the "Test Connection" button to start data streaming (real or mock)

### Testing Live Data
1. Once connected, the data will update in real-time:
   - **Real Data**: Updates based on actual market movements
   - **Mock Data**: Updates every second with simulated movements
2. Watch the price changes and volume updates
3. Use the "Data Source & Controls" tab for testing:
   - **Real Data**: Refresh and resubscribe to data streams
   - **Mock Data**: Simulate market events and volatility
4. Observe data source indicators in the header badges

### Testing Option Chain
1. Go to the "Option Chain" tab
2. Select an expiry date from the dropdown
3. View the generated option chain data
4. Strike prices are centered around the current Nifty price

### Simulating Market Events
1. Go to the "Mock Controls" tab
2. Click any of the simulation buttons:
   - **Spike**: Increases price by 50-150 points
   - **Drop**: Decreases price by 50-150 points
   - **Volatility**: Increases price fluctuation temporarily
3. Watch the effects in the "Nifty Data" tab

## Technical Details

### Mock Data Generator
- Generates realistic market data using random walk with mean reversion
- Base Nifty price: ₹24,500
- Price variation: ±0.2% per update
- Updates every 1000ms (1 second)
- Automatic bounds checking (±5% from base price)

### Option Chain Generation
- Strikes generated from ATM-500 to ATM+500 in steps of 50
- Call/Put LTP calculated based on intrinsic + time value
- Volume and Open Interest randomly generated
- Realistic pricing based on distance from ATM

### Market Status
- Simulates Indian market hours (9:15 AM - 3:30 PM IST)
- Dynamic status updates based on current time
- Provides next open/close timing information

## Navigation

The test page is accessible through:
- **Sidebar Navigation**: Look for "Test Market Data" under the "Testing" section
- **Direct URL**: `/test-market-data`

## Error Handling

- Connection errors are displayed with clear error messages
- Failed operations show appropriate feedback
- Clear error button to dismiss error messages
- Automatic reconnection capabilities

## Performance

- Efficient data streaming with subscriber pattern
- Minimal memory usage with bounded data storage
- Smooth real-time updates without blocking UI
- Proper cleanup on component unmount

This test page serves as a comprehensive testing ground for market data functionality and can be used to validate the behavior of live data streaming, option chain generation, and market status tracking.
