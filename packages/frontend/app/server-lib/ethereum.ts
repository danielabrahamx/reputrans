/**
 * Ethereum contract interaction via viem (Base Sepolia testnet)
 *
 * Handles:
 * - Contract deployment reference
 * - Identity registration on U2SSORegistry
 * - Proof verification on ReputationVerifier
 */

import {
  createWalletClient,
  createPublicClient,
  http,
  type Address,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';

// Load from environment (lazy — read at call time so env has been set)
const getPrivateKey = () => process.env.PRIVATE_KEY as Hex;
const getRpcUrl = () => process.env.BASE_SEPOLIA_RPC_URL || 'https://sepolia.base.org';

// Contract addresses (set after deployment)
const getRegistryAddress = () => (process.env.REGISTRY_ADDRESS as Address) || null;
const getVerifierAddress = () => (process.env.VERIFIER_ADDRESS as Address) || null;

// Keep legacy let vars for compatibility with setters below
let registryAddress: Address | null = null;
let verifierAddress: Address | null = null;

// ABIs (minimal for the functions we call)
const REGISTRY_ABI = [
  {
    name: 'registerMasterIdentity',
    type: 'function',
    stateMutability: 'payable',
    inputs: [
      { name: 'identityCommitment', type: 'bytes32' },
      { name: 'newRoot', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'getAnonymitySetRoot',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'setIndex', type: 'uint256' }],
    outputs: [{ name: '', type: 'bytes32' }],
  },
  {
    name: 'currentSetIndex',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'setMemberCount',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

const VERIFIER_ABI = [
  {
    name: 'verifyReputation',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'proof', type: 'bytes' },
      { name: 'publicInputs', type: 'bytes32[]' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'usedNullifiers',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: '', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'ReputationVerified',
    type: 'event',
    inputs: [
      { name: 'requester', type: 'address', indexed: true },
      { name: 'platformType', type: 'uint8', indexed: false },
      { name: 'minRating', type: 'uint8', indexed: false },
      { name: 'minTrips', type: 'uint256', indexed: false },
      { name: 'nullifier', type: 'bytes32', indexed: false },
    ],
  },
] as const;

function getAccount() {
  const pk = getPrivateKey();
  if (!pk) throw new Error('PRIVATE_KEY not set in environment');
  return privateKeyToAccount(pk.startsWith('0x') ? pk : `0x${pk}`);
}

function getPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });
}

function getWalletClient() {
  return createWalletClient({
    account: getAccount(),
    chain: baseSepolia,
    transport: http(getRpcUrl()),
  });
}

/** Set contract addresses (called after deployment) */
export function setContractAddresses(registry: Address, verifier: Address): void {
  registryAddress = registry;
  verifierAddress = verifier;
}

/** Register identity commitment on U2SSORegistry */
export async function registerOnChain(
  commitment: bigint,
  merkleRoot: bigint
): Promise<{ txHash: string; gasUsed: bigint }> {
  const addr = registryAddress || getRegistryAddress();
  if (!addr) throw new Error('Registry address not set');
  registryAddress = addr;

  const commitmentHex = ('0x' + commitment.toString(16).padStart(64, '0')) as Hex;
  const rootHex = ('0x' + merkleRoot.toString(16).padStart(64, '0')) as Hex;

  const wallet = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await wallet.writeContract({
    address: registryAddress,
    abi: REGISTRY_ABI,
    functionName: 'registerMasterIdentity',
    args: [commitmentHex, rootHex],
    value: 0n,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    txHash: hash,
    gasUsed: receipt.gasUsed,
  };
}

/** Submit proof for on-chain verification */
export async function verifyOnChain(
  proof: Uint8Array,
  publicInputs: string[]
): Promise<{ txHash: string; gasUsed: bigint; verified: boolean }> {
  const vaddr = verifierAddress || getVerifierAddress();
  if (!vaddr) throw new Error('Verifier address not set');
  verifierAddress = vaddr;

  const proofHex = ('0x' + Buffer.from(proof).toString('hex')) as Hex;
  const inputsHex = publicInputs.map(
    (pi) => ('0x' + BigInt(pi).toString(16).padStart(64, '0')) as Hex
  );

  const wallet = getWalletClient();
  const publicClient = getPublicClient();

  const hash = await wallet.writeContract({
    address: verifierAddress,
    abi: VERIFIER_ABI,
    functionName: 'verifyReputation',
    args: [proofHex, inputsHex],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  return {
    txHash: hash,
    gasUsed: receipt.gasUsed,
    verified: receipt.status === 'success',
  };
}

/** Get contract status */
export function getContractAddresses(): {
  registry: string | null;
  verifier: string | null;
  rpcUrl: string;
  chainId: number;
} {
  return {
    registry: registryAddress || getRegistryAddress(),
    verifier: verifierAddress || getVerifierAddress(),
    rpcUrl: getRpcUrl(),
    chainId: 84532,
  };
}
