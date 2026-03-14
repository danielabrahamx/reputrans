import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { BarretenbergBackend } from '@noir-lang/backend_barretenberg';

const circuitPath = resolve('packages/circuits/target/reputrans_proof.json');
const circuit = JSON.parse(readFileSync(circuitPath, 'utf-8'));

async function main() {
  console.log('Initializing Barretenberg backend...');
  const backend = new BarretenbergBackend(circuit);

  // The BarretenbergBackend wraps UltraPlonkBackend as backend.backend.
  // UltraPlonkBackend has instantiate() which sets up api + acirComposer.
  // The low-level api.acirGetSolidityVerifier(acirComposer) generates the contract.
  const innerBackend = backend.backend;

  console.log('Instantiating UltraPlonk backend (this may take a while)...');
  await innerBackend.instantiate();

  console.log('Initializing verification key...');
  await innerBackend.api.acirInitVerificationKey(innerBackend.acirComposer);

  console.log('Generating Solidity verifier...');
  const verifierContract = await innerBackend.api.acirGetSolidityVerifier(innerBackend.acirComposer);

  const outputPath = resolve('packages/contracts/src/plonk_vk.sol');
  writeFileSync(outputPath, verifierContract);
  console.log(`Verifier contract written to ${outputPath}`);

  await backend.destroy();
  console.log('Done!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
