// examples/custom-lightning-client.ts
import { LightningClient, Invoice } from '../src/types';

/**
 * Example of implementing a custom Lightning client
 * This could be used to integrate with services like Alby, LNBits, etc.
 */
export class CustomLightningClient implements LightningClient {
  private apiKey: string;
  private apiUrl: string;
  private invoices: Map<string, boolean> = new Map();

  constructor(apiKey: string, apiUrl: string) {
    this.apiKey = apiKey;
    this.apiUrl = apiUrl;
  }

  /**
   * Create an invoice using a third-party API
   */
  async createInvoice(
    amountSats: number,
    memo: string = 'L402 Payment'
  ): Promise<Invoice> {
    try {
      // Example API call to create an invoice
      const response = await fetch(`${this.apiUrl}/api/v1/invoice`, {
        method: 'POST',
        headers: {
          'X-Api-Key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountSats,
          memo,
          expiry: 600, // 10 minutes
        }),
      });

      if (!response.ok) {
        throw new Error(`Invoice creation failed: ${response.statusText}`);
      }

      const data = await response.json();

      // Store the invoice in our local map
      this.invoices.set(data.payment_hash, false);

      return {
        paymentHash: data.payment_hash,
        paymentRequest: data.payment_request,
        amountSats: data.amount,
      };
    } catch (error) {
      console.error('Failed to create invoice:', error);
      throw new Error('Invoice creation failed');
    }
  }

  /**
   * Verify payment status
   */
  async verifyPayment(paymentHash: string): Promise<boolean> {
    try {
      // Check our local cache first
      if (this.invoices.has(paymentHash) && this.invoices.get(paymentHash)) {
        return true;
      }

      // Otherwise check with the API
      const response = await fetch(
        `${this.apiUrl}/api/v1/invoice/${paymentHash}`,
        {
          headers: {
            'X-Api-Key': this.apiKey,
          },
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const isPaid = data.paid || false;

      // Update our local cache
      if (isPaid) {
        this.invoices.set(paymentHash, true);
      }

      return isPaid;
    } catch (error) {
      console.error('Failed to verify payment:', error);
      return false;
    }
  }
}

// Example usage
export const createCustomLightningClient = () => {
  return new CustomLightningClient(
    process.env.LIGHTNING_API_KEY || '',
    process.env.LIGHTNING_API_URL || ''
  );
};

// Example of using with the L402 middleware
export const setupWithCustomClient = () => {
  const { l402, createRouteMatcher } = require('../src');

  const lightningClient = createCustomLightningClient();

  return l402({
    lightning: lightningClient,
    matcher: createRouteMatcher(['/api/protected/(.*)']),
  });
};
