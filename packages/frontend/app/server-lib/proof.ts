/**
 * ZK Proof generation wrapper using noir_js + backend_barretenberg.
 *
 * Papers 1 + 3: Generates UltraPlonk proofs from the compiled circuit
 * without needing the bb CLI — everything runs in Node.js.
 *
 * Next.js adaptation: circuit JSON is loaded via fetch from /public
 * instead of readFileSync, so it works in the serverless environment.
 */

import type { ProofResult } from './types';

// Lazy-load circuit and backend to avoid startup cost
let circuitJson: any = null;
let noirInstance: any = null;
let backendInstance: any = null;

async function getCircuit(): Promise<any> {
  if (!circuitJson) {
    // Read directly from filesystem to avoid self-fetch 401 on Vercel deployment protection.
    // process.cwd() in Next.js serverless is the project root (where /public lives).
    const { readFileSync } = await import('fs');
    const { join } = await import('path');
    const filePath = join(process.cwd(), 'public', 'reputrans_proof.json');
    circuitJson = JSON.parse(readFileSync(filePath, 'utf-8'));
  }
  return circuitJson;
}

async function initNoir(): Promise<{ noir: any; backend: any }> {
  if (noirInstance && backendInstance) {
    return { noir: noirInstance, backend: backendInstance };
  }

  const circuit = await getCircuit();

  // Dynamic imports for ESM compatibility
  const { Noir } = await import('@noir-lang/noir_js');
  const { BarretenbergBackend } = await import('@noir-lang/backend_barretenberg');

  backendInstance = new BarretenbergBackend(circuit);
  noirInstance = new Noir(circuit);

  return { noir: noirInstance, backend: backendInstance };
}

/**
 * Generate a ZK proof for the reputation claim.
 *
 * All inputs must match the circuit's expected format:
 * - Public: nullifier, anonymity_set_root, platform_type, min_rating_threshold, min_trips_threshold
 * - Private: master_secret, credential keys/sigs, rating, trip_count, platform_id, merkle_path, etc.
 */
export async function generateProof(inputs: {
  // Public
  nullifier: string;
  anonymity_set_root: string;
  platform_type: string;
  min_rating_threshold: string;
  min_trips_threshold: string;
  // Private
  master_secret: string;
  credential_pub_key_x: string;
  credential_pub_key_y: string;
  credential_signature_s: string;
  credential_signature_r8_x: string;
  credential_signature_r8_y: string;
  credential_message: string;
  rating: string;
  trip_count: string;
  platform_id: string;
  merkle_path: string[];
  merkle_indices: string[];
  platform_secret: string;
}): Promise<ProofResult> {
  const startTime = Date.now();

  const { noir } = await initNoir();

  // Generate witness and proof (noir_js@0.36.0: execute on Noir, generateProof on backend)
  const { witness } = await noir.execute(inputs);
  const proof = await backendInstance.generateProof(witness);

  const generationTimeMs = Date.now() - startTime;

  return {
    proof: proof.proof,
    publicInputs: proof.publicInputs,
    nullifier: inputs.nullifier,
    generationTimeMs,
  };
}

/** Verify a proof locally (for testing before on-chain submission) */
export async function verifyProofLocally(
  proof: Uint8Array,
  publicInputs: string[]
): Promise<boolean> {
  const { backend } = await initNoir();
  return backend.verifyProof({ proof, publicInputs });
}

/** Get circuit info */
export async function getCircuitInfo(): Promise<{
  name: string;
  publicInputCount: number;
}> {
  const circuit = await getCircuit();
  return {
    name: circuit.name ?? 'reputrans_proof',
    publicInputCount: circuit.abi?.parameters?.filter(
      (p: any) => p.visibility === 'public'
    ).length ?? 0,
  };
}
