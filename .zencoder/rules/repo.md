---
description: Repository Information Overview
alwaysApply: true
---

# Next-Algo Trading Platform Information

## Summary
A monorepo-based algorithmic trading platform built with Next.js and shadcn/ui components. The project uses a modern React stack with Supabase for authentication and follows a workspace-based architecture.

## Structure
- **apps/web**: Main Next.js web application
- **packages/ui**: Shared UI components using shadcn/ui
- **packages/market-data**: Market data integration with Upstox
- **packages/eslint-config**: Shared ESLint configurations
- **packages/typescript-config**: Shared TypeScript configurations

## Language & Runtime
**Language**: TypeScript/JavaScript
**Version**: TypeScript 5.9.2
**Runtime**: Node.js >=20
**Build System**: Turbo
**Package Manager**: pnpm 10.4.1

## Dependencies
**Main Dependencies**:
- Next.js 15.4.5
- React 19.1.1
- Supabase (Authentication)
- shadcn/ui components (Radix UI)
- Tailwind CSS 4.1.11
- Upstox JS SDK 2.19.0
- Zustand 5.0.8 (State Management)
- React Query 5.89.0
- Lucide React (Icons)
- date-fns 4.1.0
- lodash-es 4.17.21
- zod 3.25.76

**Development Dependencies**:
- Turbo 2.5.5
- TypeScript 5.9.2
- ESLint
- Prettier 3.6.2

## Build & Installation
```bash
# Install dependencies
pnpm install

# Development
pnpm dev

# Build
pnpm build

# Start production server
pnpm start
```

## Frontend
**Framework**: Next.js with App Router
**UI Components**: shadcn/ui (Radix UI)
**Styling**: Tailwind CSS
**Authentication**: Supabase

## Project Structure Details
- **Web App Structure**:
  - `/app`: Next.js app router pages including auth, dashboard, login, settings
  - `/components`: React components including login form
  - `/utils`: Utility functions including Supabase client/server and Upstox integration
  - `/hooks`: Custom React hooks

## Market Data Package
**Structure**:
- `/src/hooks`: React hooks for data fetching and state management
- `/src/services`: Service layer for API interactions (Upstox)
- `/src/stores`: Zustand state management stores
- `/src/types`: TypeScript type definitions for market data
- `/src/utils`: Utility functions

**Features**:
- Real-time market data via WebSockets
- Option chain analysis with Greeks calculations
- Portfolio tracking and order management
- Historical data for technical analysis
- ATM strike identification and PCR calculations

**Integration**:
- Zustand store for global state management
- React Query for server state and caching
- Custom React hooks for component integration
- WebSocket event system for real-time updates

## Broker Integration
**SDK**: Upstox JS SDK
**Authentication**: OAuth flow with callback handling
**Data Storage**: Encrypted tokens in Supabase database
**Market Data**: Real-time and historical market data access
**WebSockets**: Dual connections for market and portfolio data
**Subscription Management**: Instrument-specific data streams

## State Management
**Library**: Zustand with selector middleware
**Store Structure**:
- Connection state (broker, WebSocket)
- Market data (prices, option chains)
- Subscription management
- UI state (loading, errors)

## Data Fetching
**Library**: React Query (TanStack Query)
**Features**:
- Automatic refetching and caching
- Optimistic updates
- Mutation handling
- Background fetching

## Future Implementation Plans
Based on the repository information, the following features are planned but not yet implemented:
- **Package Manager**: Migration to Bun
- **Server and API**: Elysia with CORS and Swagger middleware
- **Database**: TimescaleDB and Redis with ORM
- **Security**: Jose and bcrypt
- **Containerization**: Docker