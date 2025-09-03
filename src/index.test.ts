// src/index.test.ts
jest.mock('./lightning/lnd');
import * as lib from './index';

describe('Index exports', () => {
  test('exports core functionality', () => {
    // Check middleware exports
    expect(lib.l402).toBeDefined();
    expect(lib.createRouteMatcher).toBeDefined();

    // Check lightning exports
    expect(lib.createLightningClient).toBeDefined();

    // Check caveat exports
    expect(lib.createExpirationCaveat).toBeDefined();
    expect(lib.createPathCaveat).toBeDefined();
    expect(lib.createMethodCaveat).toBeDefined();

    // Check server exports
    expect(lib.l402Server).toBeDefined();
    expect(lib.withL402).toBeDefined();
  });
});
