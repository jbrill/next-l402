import { NextRequest, NextResponse } from 'next/server';
import { l402Server, withL402 } from '../../../../src/server';

/**
 * Protected GET endpoint that requires L402 authentication
 * Method 1: Using the withL402 wrapper
 */
export const GET = withL402(async (req: NextRequest) => {
  // This code only runs if the L402 authentication is successful
  return NextResponse.json({
    message: 'This is a protected API route',
    authenticated: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Protected POST endpoint that requires L402 authentication
 * Method 2: Using the auth object directly
 */
export async function POST(req: NextRequest) {
  // Create an auth object
  const auth = l402Server()(req);

  // Protect the route
  const challengeResponse = await auth.protect();

  // If a challenge response is returned, return it
  if (challengeResponse) {
    return challengeResponse;
  }

  // Authentication was successful, handle the request
  const body = await req.json().catch(() => ({}));

  return NextResponse.json({
    message: 'POST request received',
    authenticated: true,
    received: body,
    timestamp: new Date().toISOString(),
  });
}
