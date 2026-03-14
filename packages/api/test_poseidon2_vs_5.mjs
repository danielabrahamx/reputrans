import { Barretenberg, Fr } from '@aztec/bb.js';

const P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;
function bigintToFr(n) { return new Fr(n % P); }
function frToBigint(fr) {
  const buf = fr.value ?? fr.toBuffer();
  let r = 0n;
  for (const b of buf) r = (r << 8n) | BigInt(b);
  return r;
}

const bb = await Barretenberg.new({ threads: 1 });

// Test poseidon2Hash
const inputs = [1n, 2n, 3n, 4n, 5n];
const result = await bb.poseidon2Hash(inputs.map(bigintToFr));
console.log('poseidon2Hash([1,2,3,4,5]):', frToBigint(result).toString(16));

// Compare with poseidon-lite poseidon5
import { poseidon5 } from 'poseidon-lite/poseidon5';
const result2 = poseidon5([1n, 2n, 3n, 4n, 5n]);
console.log('poseidon-lite poseidon5([1,2,3,4,5]):', result2.toString(16));

await bb.destroy();
