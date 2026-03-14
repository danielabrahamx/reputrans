// Test to determine which hash Noir's eddsa_poseidon_verify uses
// by checking what the @noir-lang packages implement

// First, let's check if noir_js exposes any hash functions
import { Noir } from '@noir-lang/noir_js';
import { readFileSync } from 'fs';

// Load the circuit 
const circuit = JSON.parse(readFileSync('../../circuits/target/reputrans_proof.json', 'utf8'));
console.log('Circuit noir version:', circuit.noir_version);

// Check what the circuit ABI says about the eddsa inputs
const params = circuit.abi?.parameters || [];
console.log('Circuit params:', params.map(p => `${p.name}(${p.visibility})`));
