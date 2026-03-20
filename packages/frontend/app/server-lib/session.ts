/**
 * In-memory session state singleton.
 * 
 * Shared across all API routes. In Vercel serverless, this persists within
 * a warm function instance. For the demo, this is sufficient — users flow
 * through the steps sequentially in one session.
 */

import type { MasterIdentity, ThresholdCredential } from './types';

interface SessionState {
  identity: MasterIdentity | null;
  leafIndex: number | null;
  merkleRoot: bigint | null;
  credential: ThresholdCredential | null;
  credentialMessage: bigint | null;
  platformData: {
    rating: number;
    tripCount: number;
    platformId: number;
    platformType: number;
  } | null;
  lastProof: {
    proof: string; // hex
    publicInputs: string[];
    nullifier: string;
    generationTimeMs: number;
  } | null;
}

// Global singleton (persists across requests in warm Vercel instances)
const state: SessionState = {
  identity: null,
  leafIndex: null,
  merkleRoot: null,
  credential: null,
  credentialMessage: null,
  platformData: null,
  lastProof: null,
};

export function getState(): SessionState {
  return state;
}

export function setState(partial: Partial<SessionState>): void {
  Object.assign(state, partial);
}

export function resetState(): void {
  state.identity = null;
  state.leafIndex = null;
  state.merkleRoot = null;
  state.credential = null;
  state.credentialMessage = null;
  state.platformData = null;
  state.lastProof = null;
}
