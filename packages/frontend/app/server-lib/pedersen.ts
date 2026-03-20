/**
 * Barretenberg Pedersen hash — matches Noir's std::hash::pedersen_hash exactly.
 *
 * Uses @aztec/bb.js 0.58.0 (same version as backend_barretenberg) to guarantee
 * hash compatibility with the compiled Noir circuit.
 *
 * Singleton pattern: WASM initialised once, reused for all hash calls.
 */

// @ts-ignore — @aztec/bb.js exports types differ between versions
import { Barretenberg, Fr } from '@aztec/bb.js';

const BN254_P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

let bbInstance: any = null;

async function getBB(): Promise<any> {
  if (!bbInstance) {
    bbInstance = await (Barretenberg as any).new({ threads: 1 });
  }
  return bbInstance;
}

function bigintToFr(n: bigint): any {
  return new (Fr as any)(n % BN254_P);
}

function frToBigint(fr: any): bigint {
  const buf: Uint8Array = fr.value ?? fr.toBuffer();
  let result = 0n;
  for (const byte of buf) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}

/**
 * Compute pedersen_hash(inputs) — matches Noir std::hash::pedersen_hash.
 * hashIndex 0 = default generators (what Noir uses).
 */
export async function pedersenHash(inputs: bigint[]): Promise<bigint> {
  const bb = await getBB();
  const frInputs = inputs.map(bigintToFr);
  const result = await bb.pedersenHash(frInputs, 0);
  return frToBigint(result);
}
