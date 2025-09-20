# Next-Algo Trading Platform

A modern algorithmic trading platform built with Next.js, Supabase, and TypeScript.

## Features

- 🔐 **Authentication**: Supabase-powered user authentication
- 📊 **Broker Integration**: Connect with Upstox, Zerodha, and Angel One
- 🎨 **Modern UI**: Built with shadcn/ui components and Tailwind CSS
- 🔒 **Security**: Encrypted token storage and secure API handling

## Setup Instructions

### 1. Database Setup

First, you need to set up the database schema in Supabase:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Run the SQL script from `database/schema.sql`

This will create the necessary tables:
- `profiles` - User profiles with broker connection status
- `broker_connections` - Encrypted broker API credentials and tokens

### 2. Environment Variables

Make sure your `.env.local` file contains the correct Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Upstox Setup

To connect with Upstox:

1. **Register your application** at [Upstox Developer Portal](https://upstox.com/developer/api)
2. **Set redirect URI** to: `http://localhost:3000/auth/upstox/callback` (for development)
3. **Get your API credentials** (API Key and API Secret)
4. **Add broker connection** in the settings page with your credentials

### 4. Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Broker Connection Flow

1. **Add Connection**: Go to Settings → Broker tab and add your broker credentials
2. **OAuth Flow**: Click "Connect" to start the OAuth flow with your broker
3. **Callback**: You'll be redirected back to complete the authentication
4. **Token Storage**: Access and refresh tokens are securely stored in the database
5. **Auto-refresh**: Tokens are automatically refreshed when they expire

## Project Structure

```
apps/web/
├── app/                    # Next.js app router
│   ├── auth/upstox/        # OAuth callback handling
│   ├── dashboard/          # Main dashboard
│   ├── login/             # Authentication pages
│   └── settings/          # Settings with broker connections
├── components/            # React components
├── hooks/                 # Custom React hooks
├── utils/                 # Utility functions
│   ├── supabase/          # Database client
│   └── upstox/           # Broker API integration
└── lib/                   # Library functions

packages/
├── ui/                    # Shared UI components
└── eslint-config/         # ESLint configuration
```

## API Endpoints

### Upstox Integration

- `POST /v2/login/authorization/token` - Exchange auth code for tokens
- `GET /v2/user/profile` - Get user profile
- `GET /v2/market-quote/ltp` - Get market data

### Database Tables

#### profiles
```sql
- id: UUID (Primary Key, references auth.users)
- broker_connected: BOOLEAN
- broker_connection_status: TEXT
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

#### broker_connections
```sql
- id: UUID (Primary Key)
- user_id: UUID (Foreign Key to profiles)
- broker_name: TEXT (upstox | zerodha | angel)
- broker_user_id: TEXT
- api_key: TEXT
- api_secret_encrypted: TEXT
- access_token_encrypted: TEXT
- refresh_token_encrypted: TEXT
- is_active: BOOLEAN
- is_verified: BOOLEAN
- token_expires_at: TIMESTAMP
- last_verified_at: TIMESTAMP
- created_at: TIMESTAMP
- updated_at: TIMESTAMP
```

## Security Notes

- **Encryption**: Sensitive data (API secrets, tokens) are base64 encoded in the database
- **Production**: Implement proper encryption (AES-256) for production use
- **Row Level Security**: Database policies ensure users can only access their own data
- **State Validation**: OAuth state parameter prevents CSRF attacks

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your Upstox API credentials and redirect URI
2. **Invalid Auth Code**: Authorization codes expire quickly - complete OAuth flow promptly
3. **Database Connection**: Ensure Supabase credentials are correct
4. **CORS Issues**: Make sure redirect URI is registered with your broker

### Debug Mode

Enable debug logging by checking the browser console for detailed error messages during the OAuth flow.

## Future Plans

- [ ] **Bun Migration**: Switch from pnpm to Bun for faster package management
- [ ] **Elysia Backend**: Add dedicated API server with Elysia.js
- [ ] **Database**: Integrate TimescaleDB and Redis
- [ ] **Security**: Add Jose for JWT handling and bcrypt for password hashing
- [ ] **State Management**: Implement Zustand for client-side state
- [ ] **Query Management**: Add React Query for API state management
- [ ] **Containerization**: Docker setup for deployment

## Contributing

1. Follow the existing code style and patterns
2. Add proper TypeScript types for new features
3. Update documentation for API changes
4. Test broker integrations thoroughly

## License

This project is licensed under the MIT License.