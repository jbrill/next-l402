import { LightningClient, Invoice } from '../types';

export interface RestLndConfig {
  host?: string;
  macaroon?: string;
  cert?: string;
  rejectUnauthorized?: boolean;
}

export const createRestLightningClient = (
  config: RestLndConfig = {}
): LightningClient => {
  const restConfig = {
    host: config.host || process.env.LND_REST_HOST || 'https://localhost:8097',
    macaroon: config.macaroon || process.env.LND_MACAROON,
    rejectUnauthorized: config.rejectUnauthorized !== false,
  };

  if (!restConfig.macaroon) {
    throw new Error('LND_MACAROON environment variable required');
  }

  const makeRestRequest = async (path: string, method = 'GET', body?: any) => {
    const url = `${restConfig.host}${path}`;

    // Convert base64 macaroon to hex for REST API
    const macaroonHex = Buffer.from(restConfig.macaroon!, 'base64').toString(
      'hex'
    );

    const options: RequestInit = {
      method,
      headers: {
        'Grpc-Metadata-macaroon': macaroonHex,
        'Content-Type': 'application/json',
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    // For development with self-signed certificates
    if (!restConfig.rejectUnauthorized && typeof process !== 'undefined') {
      process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`REST API error: ${response.status} ${errorText}`);
    }

    return response.json();
  };

  return {
    async createInvoice(amountSats: number, memo?: string): Promise<Invoice> {
      try {
        const invoiceRequest = {
          value: amountSats.toString(),
          memo: memo || 'L402 payment',
        };

        const result = (await makeRestRequest(
          '/v1/invoices',
          'POST',
          invoiceRequest
        )) as any;

        // Convert r_hash from base64 to hex for consistency
        const paymentHashHex = Buffer.from(result.r_hash, 'base64').toString(
          'hex'
        );

        return {
          paymentHash: paymentHashHex,
          paymentRequest: result.payment_request,
          amountSats: result.value ? parseInt(result.value) : amountSats,
        };
      } catch (error) {
        throw new Error(
          `Failed to create invoice: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    },

    async verifyPayment(paymentHash: string): Promise<boolean> {
      try {
        const result = (await makeRestRequest(
          `/v1/invoice/${paymentHash}`
        )) as any;
        return result.settled === true;
      } catch {
        return false;
      }
    },
  };
};
