import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { L402ServerOptions, L402Auth, NextHandler, L402Token } from '../types';
import { extractTokenFromHeader, validateToken } from '../token-utils';
import { createChallengeResponse } from '../challenge';
import { createMockLightningClient } from '../lightning/mock';

// Default price in satoshis for L402 authentication
const DEFAULT_PRICE_SATS = 100;

/**
 * Creates an L402 auth object for server-side API routes
 */
export const l402Server = (options: L402ServerOptions = {}) => {
  const config = {
    lightning: options.lightning || createMockLightningClient(),
    priceSats: options.priceSats || DEFAULT_PRICE_SATS,
    caveats: options.caveats || [],
    secretKey:
      options.secretKey || Buffer.from(uuidv4().replace(/-/g, ''), 'hex'),
    location: options.location,
  };

  return (req: any): L402Auth => {
    let tokenValidated = false;
    let token: L402Token | null = null;

    return {
      isAuthenticated: (): boolean => tokenValidated,

      getToken: (): L402Token | null => {
        if (!token) {
          token = extractTokenFromHeader(req);
        }
        return token;
      },

      protect: async (): Promise<NextResponse | void> => {
        token = extractTokenFromHeader(req);

        if (token) {
          tokenValidated = await validateToken(
            req,
            token,
            config.secretKey,
            config.caveats
          );
          if (tokenValidated) {
            return;
          }
        }

        const challenge = await createChallengeResponse(config);

        return new NextResponse('Payment Required', {
          status: 402,
          headers: {
            'WWW-Authenticate': challenge.wwwAuthenticate,
            'Content-Type': 'text/plain',
          },
        });
      },
    };
  };
};

/**
 * Higher-order function to wrap a Next.js API route handler with L402 authentication
 */
export const withL402 = (
  handler: NextHandler,
  options: L402ServerOptions = {}
): NextHandler => {
  const auth = l402Server(options);

  return async (req: any, ...args: any[]) => {
    const l402Auth = auth(req);
    const challengeResponse = await l402Auth.protect();

    if (challengeResponse) {
      return challengeResponse;
    }

    return handler(req, ...args);
  };
};
