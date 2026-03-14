import { Barretenberg, Fr } from '@aztec/bb.js';
const bb = await Barretenberg.new({ threads: 1 });
const all = Object.getOwnPropertyNames(Object.getPrototypeOf(bb));
console.log('All methods:', all.filter(m => !m.startsWith('_')));
await bb.destroy();
