import NodeCache from 'node-cache';

export interface L402Session {
  macaroon: string;
  invoice: {
    paymentHash: string;
    paymentRequest: string;
    amountSats: number;
  };
  secretKey: Buffer;
  createdAt: number;
}

export interface L402CachedChallenge {
  wwwAuthenticate: string;
  paymentHash: string;
  createdAt: number;
}

/**
 * Cache for storing L402 sessions by payment hash
 * TTL: 1 hour (3600 seconds)
 */
class L402Cache {
  private cache: NodeCache;

  constructor(ttlSeconds: number = 3600) {
    this.cache = new NodeCache({
      stdTTL: ttlSeconds,
      checkperiod: 600, // Check for expired keys every 10 minutes
      useClones: false, // Don't clone objects for better performance
    });
  }

  /**
   * Store an L402 session by payment hash
   */
  setSession(paymentHash: string, session: L402Session): void {
    this.cache.set(paymentHash, session);
  }

  /**
   * Retrieve an L402 session by payment hash
   */
  getSession(paymentHash: string): L402Session | undefined {
    return this.cache.get<L402Session>(paymentHash);
  }

  /**
   * Remove an L402 session
   */
  removeSession(paymentHash: string): void {
    this.cache.del(paymentHash);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    return this.cache.getStats();
  }

  /**
   * Store a cached challenge for a route
   */
  setCachedChallenge(routeKey: string, challenge: L402CachedChallenge): void {
    this.cache.set(`challenge:${routeKey}`, challenge);
  }

  /**
   * Get a cached challenge for a route
   */
  getCachedChallenge(routeKey: string): L402CachedChallenge | undefined {
    return this.cache.get<L402CachedChallenge>(`challenge:${routeKey}`);
  }

  /**
   * Clear all sessions (for testing)
   */
  clear(): void {
    this.cache.flushAll();
  }
}

// Global cache instance
export const l402Cache = new L402Cache();