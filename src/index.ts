// Export token utilities
export {
  validateToken,
  extractTokenFromHeader,
  createMacaroonIdentifier,
  createWwwAuthenticateHeader,
} from './token-utils';

// Export challenge handler (handles Lightning operations)
export {
  createChallengeHandler,
  markPaymentComplete,
  createChallengeResponse,
} from './challenge';

// Export Lightning clients
export { createRestLightningClient } from './lightning/rest';
export { createMockLightningClient } from './lightning/mock';

// Export caveats
export {
  createExpirationCaveat,
  createPathCaveat,
  createMethodCaveat,
  createIpCaveat,
  createOriginCaveat,
  createCustomCaveat,
  validateCaveat,
  validateCaveats,
} from './caveats';

// Export server utilities (backward compatibility)
export { l402Server, withL402 } from './server';

// Export cache
export { l402Cache } from './cache';

// Export types
export * from './types';
