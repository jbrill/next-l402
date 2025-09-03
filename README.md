# Next-L402

A complete implementation of the Lightning Network HTTP 402 Payment Required protocol for Next.js applications. This package provides server utilities and authentication functions to protect API routes with Lightning Network micropayments.

[![npm version](https://img.shields.io/npm/v/next-l402.svg)](https://www.npmjs.com/package/next-l402)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **API Route Protection**: Secure your API endpoints with L402 authentication
- ⚡ **Lightning Network Integration**: Connect to your Lightning node using REST API
- 🔑 **Macaroon Caveats**: Support for time-based, path-based, and other access restrictions
- 🚀 **Next.js Integration**: Seamless integration with Next.js API routes
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

### Challenge Endpoint

First, create a challenge endpoint that generates Lightning invoices:

```typescript
// app/api/l402/challenge/route.ts
import { createChallengeHandler, createRestLightningClient } from 'next-l402';

const challengeHandler = createChallengeHandler({
  lightning: createRestLightningClient(),
  priceSats: 100,
  secretKey: Buffer.from(process.env.L402_SECRET_KEY!, 'hex'),
});

export const GET = challengeHandler;
```

### API Route Protection

```typescript
// app/api/protected/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { l402Server, createRestLightningClient } from 'next-l402';

export async function GET(req: NextRequest) {
  const auth = l402Server({
    lightning: createRestLightningClient(),
    priceSats: 100,
    secretKey: Buffer.from(process.env.L402_SECRET_KEY!, 'hex'),
  })(req);

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
import { withL402, createRestLightningClient } from 'next-l402';

export const GET = withL402(async (req: NextRequest) => {
  // This code only runs for authenticated requests
  return NextResponse.json({
    premium: true,
    data: 'Exclusive content',
  });
}, {
  lightning: createRestLightningClient(),
  priceSats: 50,
  secretKey: Buffer.from(process.env.L402_SECRET_KEY!, 'hex'),
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
    const invoiceMatch = wwwAuthenticate?.match(/invoice="([^"]*)"/);
    const macaroonMatch = wwwAuthenticate?.match(/macaroon="([^"]*)"/);

    if (invoiceMatch && macaroonMatch) {
      const invoice = invoiceMatch[1];
      const macaroon = macaroonMatch[1];

      // Show invoice to user and prompt payment
      // After payment, get preimage from your lightning wallet
      const preimage = ''; // Get from your lightning wallet after paying invoice

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
  l402Server,
  createRestLightningClient,
  createExpirationCaveat,
  createPathCaveat,
  createMethodCaveat,
} from 'next-l402';

export async function GET(req: NextRequest) {
  const auth = l402Server({
    lightning: createRestLightningClient(),
    priceSats: 100,
    secretKey: Buffer.from(process.env.L402_SECRET_KEY!, 'hex'),
    caveats: [
      createExpirationCaveat(3600), // Valid for 1 hour
      createPathCaveat('/api/protected/resource'), // Restrict to specific path
      createMethodCaveat(['GET', 'POST']), // Allow only GET and POST
    ],
  })(req);

  const challengeResponse = await auth.protect();
  if (challengeResponse) return challengeResponse;

  return NextResponse.json({ data: 'Protected content' });
}
```

## API Reference

### Core Functions

- `l402Server(options)` - Creates L402 authentication object for API routes
- `withL402(handler, options)` - Higher-order function to wrap API routes
- `createChallengeHandler(options)` - Creates challenge endpoint for Lightning invoices
- `createRestLightningClient(config)` - Creates REST API client for Lightning payments
- `createMockLightningClient()` - Creates mock client for testing
- `validateToken(req, token, secretKey, caveats)` - Validates L402 tokens
- `extractTokenFromHeader(req)` - Extracts tokens from Authorization header

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
