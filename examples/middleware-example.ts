// examples/middleware-example.ts
import { NextRequest, NextResponse } from 'next/server';
import {
  l402,
  createRouteMatcher,
  createLightningClient,
  createPathCaveat,
} from '../src';

/**
 * Example of using l402 middleware to protect multiple routes
 * Save as middleware.ts in your project root
 */

// Create a Lightning client
const lightning = createLightningClient();

// Define which routes should be protected
const protectedRoutes = [
  '/dashboard/(.*)', // All dashboard routes
  '/api/v1/(.*)', // All v1 API routes
  '/content/premium/(.*)', // Premium content
];

// Create route matcher
const matcher = createRouteMatcher(protectedRoutes);

// Create different price tiers based on path patterns
const getPriceForPath = (path: string): number => {
  if (path.startsWith('/dashboard')) {
    return 50; // 50 sats for dashboard access
  } else if (path.startsWith('/api/v1')) {
    return 10; // 10 sats per API call
  } else if (path.startsWith('/content/premium')) {
    return 500; // 500 sats for premium content
  }
  return 100; // Default price
};

// Create middleware with dynamic pricing
export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Skip non-protected routes
  if (!matcher(req)) {
    return NextResponse.next();
  }

  // Get appropriate price for this path
  const priceSats = getPriceForPath(path);

  // L402 middleware with path-specific pricing
  const l402Middleware = l402({
    lightning,
    matcher, // Use the matcher to check if route should be protected
    priceSats,
    caveats: [
      // Restrict token to this specific path pattern
      createPathCaveat(path),
    ],
  });

  return l402Middleware(req);
}

// Configure which paths the middleware runs on
export const config = {
  matcher: ['/dashboard/:path*', '/api/v1/:path*', '/content/premium/:path*'],
};
