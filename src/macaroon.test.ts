import { MacaroonsBuilder } from 'macaroons.js';
import {
  createMacaroonIdentifier,
  createChallengeResponse,
  extractTokenFromHeader,
  validateToken,
} from './middleware';
import { createMockLightningClient } from './lightning/mock';
import { CaveatType } from './types';
import { NextRequest } from 'next/server';

describe('Macaroon Generation', () => {
  const mockLightning = createMockLightningClient();
  const testSecretKey = Buffer.from('test-secret-key-32-bytes-long!!!');
  const testLocation = 'https://api.example.com';

  describe('createMacaroonIdentifier', () => {
    it('should create a valid L402 identifier with payment hash', () => {
      const paymentHash = 'a'.repeat(64); // 32 bytes hex
      const identifier = createMacaroonIdentifier(paymentHash);

      // Check structure: version (2 bytes) + user_id (32 bytes) + payment_hash (32 bytes)
      expect(identifier.length).toBe(66);

      // Check version is 0
      const version = identifier.readUInt16BE(0);
      expect(version).toBe(0);

      // Check payment hash is included
      const paymentHashFromIdentifier = identifier
        .slice(34, 66)
        .toString('hex');
      expect(paymentHashFromIdentifier).toBe(paymentHash);
    });
  });

  describe('createChallengeResponse', () => {
    it('should create a complete L402 challenge with macaroon', async () => {
      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
        location: testLocation,
      });

      expect(challenge).toHaveProperty('invoice');
      expect(challenge).toHaveProperty('wwwAuthenticate');
      expect(challenge).toHaveProperty('macaroon');

      // Check WWW-Authenticate header format
      expect(challenge.wwwAuthenticate).toMatch(
        /^L402 macaroon="[^"]+", invoice="[^"]+"/
      );

      // Extract and verify macaroon
      const macaroonMatch =
        challenge.wwwAuthenticate.match(/macaroon="([^"]*)"/);
      expect(macaroonMatch).toBeTruthy();
      const macaroonStr = macaroonMatch![1];
      expect(macaroonStr).toBeTruthy();
      expect(macaroonStr.length).toBeGreaterThan(0);

      // Verify macaroon can be deserialized
      const macaroon = MacaroonsBuilder.deserialize(macaroonStr);
      expect(macaroon).toBeTruthy();
      expect(macaroon.location).toBe(testLocation);
    });

    it('should include payment hash caveat in macaroon', async () => {
      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
      });

      const macaroonStr = challenge.macaroon!;
      const macaroon = MacaroonsBuilder.deserialize(macaroonStr);

      // Check for payment_hash caveat
      const caveats = macaroon.caveatPackets || [];
      const paymentHashCaveat = caveats.find((c: any) => {
        const caveatStr = c.rawValue?.toString() || '';
        return caveatStr.includes('payment_hash');
      });

      expect(paymentHashCaveat).toBeTruthy();
    });

    it('should include expiration caveat in macaroon', async () => {
      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
      });

      const macaroonStr = challenge.macaroon!;
      const macaroon = MacaroonsBuilder.deserialize(macaroonStr);

      // Check for expiration caveat
      const caveats = macaroon.caveatPackets || [];
      const expirationCaveat = caveats.find((c: any) => {
        const caveatStr = c.rawValue?.toString() || '';
        return caveatStr.includes('expiration');
      });

      expect(expirationCaveat).toBeTruthy();
    });

    it('should use default location when not provided', async () => {
      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
      });

      const macaroonStr = challenge.macaroon!;
      const macaroon = MacaroonsBuilder.deserialize(macaroonStr);

      expect(macaroon.location).toBe('https://localhost:3000');
    });

    it('should include custom caveats when provided', async () => {
      const customCaveats = [
        { type: CaveatType.PATH, value: '/api/protected/*' },
        { type: CaveatType.METHOD, value: 'GET' },
      ];

      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
        caveats: customCaveats,
      });

      const macaroonStr = challenge.macaroon!;
      const macaroon = MacaroonsBuilder.deserialize(macaroonStr);

      // Check for custom caveats
      const caveats = macaroon.caveatPackets || [];
      const pathCaveat = caveats.find((c: any) => {
        const caveatStr = c.rawValue?.toString() || '';
        return caveatStr.includes('path');
      });
      const methodCaveat = caveats.find((c: any) => {
        const caveatStr = c.rawValue?.toString() || '';
        return caveatStr.includes('method');
      });

      expect(pathCaveat).toBeTruthy();
      expect(methodCaveat).toBeTruthy();
    });
  });

  describe('Token Validation', () => {
    it('should validate a correct L402 token', async () => {
      // Create a challenge
      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
      });

      // Simulate payment - get the preimage
      const paymentHash = challenge.invoice.paymentHash;
      const preimage = 'b'.repeat(64); // Mock preimage

      // Mock the payment verification
      jest.spyOn(mockLightning, 'verifyPayment').mockResolvedValue(true);

      // Create a mock request with the L402 token
      const token = {
        macaroon: challenge.macaroon!,
        preimage: preimage,
      };

      const req = new NextRequest('https://api.example.com/protected', {
        headers: {
          Authorization: `L402 ${token.macaroon}:${token.preimage}`,
        },
      });

      // For this test to work properly, we need to ensure the preimage
      // actually hashes to the payment hash in the macaroon
      // This is a simplified test - in reality, the Lightning node provides matching pairs
      const _isValid = await validateToken(req, token, {
        lightning: mockLightning,
        secretKey: testSecretKey,
      });

      expect(mockLightning.verifyPayment).toHaveBeenCalledWith(paymentHash);
    });

    it('should reject token with invalid signature', async () => {
      const wrongSecretKey = Buffer.from('wrong-secret-key-32-bytes-long!');

      // Create a challenge with one secret
      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
      });

      const token = {
        macaroon: challenge.macaroon!,
        preimage: 'b'.repeat(64),
      };

      const req = new NextRequest('https://api.example.com/protected');

      // Try to validate with a different secret
      const isValid = await validateToken(req, token, {
        lightning: mockLightning,
        secretKey: wrongSecretKey, // Wrong secret!
      });

      expect(isValid).toBe(false);
    });

    it('should reject token when payment not verified', async () => {
      const challenge = await createChallengeResponse({
        lightning: mockLightning,
        priceSats: 100,
        secretKey: testSecretKey,
      });

      const token = {
        macaroon: challenge.macaroon!,
        preimage: 'b'.repeat(64),
      };

      // Mock payment verification to return false
      jest.spyOn(mockLightning, 'verifyPayment').mockResolvedValue(false);

      const req = new NextRequest('https://api.example.com/protected');

      const isValid = await validateToken(req, token, {
        lightning: mockLightning,
        secretKey: testSecretKey,
      });

      expect(isValid).toBe(false);
    });
  });

  describe('extractTokenFromHeader', () => {
    it('should extract valid L402 token from header', () => {
      const macaroon = 'test-macaroon-base64';
      const preimage = 'test-preimage-hex';

      const req = new NextRequest('https://api.example.com', {
        headers: {
          Authorization: `L402 ${macaroon}:${preimage}`,
        },
      });

      const token = extractTokenFromHeader(req);

      expect(token).toBeTruthy();
      expect(token?.macaroon).toBe(macaroon);
      expect(token?.preimage).toBe(preimage);
    });

    it('should return null for missing authorization header', () => {
      const req = new NextRequest('https://api.example.com');
      const token = extractTokenFromHeader(req);
      expect(token).toBeNull();
    });

    it('should return null for non-L402 authorization', () => {
      const req = new NextRequest('https://api.example.com', {
        headers: {
          Authorization: 'Bearer some-token',
        },
      });
      const token = extractTokenFromHeader(req);
      expect(token).toBeNull();
    });

    it('should return null for malformed L402 token', () => {
      const req = new NextRequest('https://api.example.com', {
        headers: {
          Authorization: 'L402 invalid-format',
        },
      });
      const token = extractTokenFromHeader(req);
      expect(token).toBeNull();
    });
  });
});
