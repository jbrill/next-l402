// examples/api-basic-example.ts
import { NextRequest, NextResponse } from 'next/server';
import { withL402, createLightningClient } from '../src';

/**
 * Example of a protected API endpoint using Next.js App Router
 * Save this as app/api/protected/basic/route.ts in your project
 */

// Create a lightning client with your node's configuration
const lightning = createLightningClient({
  // These would normally come from environment variables
  lndHost: process.env.LND_HOST,
  macaroon: process.env.LND_MACAROON,
  cert: process.env.LND_CERT,
});

// Handle GET request - protected with L402
export const GET = withL402(
  async (req: NextRequest) => {
    // This code only runs if payment is verified
    return NextResponse.json({
      message: "You've successfully accessed protected content!",
      timestamp: new Date().toISOString(),
      path: req.nextUrl.pathname,
    });
  },
  {
    lightning,
    priceSats: 100, // 100 satoshis to access
  }
);
