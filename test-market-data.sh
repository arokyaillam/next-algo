#!/bin/bash

# Market Data Test Script
# This script helps test the market data functionality

echo "🚀 Starting Market Data Test Environment"
echo "========================================"

# Check if we're in the right directory
if [ ! -f "apps/web/package.json" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Install dependencies if needed
echo "📦 Checking dependencies..."
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    pnpm install
fi

# Build check
echo "🔍 Running TypeScript check..."
cd apps/web
if ! npx tsc --noEmit; then
    echo "❌ TypeScript errors found. Please fix them before proceeding."
    exit 1
fi

echo "✅ TypeScript check passed!"

# Start development server
echo "🌐 Starting development server..."
echo ""
echo "📋 Test Instructions:"
echo "1. Open your browser to http://localhost:3000"
echo "2. Log in to your account"
echo "3. Navigate to 'Test Market Data' in the sidebar"
echo "4. Click 'Test Connection' to start mock data streaming"
echo "5. Explore different tabs to test functionality"
echo ""
echo "🎯 Test Features:"
echo "- Live Nifty data updates"
echo "- Option chain generation"
echo "- Market status simulation"
echo "- Market event simulation (spike, drop, volatility)"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"

# Start the development server
pnpm dev
