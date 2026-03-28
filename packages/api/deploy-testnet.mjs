/**
 * Deploy REPUTRANS contracts to Base Sepolia testnet.
 *
 * Prerequisites:
 *   1. Set PRIVATE_KEY and WALLET_ADDRESS in .env
 *   2. Run `forge build` in packages/contracts to compile artifacts
 *   3. Get Base Sepolia ETH from: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet
 *
 * Usage:
 *   node scripts/deploy-testnet.mjs
 *
 * Writes REGISTRY_ADDRESS and VERIFIER_ADDRESS back to .env on success.
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createWalletClient, createPublicClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const CONTRACTS_OUT = resolve(ROOT, 'packages/contracts/out');
const ENV_PATH = resolve(ROOT, '.env');

// Parse .env manually — no dotenv dependency needed at root
const envContent = readFileSync(ENV_PATH, 'utf-8');
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eq = trimmed.indexOf('=');
  if (eq === -1) continue;
  const key = trimmed.slice(0, eq).trim();
  const value = trimmed.slice(eq + 1).trim();
  if (!process.env[key]) process.env[key] = value;
}

// --- Load compiled artifacts -------------------------------------------------

function loadArtifact(contractFile, contractName) {
  const path = resolve(CONTRACTS_OUT, contractFile, `${contractName}.json`);
  try {
    const artifact = JSON.parse(readFileSync(path, 'utf-8'));
    return {
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
    };
  } catch {
    throw new Error(
      `Artifact not found: ${path}\nRun "forge build" in packages/contracts first.`
    );
  }
}

// --- Patch .env with new addresses ------------------------------------------

function updateEnv(key, value) {
  let content = readFileSync(ENV_PATH, 'utf-8');
  const re = new RegExp(`^(${key}=).*$`, 'm');
  if (re.test(content)) {
    content = content.replace(re, `$1${value}`);
  } else {
    content += `\n${key}=${value}`;
  }
  writeFileSync(ENV_PATH, content);
}

// --- Main -------------------------------------------------------------------

async function main() {
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey || privateKey === 'YOUR_PRIVATE_KEY_HERE') {
    throw new Error('Set PRIVATE_KEY in .env before deploying');
  }

  const rpcUrl = process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';
  const account = privateKeyToAccount(privateKey.startsWith('0x') ? privateKey : `0x${privateKey}`);

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  console.log(`Deployer: ${account.address}`);
  const balance = await publicClient.getBalance({ address: account.address });
  console.log(`Balance:  ${Number(balance) / 1e18} ETH (Base Sepolia)`);
  if (balance === 0n) {
    throw new Error('No ETH on Base Sepolia. Get some at: https://www.coinbase.com/faucets/base-ethereum-goerli-faucet');
  }

  // Load artifacts
  const registry = loadArtifact('U2SSORegistry.sol', 'U2SSORegistry');
  const mockVerifier = loadArtifact('MockVerifier.sol', 'MockVerifier');
  const repVerifier = loadArtifact('ReputationVerifier.sol', 'ReputationVerifier');

  // Get current nonce to avoid race conditions
  let nonce = await publicClient.getTransactionCount({ address: account.address });
  console.log(`Starting nonce: ${nonce}`);

  // 1. Deploy U2SSORegistry
  console.log('\nDeploying U2SSORegistry...');
  const registryHash = await walletClient.deployContract({
    abi: registry.abi,
    bytecode: registry.bytecode,
    args: [0n], // fee = 0 for testnet
    nonce: nonce++,
  });
  const registryReceipt = await publicClient.waitForTransactionReceipt({ hash: registryHash });
  const registryAddress = registryReceipt.contractAddress;
  console.log(`  U2SSORegistry: ${registryAddress}`);
  console.log(`  Tx: https://sepolia.basescan.org/tx/${registryHash}`);

  // 2. Deploy MockVerifier
  console.log('\nDeploying MockVerifier...');
  const mockHash = await walletClient.deployContract({
    abi: mockVerifier.abi,
    bytecode: mockVerifier.bytecode,
    args: [],
    nonce: nonce++,
  });
  const mockReceipt = await publicClient.waitForTransactionReceipt({ hash: mockHash });
  const mockVerifierAddress = mockReceipt.contractAddress;
  console.log(`  MockVerifier: ${mockVerifierAddress}`);
  console.log(`  Tx: https://sepolia.basescan.org/tx/${mockHash}`);

  // 3. Deploy ReputationVerifier
  console.log('\nDeploying ReputationVerifier...');
  const repHash = await walletClient.deployContract({
    abi: repVerifier.abi,
    bytecode: repVerifier.bytecode,
    args: [mockVerifierAddress, registryAddress],
    nonce: nonce++,
  });
  const repReceipt = await publicClient.waitForTransactionReceipt({ hash: repHash });
  const repVerifierAddress = repReceipt.contractAddress;
  console.log(`  ReputationVerifier: ${repVerifierAddress}`);
  console.log(`  Tx: https://sepolia.basescan.org/tx/${repHash}`);

  // 4. Patch .env
  updateEnv('REGISTRY_ADDRESS', registryAddress);
  updateEnv('VERIFIER_ADDRESS', repVerifierAddress);

  console.log('\n✓ .env updated with contract addresses');
  console.log('\n=== Deployment complete ===');
  console.log(`REGISTRY_ADDRESS=${registryAddress}`);
  console.log(`VERIFIER_ADDRESS=${repVerifierAddress}`);
  console.log(`\nView on Basescan: https://sepolia.basescan.org/address/${repVerifierAddress}`);
}

main().catch((err) => {
  console.error('\nDeployment failed:', err.message);
  process.exit(1);
});
