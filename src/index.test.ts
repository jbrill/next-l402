// src/index.test.ts
import * as lib from './index';

describe('Index exports', () => {
  test('exports core functionality', () => {
    // Check token utility exports
    expect(lib.validateToken).toBeDefined();
    expect(lib.extractTokenFromHeader).toBeDefined();
    expect(lib.createMacaroonIdentifier).toBeDefined();
    expect(lib.createWwwAuthenticateHeader).toBeDefined();

    // Check lightning exports
    expect(lib.createRestLightningClient).toBeDefined();
    expect(lib.createMockLightningClient).toBeDefined();

    // Check caveat exports
    expect(lib.createExpirationCaveat).toBeDefined();
    expect(lib.createPathCaveat).toBeDefined();
    expect(lib.createMethodCaveat).toBeDefined();

    // Check server exports
    expect(lib.l402Server).toBeDefined();
    expect(lib.withL402).toBeDefined();
  });
});
