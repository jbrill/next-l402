// Extended types for macaroons.js library
declare module 'macaroons.js' {
  export interface CaveatPacket {
    type: number;
    rawValue: Buffer;
  }

  export interface Macaroon {
    caveatPackets: CaveatPacket[];
    identifier: string;
    location: string;
    signature: string;
    signatureBuffer: Buffer;
  }

  export interface MacaroonsBuilder {
    getMacaroon(): Macaroon;
    serialize(): string;
    add_first_party_caveat(caveat: string): void;
  }

  export interface MacaroonsVerifier {
    isValid(key: string): boolean;
  }
}