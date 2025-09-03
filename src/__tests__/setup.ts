// Test setup - configure environment variables for testing
process.env.LND_HOST = process.env.LND_HOST || 'localhost:10009';
process.env.LND_MACAROON = process.env.LND_MACAROON || 'test-macaroon-hex';
process.env.LND_CERT = process.env.LND_CERT || 'test-cert-base64';
