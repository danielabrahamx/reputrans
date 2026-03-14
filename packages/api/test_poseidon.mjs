import { Barretenberg, Fr } from '@aztec/bb.js';
const bb = await Barretenberg.new({ threads: 1 });
const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(bb)).filter(m => m.toLowerCase().includes('poseidon'));
console.log('poseidon methods:', methods);
await bb.destroy();
