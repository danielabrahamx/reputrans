export interface SignerShare {
  index: number;
  share: bigint;
  publicKey: { x: bigint; y: bigint };
}

export interface PartialSignature {
  signerIndex: number;
  r: { x: bigint; y: bigint };
  s: bigint;
}

export interface ThresholdCredential {
  attributes: CredentialAttributes;
  signature: { r: { x: bigint; y: bigint }; s: bigint };
  groupPublicKey: { x: bigint; y: bigint };
  threshold: { t: number; n: number };
}

export interface CredentialAttributes {
  rating: number;
  tripCount: number;
  platformId: number;
  derivedKey: bigint;
}

export interface MasterIdentity {
  secret: bigint;
  commitment: bigint;
  platformSecret: bigint;
  derivedKey: bigint;
}

export interface ProofInput {
  nullifier: string;
  anonymitySetRoot: string;
  platformType: number;
  minRating: number;
  minTrips: number;
}

export interface ProofResult {
  proof: Uint8Array;
  publicInputs: string[];
  nullifier: string;
  generationTimeMs: number;
}
