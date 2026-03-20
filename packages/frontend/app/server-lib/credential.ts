/**
 * Credential issuance using threshold EdDSA (Paper 2: ThetaCrypt)
 *
 * Wraps the threshold.ts module to provide:
 * - High-level credential issuance
 * - Signer committee details for UI display
 *
 * The actual threshold signing math is in threshold.ts.
 */

import {
  issueThresholdCredential as thresholdIssue,
  generateKeyShares,
} from './threshold';
import type {
  ThresholdCredential,
  CredentialAttributes,
} from './types';

// Cache signer info for display
let cachedSignerInfo: {
  groupPublicKey: { x: bigint; y: bigint };
  signerIndices: number[];
} | null = null;

/** Issue a threshold credential for the given attributes.
 * @param credentialMessage - pre-computed message (pedersen_hash of attributes) to sign.
 *   Must match what the Noir circuit computes as attr_hash.
 */
export async function issueThresholdCredential(
  attrs: CredentialAttributes,
  credentialMessage?: bigint
): Promise<ThresholdCredential> {
  const credential = await thresholdIssue(attrs, credentialMessage);

  // Cache signer info for getSignerDetails
  cachedSignerInfo = {
    groupPublicKey: credential.groupPublicKey,
    signerIndices: Array.from({ length: credential.threshold.n }, (_, i) => i + 1),
  };

  return credential;
}

/** Get signer details for display in the UI */
export function getSignerDetails(): {
  threshold: number;
  totalSigners: number;
  groupPublicKey: { x: string; y: string };
  signerIndices: number[];
} {
  if (!cachedSignerInfo) {
    // Generate a fresh key set to get signer info
    const { shares, groupPublicKey } = generateKeyShares(3, 5);
    cachedSignerInfo = {
      groupPublicKey,
      signerIndices: shares.map((s) => s.index),
    };
  }

  return {
    threshold: 3,
    totalSigners: 5,
    groupPublicKey: {
      x: '0x' + cachedSignerInfo.groupPublicKey.x.toString(16).padStart(64, '0'),
      y: '0x' + cachedSignerInfo.groupPublicKey.y.toString(16).padStart(64, '0'),
    },
    signerIndices: cachedSignerInfo.signerIndices,
  };
}
