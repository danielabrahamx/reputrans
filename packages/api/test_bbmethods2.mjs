import { Barretenberg, Fr } from '@aztec/bb.js';
const bb = await Barretenberg.new({ threads: 1 });
const allKeys = [];
let obj = bb;
while (obj) {
  allKeys.push(...Object.getOwnPropertyNames(obj));
  obj = Object.getPrototypeOf(obj);
}
const unique = [...new Set(allKeys)].filter(k => !k.startsWith('_') && k !== 'constructor');
console.log('All accessible methods:', unique);
await bb.destroy();
