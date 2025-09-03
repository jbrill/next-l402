import type { NextRequest, NextResponse } from 'next/server';

export interface LightningClient {
  createInvoice(amountSats: number, memo?: string): Promise<Invoice>;
  verifyPayment(paymentHash: string): Promise<boolean>;
}

export interface Invoice {
  paymentHash: string;
  paymentRequest: string;
  amountSats: number;
}

export interface L402Token {
  macaroon: string;
  preimage: string;
}

export enum CaveatType {
  EXPIRATION = 'expiration',
  PATH = 'path',
  METHOD = 'method',
  IP = 'ip',
  ORIGIN = 'origin',
  CUSTOM = 'custom',
  PAYMENT_HASH = 'payment_hash',
}

export interface Caveat {
  type: CaveatType;
  value: string | number | object;
  validator?: (req: NextRequest, caveatValue: any) => boolean;
}

export interface L402ChallengeOptions {
  lightning: LightningClient;
  priceSats?: number;
  caveats?: Caveat[];
  secretKey: Buffer;
  tokenValidityDuration?: number;
  location?: string;
}

export class L402Error extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number = 402) {
    super(message);
    this.statusCode = statusCode;
  }
}

export interface L402Challenge {
  invoice: Invoice;
  wwwAuthenticate: string;
  macaroon?: string;
}

export interface L402Auth {
  isAuthenticated: () => boolean;
  getToken: () => L402Token | null;
  protect: () => Promise<NextResponse | void>;
}

export interface L402ServerOptions {
  lightning?: LightningClient;
  priceSats?: number;
  caveats?: Caveat[];
  secretKey?: Buffer;
  location?: string;
}

export type NextHandler = (
  req: any,
  ...args: any[]
) => Promise<NextResponse> | NextResponse;
