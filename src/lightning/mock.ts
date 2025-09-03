import { LightningClient, Invoice } from '../types';

/**
 * Mock Lightning client for testing and development
 */
export const createMockLightningClient = (): LightningClient => {
  // Store known preimage/hash pairs for testing
  const mockPreimage = 'mock-preimage-exactly-32-bytes!!'; // Exactly 32 chars
  const crypto = require('crypto');
  const mockPaymentHash = crypto
    .createHash('sha256')
    .update(mockPreimage, 'utf8')
    .digest('hex');

  return {
    async createInvoice(amountSats: number, _memo?: string): Promise<Invoice> {
      const paymentRequest = `lnbc${amountSats}u1p${mockPaymentHash.substring(0, 10)}`;

      return {
        paymentHash: mockPaymentHash,
        paymentRequest,
        amountSats,
      };
    },

    async verifyPayment(_paymentHash: string): Promise<boolean> {
      // Mock verification - always returns true for demo
      return true;
    },
  };
};
