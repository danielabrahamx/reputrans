import { Barretenberg, Fr } from '@aztec/bb.js';

const BN254_P = 21888242871839275222246405745257275088548364400416034343698204186575808495617n;

function bigintToFr(n) { return new Fr(n % BN254_P); }
function frToBigint(fr) {
  const buf = fr.value ?? fr.toBuffer();
  let r = 0n;
  for (const b of buf) r = (r << 8n) | BigInt(b);
  return r;
}

const bb = await Barretenberg.new({ threads: 1 });

async function ph(inputs) {
  return frToBigint(await bb.pedersenHash(inputs.map(bigintToFr), 0));
}

const DEPTH = 10;
const secret = 99999999n;
const commitment = await ph([secret]);
console.log('commitment:', commitment.toString(16));

// Build depth-10 tree with 1 leaf (commitment at index 0)
const path = [];
let current = commitment;
for (let i = 0; i < DEPTH; i++) {
  path.push(0n); // all siblings are 0
  current = await ph([current, 0n]);
}
const root = current;
console.log('root:', root.toString(16));

// Verify the proof (index 0 = always left)
let verify = commitment;
for (let i = 0; i < DEPTH; i++) {
  verify = await ph([verify, 0n]); // index=0 means leaf is left, sibling is right
}
console.log('verified root matches:', verify === root);

await bb.destroy();
