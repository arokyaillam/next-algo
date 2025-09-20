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
- Lucide React (Icons)

**Development Dependencies**:
- Turbo 2.5.5
- TypeScript 5.9.2
- ESLint
- Prettier

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
  - `/app`: Next.js app router pages
  - `/components`: React components including login form
  - `/utils`: Utility functions including Supabase client/server
  - `/hooks`: Custom React hooks

## Future Implementation Plans
Based on the user-applied rules, the following features are planned but not yet implemented:
- **Package Manager**: Migration to Bun
- **Server and API**: Elysia with CORS and Swagger middleware
- **Database**: TimescaleDB and Redis with ORM
- **Security**: Jose and bcrypt
- **Broker SDK**: Upstox integration
- **State Management**: Zustand
- **Query Management**: React Query
- **Containerization**: Docker