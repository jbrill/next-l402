/* eslint-disable */
declare module 'macaroons.js' {
  export class MacaroonsBuilder {
    static create(
      location: string,
      secretKey: string | Buffer,
      identifier: string
    ): Macaroon;
    static deserialize(serialized: string): Macaroon;
    static modify(macaroon: Macaroon): MacaroonsBuilder;

    constructor(
      location: string,
      secretKey: string | Buffer,
      identifier: string
    );

    add_first_party_caveat(caveat: string): MacaroonsBuilder;
    add_third_party_caveat(
      location: string,
      caveatKey: string,
      identifier: string
    ): MacaroonsBuilder;
    prepare_for_request(discharge: Macaroon): MacaroonsBuilder;
    getMacaroon(): Macaroon;
  }

  export class Macaroon {
    location: string;
    identifier: string;
    signature: string;
    caveats: { type: string; value: any }[];

    serialize(): string;
    inspect(): string;
  }

  export class MacaroonsVerifier {
    constructor(macaroon: Macaroon);

    isValid(secretKey: string | Buffer): boolean;
    assertIsValid(secretKey: string | Buffer): void;
    satisfyExact(caveat: string): MacaroonsVerifier;
    satisfyGeneral(verifier: any): MacaroonsVerifier;
    satisfy3rdParty(discharge: Macaroon): MacaroonsVerifier;
  }

  export namespace verifier {
    export class TimestampCaveatVerifier {
      // Verify timestamp caveats like "time < 2042-01-01T00:00"
    }
  }

  export class MacaroonsConstants {
    static readonly MACAROON_SUGGESTED_SECRET_LENGTH: number;
  }
}
