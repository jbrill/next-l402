import { NextRequest } from 'next/server';
import { Caveat, CaveatType } from './types';

/**
 * Creates an expiration caveat that checks if the current time is before the expiration time
 */
export const createExpirationCaveat = (expiresInSeconds: number): Caveat => {
  const expirationTime = Math.floor(Date.now() / 1000) + expiresInSeconds;

  return {
    type: CaveatType.EXPIRATION,
    value: expirationTime,
    validator: (_req: NextRequest, value: number) => {
      const currentTime = Math.floor(Date.now() / 1000);
      return currentTime <= value;
    },
  };
};

/**
 * Creates a path caveat that checks if the request path matches the allowed path pattern
 */
export const createPathCaveat = (path: string): Caveat => {
  return {
    type: CaveatType.PATH,
    value: path,
    validator: (req: NextRequest, value: string) => {
      // Create a regex pattern from the path specification
      // Support glob patterns with * (any characters) and wildcards
      const pattern = value
        .replace(/\*/g, '.*') // Replace * with regex .*
        .replace(/\//g, '\\/'); // Escape / in the path

      const regex = new RegExp(`^${pattern}$`);
      return regex.test(req.nextUrl.pathname);
    },
  };
};

/**
 * Creates a method caveat that checks if the request method matches one of the allowed methods
 */
export const createMethodCaveat = (methods: string | string[]): Caveat => {
  const allowedMethods = Array.isArray(methods) ? methods : [methods];

  return {
    type: CaveatType.METHOD,
    value: allowedMethods,
    validator: (req: NextRequest, value: string[]) => {
      return value.includes(req.method.toUpperCase());
    },
  };
};

/**
 * Creates an IP address caveat that checks if the request IP matches one of the allowed IPs
 */
export const createIpCaveat = (ips: string | string[]): Caveat => {
  const allowedIps = Array.isArray(ips) ? ips : [ips];

  return {
    type: CaveatType.IP,
    value: allowedIps,
    validator: (req: NextRequest, value: string[]) => {
      // Get the client IP from the request
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim();

      if (!ip) {
        return false;
      }

      return value.includes(ip);
    },
  };
};

/**
 * Creates an origin caveat that checks if the request origin matches one of the allowed origins
 */
export const createOriginCaveat = (origins: string | string[]): Caveat => {
  const allowedOrigins = Array.isArray(origins) ? origins : [origins];

  return {
    type: CaveatType.ORIGIN,
    value: allowedOrigins,
    validator: (req: NextRequest, value: string[]) => {
      const origin = req.headers.get('origin');

      if (!origin) {
        return false;
      }

      return value.includes(origin);
    },
  };
};

/**
 * Creates a custom caveat with a custom validator function
 */
export const createCustomCaveat = (
  identifier: string,
  value: any,
  validator: (req: NextRequest, value: any) => boolean
): Caveat => {
  return {
    type: CaveatType.CUSTOM,
    value: {
      identifier,
      value,
    },
    validator,
  };
};

/**
 * Validates a caveat against a request
 */
export const validateCaveat = (req: NextRequest, caveat: Caveat): boolean => {
  if (!caveat.validator) {
    return true;
  }

  return caveat.validator(req, caveat.value);
};

/**
 * Validates all caveats against a request
 */
export const validateCaveats = (
  req: NextRequest,
  caveats: Caveat[]
): boolean => {
  return caveats.every((caveat) => validateCaveat(req, caveat));
};
