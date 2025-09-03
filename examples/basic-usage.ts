/**
 * Basic usage example for next-l402
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  l402,
  createRouteMatcher,
  createLightningClient,
  createExpirationCaveat,
  createPathCaveat,
} from '../src';

// 1. Create a Lightning client
const lightning = createLightningClient({
  // Configure with environment variables or direct values
  lndHost: process.env.LND_HOST,
  macaroon: process.env.LND_MACAROON,
  cert: process.env.LND_CERT,
});

// 2. Define which routes to protect
const matcher = createRouteMatcher([
  '/api/premium/*', // Protect all premium API routes
  '/content/paid/*', // Protect paid content routes
]);

// 3. Create middleware with caveats
export default l402({
  lightning,
  matcher,
  priceSats: 100, // 100 satoshis per request
  caveats: [
    createExpirationCaveat(3600), // Valid for 1 hour
    createPathCaveat('/api/premium/*'), // Restrict to premium API routes
  ],
});

// 4. Export Next.js middleware config
export const config = {
  matcher: ['/api/premium/:path*', '/content/paid/:path*'],
};
