import { NextRequest } from 'next/server';
import {
  createExpirationCaveat,
  createPathCaveat,
  createMethodCaveat,
  createIpCaveat,
  createOriginCaveat,
  validateCaveats,
} from './caveats';

// Mock NextRequest
const createMockRequest = (options: {
  path?: string;
  method?: string;
  headers?: Record<string, string>;
}) => {
  return {
    nextUrl: { pathname: options.path || '/' },
    method: options.method || 'GET',
    headers: {
      get: (name: string) => options.headers?.[name.toLowerCase()] || null,
    },
  } as unknown as NextRequest;
};

describe('Caveats', () => {
  test('Expiration caveat should validate based on time', () => {
    const caveat = createExpirationCaveat(10); // Valid for 10 seconds
    const req = createMockRequest({});

    expect(validateCaveats(req, [caveat])).toBe(true);

    // Mock future time (11 seconds later)
    const originalNow = Date.now;
    Date.now = jest.fn(() => originalNow() + 11000);

    expect(validateCaveats(req, [caveat])).toBe(false);

    // Restore original Date.now
    Date.now = originalNow;
  });

  test('Path caveat should match correct paths', () => {
    const caveat = createPathCaveat('/api/protected/*');

    const validReq = createMockRequest({ path: '/api/protected/data' });
    const invalidReq = createMockRequest({ path: '/public/data' });

    expect(validateCaveats(validReq, [caveat])).toBe(true);
    expect(validateCaveats(invalidReq, [caveat])).toBe(false);
  });

  test('Method caveat should validate HTTP methods', () => {
    const caveat = createMethodCaveat(['GET', 'POST']);

    const validReq1 = createMockRequest({ method: 'GET' });
    const validReq2 = createMockRequest({ method: 'POST' });
    const invalidReq = createMockRequest({ method: 'DELETE' });

    expect(validateCaveats(validReq1, [caveat])).toBe(true);
    expect(validateCaveats(validReq2, [caveat])).toBe(true);
    expect(validateCaveats(invalidReq, [caveat])).toBe(false);
  });

  test('IP caveat should validate client IP', () => {
    const caveat = createIpCaveat('192.168.1.1');

    const validReq = createMockRequest({
      headers: { 'x-forwarded-for': '192.168.1.1' },
    });
    const invalidReq = createMockRequest({
      headers: { 'x-forwarded-for': '10.0.0.1' },
    });

    expect(validateCaveats(validReq, [caveat])).toBe(true);
    expect(validateCaveats(invalidReq, [caveat])).toBe(false);
  });

  test('Origin caveat should validate request origin', () => {
    const caveat = createOriginCaveat('https://example.com');

    const validReq = createMockRequest({
      headers: { origin: 'https://example.com' },
    });
    const invalidReq = createMockRequest({
      headers: { origin: 'https://malicious-site.com' },
    });

    expect(validateCaveats(validReq, [caveat])).toBe(true);
    expect(validateCaveats(invalidReq, [caveat])).toBe(false);
  });

  test('Multiple caveats should all validate', () => {
    const caveats = [
      createPathCaveat('/api/protected/*'),
      createMethodCaveat('GET'),
      createOriginCaveat('https://example.com'),
    ];

    const validReq = createMockRequest({
      path: '/api/protected/data',
      method: 'GET',
      headers: { origin: 'https://example.com' },
    });

    const invalidReq = createMockRequest({
      path: '/api/protected/data',
      method: 'POST', // Wrong method
      headers: { origin: 'https://example.com' },
    });

    expect(validateCaveats(validReq, caveats)).toBe(true);
    expect(validateCaveats(invalidReq, caveats)).toBe(false);
  });
});
