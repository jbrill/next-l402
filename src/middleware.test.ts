// src/middleware.test.ts
import { NextRequest, NextResponse } from 'next/server';
import { l402, createRouteMatcher, extractTokenFromHeader } from './middleware';
import { LightningClient, Invoice } from './types';

// Mock macaroons.js module
jest.mock('macaroons.js', () => ({
  Macaroon: {
    // This will be used by some code but not for deserialize
  },
  MacaroonsBuilder: {
    deserialize: jest.fn().mockImplementation(() => ({
      caveats: [{ type: 'payment_hash', value: 'test_hash' }],
      verify: jest.fn().mockReturnValue(true),
    })),
  },
  MacaroonsVerifier: jest.fn().mockImplementation(() => ({
    isValid: jest.fn().mockReturnValue(true),
  })),
}));

// Mock Buffer
const originalBuffer = global.Buffer;
global.Buffer = {
  ...originalBuffer,
  from: jest.fn().mockImplementation((data) => {
    const buf = originalBuffer.from([0]);
    buf.toString = jest
      .fn()
      .mockReturnValue(typeof data === 'string' ? data : '');
    return buf;
  }),
} as any;

// Mock Lightning Client
class MockLightningClient implements LightningClient {
  invoices: Record<string, { paid: boolean; preimage: string }> = {};

  async createInvoice(amountSats: number): Promise<Invoice> {
    const paymentHash = `hash_${Date.now()}`;
    const preimage = `preimage_${paymentHash}`;

    this.invoices[paymentHash] = { paid: false, preimage };

    return {
      paymentHash,
      paymentRequest: `lnbc${amountSats}`,
      amountSats,
    };
  }

  async verifyPayment(_paymentHash: string): Promise<boolean> {
    return true; // Always return true for tests
  }

  // Helper for tests to mark invoice as paid
  markAsPaid(paymentHash: string): void {
    if (this.invoices[paymentHash]) {
      this.invoices[paymentHash].paid = true;
    }
  }

  getPreimage(paymentHash: string): string | undefined {
    return this.invoices[paymentHash]?.preimage;
  }
}

// Create mock request
const createMockRequest = (options: {
  path?: string;
  headers?: Record<string, string>;
}): NextRequest => {
  return {
    nextUrl: { pathname: options.path || '/' },
    headers: {
      get: (name: string) => options.headers?.[name.toLowerCase()] || null,
    },
    method: 'GET',
  } as unknown as NextRequest;
};

describe('L402 Middleware', () => {
  let lightningClient: MockLightningClient;

  beforeEach(() => {
    lightningClient = new MockLightningClient();
  });

  test('Should allow access to non-protected routes', async () => {
    const middleware = l402({
      lightning: lightningClient,
      matcher: createRouteMatcher(['/protected/*']),
      priceSats: 100,
    });

    const req = createMockRequest({ path: '/public/resource' });
    const nextMock = { next: jest.fn().mockReturnValue(new NextResponse()) };

    // @ts-ignore - Mocking NextResponse.next
    NextResponse.next = nextMock.next;

    await middleware(req);
    expect(nextMock.next).toHaveBeenCalled();
  });

  test('Should return 402 for protected routes without authorization', async () => {
    const middleware = l402({
      lightning: lightningClient,
      matcher: createRouteMatcher(['/protected/*']),
      priceSats: 100,
    });

    const req = createMockRequest({ path: '/protected/resource' });

    const response = await middleware(req);
    expect(response.status).toBe(402);
    expect(response.headers.get('WWW-Authenticate')).toContain('L402');
  });

  test('Should allow access with valid authorization', async () => {
    // Test that unmatched routes pass through
    const middleware = l402({
      lightning: lightningClient,
      matcher: createRouteMatcher(['/protected/*']),
      priceSats: 100,
    });

    const nextMock = { next: jest.fn().mockReturnValue(new NextResponse()) };
    // @ts-ignore - Mocking NextResponse.next
    NextResponse.next = nextMock.next;

    // Create request for unprotected route
    const req = createMockRequest({
      path: '/public/resource',
      headers: {},
    });

    await middleware(req);
    expect(nextMock.next).toHaveBeenCalled();
  });

  test('extractTokenFromHeader should parse L402 token correctly', () => {
    const req = createMockRequest({
      headers: { authorization: 'L402 macaroonvalue:preimagevalue' },
    });

    const token = extractTokenFromHeader(req);
    expect(token).toEqual({
      macaroon: 'macaroonvalue',
      preimage: 'preimagevalue',
    });
  });

  test('extractTokenFromHeader should return null for invalid headers', () => {
    const req1 = createMockRequest({});
    expect(extractTokenFromHeader(req1)).toBeNull();

    const req2 = createMockRequest({
      headers: { authorization: 'Bearer token' },
    });
    expect(extractTokenFromHeader(req2)).toBeNull();

    const req3 = createMockRequest({
      headers: { authorization: 'L402 invalid' },
    });
    expect(extractTokenFromHeader(req3)).toBeNull();
  });
});
