import { NextRequest, NextResponse } from 'next/server';
import {
  createWwwAuthenticateHeader,
  createMacaroonIdentifier,
} from './token-utils';
import { L402ChallengeOptions, L402Challenge, Caveat } from './types';
import { l402Cache, L402CachedChallenge, L402Session } from './cache';
import { MacaroonsBuilder } from 'macaroons.js';
import { v4 as uuidv4 } from 'uuid';

// Default configuration values
const DEFAULT_PRICE_SATS = 100;
const DEFAULT_TOKEN_VALIDITY_SECONDS = 24 * 60 * 60; // 24 hours

/**
 * Creates a challenge response for L402 authentication
 */
export const createChallengeResponse = async (
  options: L402ChallengeOptions
): Promise<L402Challenge> => {
  // Create an invoice for the payment
  const invoice = await options.lightning.createInvoice(
    options.priceSats || DEFAULT_PRICE_SATS
  );

  // Generate a secret key if not provided
  const secretKey =
    options.secretKey || Buffer.from(uuidv4().replace(/-/g, ''), 'hex');

  // Create the macaroon identifier with payment hash
  const identifier = createMacaroonIdentifier(invoice.paymentHash);

  // Create the macaroon
  const location = options.location || 'https://localhost:3000';
  // Create macaroon with builder pattern
  const paymentHashBase64 = Buffer.from(invoice.paymentHash, 'hex').toString(
    'base64'
  );
  const expirationTime = Date.now() + DEFAULT_TOKEN_VALIDITY_SECONDS * 1000;

  let macaroonBuilder = new MacaroonsBuilder(
    location,
    secretKey.toString('hex'),
    identifier.toString('base64')
  );

  // Add required caveats
  macaroonBuilder.add_first_party_caveat(`payment_hash = ${paymentHashBase64}`);
  macaroonBuilder.add_first_party_caveat(`expiration = ${expirationTime}`);

  // Add any custom caveats
  if (options.caveats) {
    options.caveats.forEach((caveat: Caveat) => {
      macaroonBuilder.add_first_party_caveat(
        `${caveat.type} = ${caveat.value}`
      );
    });
  }

  // Get the macaroon and serialize it
  const macaroon = macaroonBuilder.getMacaroon();
  const serializedMacaroon = macaroon.serialize();

  // Store the session in cache for later validation
  const session: L402Session = {
    macaroon: serializedMacaroon,
    invoice: {
      paymentHash: invoice.paymentHash,
      paymentRequest: invoice.paymentRequest,
      amountSats: invoice.amountSats,
    },
    secretKey,
    createdAt: Date.now(),
  };

  l402Cache.setSession(invoice.paymentHash, session);

  // Create the WWW-Authenticate header with the macaroon
  const wwwAuthenticate = createWwwAuthenticateHeader(
    serializedMacaroon,
    invoice.paymentRequest
  );

  return {
    invoice,
    wwwAuthenticate,
    macaroon: serializedMacaroon,
  };
};

/**
 * Creates an L402 challenge endpoint that handles Lightning invoice generation
 */
export const createChallengeHandler = (options: L402ChallengeOptions) => {
  return async (req: NextRequest): Promise<NextResponse> => {
    try {
      const challenge = await createChallengeResponse(options);

      // Cache the challenge for the target route
      const targetRoute =
        req.nextUrl.searchParams.get('route') || '/api/protected/default';
      const cachedChallenge: L402CachedChallenge = {
        wwwAuthenticate: challenge.wwwAuthenticate,
        paymentHash: challenge.invoice.paymentHash,
        createdAt: Date.now(),
      };

      l402Cache.setCachedChallenge(targetRoute, cachedChallenge);

      return new NextResponse('Payment Required', {
        status: 402,
        headers: {
          'WWW-Authenticate': challenge.wwwAuthenticate,
          'Content-Type': 'text/plain',
        },
      });
    } catch {
      // Error handling for challenge creation failures
      return new NextResponse('Internal Server Error', {
        status: 500,
        headers: { 'Content-Type': 'text/plain' },
      });
    }
  };
};

/**
 * Payment completion handler - call this after Lightning payment is verified
 */
export const markPaymentComplete = (_paymentHash: string): void => {
  // This would typically update a cache or database to mark the payment as completed
  // For now, the cached session creation in createChallengeResponse handles this
  // Future: implement payment completion logic here
};
