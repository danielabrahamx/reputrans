import { poseidon5 } from 'poseidon-lite';
// Test: hash 5 values that we'll also compute in the circuit
const r8x = 123n;
const r8y = 456n;
const ax = 789n;
const ay = 101n;
const msg = 202n;
const hash = poseidon5([r8x, r8y, ax, ay, msg]);
console.log('poseidon5 result:', hash.toString(16));
