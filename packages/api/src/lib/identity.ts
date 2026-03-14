/**
 * Master identity management (Paper 1: U2SSO)
 *
 * Handles:
 * - Master secret generation
 * - Identity commitment (Pedersen hash of master secret — matches circuit)
 * - Platform-specific derived keys
 * - Anonymity set registration
 */

import { MerkleTree } from './merkle.js';
import { pedersenHash } from './pedersen.js';
import type { MasterIdentity } from '../types/index.js';

const BN254_P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function randomFieldElement(): bigint {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let val = 0n;
  for (const b of bytes) val = (val << 8n) | BigInt(b);
  return val % BN254_P;
}

// Global anonymity set (in-memory for demo)
const anonymityTree = new MerkleTree();

/** Create a new master identity with real Pedersen commitment. */
export async function createMasterIdentity(): Promise<MasterIdentity> {
  const secret = randomFieldElement();
  const commitment = await pedersenHash([secret]);
  const platformSecret = randomFieldElement();
  const derivedKey = await pedersenHash([secret, platformSecret]);
  return { secret, commitment, platformSecret, derivedKey };
}

/** Register identity in the anonymity set. Rebuilds the Merkle tree. */
export async function registerIdentity(identity: MasterIdentity): Promise<{
  leafIndex: number;
  merkleRoot: bigint;
  setIndex: number;
}> {
  const leafIndex = anonymityTree.insertSync(identity.commitment);
  await anonymityTree.build();
  const merkleRoot = anonymityTree.getRoot();
  return { leafIndex, merkleRoot, setIndex: 0 };
}

/** Get Merkle proof for an identity */
export function getMerkleProof(leafIndex: number): {
  path: bigint[];
  indices: number[];
  root: bigint;
} {
  const { path, indices } = anonymityTree.getProof(leafIndex);
  return { path, indices, root: anonymityTree.getRoot() };
}

/** Get current tree state */
export function getTreeState(): { root: bigint; size: number } {
  return { root: anonymityTree.getRoot(), size: anonymityTree.size };
}

/** Compute nullifier matching Noir circuit: pedersen_hash([master_secret, platform_type]) */
export async function computeNullifier(masterSecret: bigint, platformType: number): Promise<bigint> {
  return pedersenHash([masterSecret, BigInt(platformType)]);
}
