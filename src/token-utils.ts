import { NextRequest } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { MacaroonsBuilder, MacaroonsVerifier } from 'macaroons.js';
import { L402Token, Caveat, CaveatType } from './types';
import { validateCaveats } from './caveats';

/**
 * Extracts an L402 token from the Authorization header
 */
export const extractTokenFromHeader = (req: NextRequest): L402Token | null => {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('L402 ')) {
    return null;
  }

  const tokenPart = authHeader.substring(5);
  const colonIndex = tokenPart.indexOf(':');

  if (colonIndex === -1) {
    return null;
  }

  const macaroon = tokenPart.substring(0, colonIndex);
  const preimage = tokenPart.substring(colonIndex + 1);

  if (!macaroon || !preimage) {
    return null;
  }

  return {
    macaroon,
    preimage,
  };
};

/**
 * Creates a WWW-Authenticate header value for L402
 */
export const createWwwAuthenticateHeader = (
  macaroon: string,
  paymentRequest: string
): string => {
  return `L402 macaroon="${macaroon}", invoice="${paymentRequest}"`;
};

/**
 * Creates the macaroon identifier according to L402 spec
 */
export const createMacaroonIdentifier = (paymentHash: string): Buffer => {
  // L402 identifier format:
  // version (2 bytes) + user_id (32 bytes) + payment_hash (32 bytes)
  const version = Buffer.alloc(2);
  version.writeUInt16BE(0, 0); // Version 0

  // Generate a random 32-byte user ID
  const userId = Buffer.alloc(32);
  const uuidBytes = Buffer.from(uuidv4().replace(/-/g, ''), 'hex');
  uuidBytes.copy(userId, 0, 0, Math.min(uuidBytes.length, 32));

  // If UUID is shorter than 32 bytes, fill with random bytes
  if (uuidBytes.length < 32) {
    Buffer.from(uuidv4().replace(/-/g, ''), 'hex').copy(
      userId,
      uuidBytes.length
    );
  }

  const paymentHashBuffer = Buffer.from(paymentHash, 'hex');

  return Buffer.concat([version, userId, paymentHashBuffer]);
};

/**
 * Validates an L402 token with proper cryptographic verification
 */
export const validateToken = async (
  req: NextRequest,
  token: L402Token,
  secretKey: Buffer,
  caveats: Caveat[] = []
): Promise<boolean> => {
  try {
    // Deserialize the macaroon
    const macaroon = MacaroonsBuilder.deserialize(token.macaroon);

    // Verify macaroon signature with the provided secret key
    const verifier = new MacaroonsVerifier(macaroon);

    // Satisfy all caveats before verifying signature
    const caveatPackets = macaroon.caveatPackets || [];

    caveatPackets.forEach((caveat) => {
      const caveatStr = caveat.rawValue.toString();
      verifier.satisfyExact(caveatStr);
    });

    const isSignatureValid = verifier.isValid(secretKey.toString('hex'));
    if (!isSignatureValid) {
      return false;
    }

    // Extract payment hash from macaroon caveats
    const paymentHashCaveat = caveatPackets.find((c) => {
      const caveatStr = c.rawValue?.toString() || '';
      return caveatStr.includes('payment_hash');
    });

    if (!paymentHashCaveat) {
      return false;
    }

    // Extract payment hash value from "payment_hash = <hash>" format
    const caveatStr = paymentHashCaveat.rawValue.toString();
    const paymentHashMatch = caveatStr.match(/payment_hash\s*=\s*(.+)/);
    if (!paymentHashMatch) {
      return false;
    }

    const paymentHash = paymentHashMatch[1].trim();

    // Verify preimage matches payment hash using Web Crypto API
    let preimageForHash: Uint8Array;
    if (
      /^[0-9a-fA-F]+$/.test(token.preimage) &&
      token.preimage.length % 2 === 0
    ) {
      preimageForHash = new Uint8Array(Buffer.from(token.preimage, 'hex'));
    } else {
      preimageForHash = new TextEncoder().encode(token.preimage);
    }

    const hashBuffer = await crypto.subtle.digest('SHA-256', preimageForHash);
    const computedPaymentHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    const paymentHashHex = Buffer.from(paymentHash, 'base64').toString('hex');

    if (computedPaymentHash !== paymentHashHex) {
      return false;
    }

    // Validate all caveats (convert from caveat packets to Caveat objects)
    const caveatObjects: Caveat[] = caveatPackets
      .filter((c) => !c.rawValue?.toString().includes('payment_hash'))
      .map((c) => {
        const caveatStr = c.rawValue?.toString() || '';
        const [type, value] = caveatStr
          .split(' = ')
          .map((s: string) => s.trim());
        return {
          type: type as CaveatType,
          value: value,
        };
      })
      .filter((c) => c.type && c.value);

    if (caveats?.length) {
      return validateCaveats(req, [...caveatObjects, ...caveats]);
    }

    return validateCaveats(req, caveatObjects);
  } catch {
    return false;
  }
};
