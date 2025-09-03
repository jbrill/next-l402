# Next-L402

A complete implementation of the Lightning Network HTTP 402 Payment Required protocol for Next.js applications. This package provides middleware and utilities to protect routes with Lightning Network micropayments.

[![npm version](https://img.shields.io/npm/v/next-l402.svg)](https://www.npmjs.com/package/next-l402)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **Middleware Protection**: Intercepts requests and handles the L402 authentication flow
- ⚡ **Lightning Network Integration**: Connect to your Lightning node using REST API
- 🔑 **Macaroon Caveats**: Support for time-based, path-based, and other access restrictions
- 🚀 **Next.js Integration**: Seamless integration with Next.js API routes and middleware
- 🧩 **Flexible API**: Multiple ways to implement authentication in your application

## Installation

```bash
npm install next-l402
# or
yarn add next-l402
# or
pnpm add next-l402
```

## Requirements

- Next.js 13.0+ (works with both App Router and Pages Router)
- Node.js 20+
- Lightning Network node (LND, Core Lightning, etc.)

## Configuration

Create a `.env.local` file with your Lightning Network node credentials:

```env
# LND REST API Configuration
LND_REST_HOST=https://your-lnd-rest:8080
LND_MACAROON=your-admin-macaroon-in-hex

# L402 Configuration
L402_SECRET_KEY=your-32-byte-secret-key-in-hex
L402_LOCATION=https://your-domain.com
```

## Basic Usage

### Middleware Protection

```typescript
// middleware.ts
import { l402, createRouteMatcher, createRestLightningClient } from 'next-l402';

export default l402({
  lightning: createRestLightningClient(),
  matcher: createRouteMatcher(['/api/protected/*']),
  priceSats: 100, // 100 satoshis per request
});

export const config = {
  matcher: ['/api/protected/:path*'],
};
```

### API Route Protection

```typescript
// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { l402Server } from 'next-l402';

export async function GET(req: NextRequest) {
  const auth = l402Server()(req);

  // Protect this route with L402
  const challengeResponse = await auth.protect();
  if (challengeResponse) {
    return challengeResponse;
  }

  // Route is authenticated, serve protected content
  return NextResponse.json({
    message: 'This is protected content',
    authenticated: true,
  });
}
```

### Using Higher-Order Function

```typescript
// app/api/premium/data/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withL402 } from 'next-l402';

export const GET = withL402(async (req: NextRequest) => {
  // This code only runs for authenticated requests
  return NextResponse.json({
    premium: true,
    data: 'Exclusive content',
  });
});
```

## Client Implementation

To handle L402 authentication on the client side:

```typescript
async function fetchProtectedData() {
  const response = await fetch('/api/protected/data');

  if (response.status === 402) {
    // Payment required
    const wwwAuthenticate = response.headers.get('WWW-Authenticate');
    const invoiceMatch = wwwAuthenticate.match(/invoice="([^"]*)"/);
    const paymentHashMatch = wwwAuthenticate.match(/paymentHash="([^"]*)"/);

    if (invoiceMatch && paymentHashMatch) {
      const invoice = invoiceMatch[1];
      const paymentHash = paymentHashMatch[1];

      // Show invoice to user and prompt payment
      // After payment, get preimage and construct L402 token
      const macaroon = ''; // Extract from wwwAuthenticate
      const preimage = ''; // Get from your lightning wallet

      // Try again with the L402 token
      const authenticatedResponse = await fetch('/api/protected/data', {
        headers: {
          Authorization: `L402 ${macaroon}:${preimage}`,
        },
      });

      return authenticatedResponse.json();
    }
  } else if (response.ok) {
    // Already authenticated
    return response.json();
  }
}
```

## Advanced Configuration

### Custom Caveats

```typescript
import {
  createExpirationCaveat,
  createPathCaveat,
  createMethodCaveat,
} from 'next-l402';

const middleware = l402({
  lightning: createRestLightningClient(),
  matcher: createRouteMatcher(['/api/protected/*']),
  priceSats: 100,
  caveats: [
    createExpirationCaveat(3600), // Valid for 1 hour
    createPathCaveat('/api/protected/resource'), // Restrict to specific path
    createMethodCaveat(['GET', 'POST']), // Allow only GET and POST
  ],
});
```

## API Reference

### Core Functions

- `l402(options)` - Creates L402 middleware for route protection
- `withL402(handler, options)` - Higher-order function to wrap API routes
- `l402Server()` - Server-side utilities for manual L402 handling
- `createRestLightningClient(config)` - Creates REST API client for Lightning payments
- `createMockLightningClient()` - Creates mock client for testing
- `createRouteMatcher(patterns)` - Utility to match protected routes

### Caveat Functions

- `createExpirationCaveat(seconds)` - Time-based access restrictions
- `createPathCaveat(path)` - Path-specific access restrictions
- `createMethodCaveat(methods)` - HTTP method restrictions
- `createIpCaveat(ips)` - IP address restrictions
- `createOriginCaveat(origins)` - Origin-based restrictions
- `createCustomCaveat(identifier, value, validator)` - Custom restrictions

## Testing

The library includes both unit and integration tests. To run tests:

```bash
npm test
```

## Examples

Check out the `/examples` directory for more usage patterns:
- Basic middleware setup
- API route protection
- Custom Lightning clients
- Tiered pricing models
- React component integration

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues and questions, please use the [GitHub issue tracker](https://github.com/jbrill/next-l402/issues).

## License

MIT
