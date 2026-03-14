/**
 * REPUTRANS API Server
 *
 * Express server exposing the full user journey as REST endpoints.
 * Wires together: identity (U2SSO), threshold EdDSA (ThetaCrypt),
 * ZK proof generation (Noir/Barretenberg), and on-chain verification.
 */

import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from repo root
config({ path: resolve(import.meta.dirname, '../../../.env') });

import {
  createMasterIdentity,
  registerIdentity,
  getMerkleProof,
  getTreeState,
  computeNullifier,
} from './lib/identity.js';
import { pedersenHash } from './lib/pedersen.js';
import { issueThresholdCredential, getSignerDetails } from './lib/credential.js';
import {
  registerOnChain,
  verifyOnChain,
  getContractAddresses,
  setContractAddresses,
} from './lib/ethereum.js';
import { generateProof, verifyProofLocally, getCircuitInfo } from './lib/proof.js';
import type { MasterIdentity, ThresholdCredential } from './types/index.js';

const app = express();
app.use(cors());
app.use(express.json());

// BigInt JSON serialization support
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};

const PORT = process.env.PORT || 3001;

// In-memory session state (demo only)
let currentIdentity: MasterIdentity | null = null;
let currentLeafIndex: number | null = null;
let currentCredential: ThresholdCredential | null = null;

// ─── Health check ──────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  const tree = getTreeState();
  res.json({
    status: 'ok',
    contracts: getContractAddresses(),
    tree: { root: '0x' + tree.root.toString(16).padStart(64, '0'), size: tree.size },
  });
});

// ─── Step 1: Register master identity ──────────────────────────────────

app.post('/identity/register', async (_req, res) => {
  try {
    // Create master identity (U2SSO) — Pedersen commitment
    currentIdentity = await createMasterIdentity();

    // Register in anonymity set (builds Pedersen Merkle tree)
    const { leafIndex, merkleRoot, setIndex } = await registerIdentity(currentIdentity);
    currentLeafIndex = leafIndex;

    // Try on-chain registration (non-blocking if contracts not deployed)
    let txHash: string | null = null;
    let gasUsed: bigint | null = null;
    try {
      const onChain = await registerOnChain(currentIdentity.commitment, merkleRoot);
      txHash = onChain.txHash;
      gasUsed = onChain.gasUsed;
    } catch (e) {
      console.log('On-chain registration skipped (contracts may not be deployed):', (e as Error).message);
    }

    res.json({
      success: true,
      identity: {
        commitment: '0x' + currentIdentity.commitment.toString(16).padStart(64, '0'),
        leafIndex,
        setIndex,
        merkleRoot: '0x' + merkleRoot.toString(16).padStart(64, '0'),
      },
      onChain: txHash ? { txHash, gasUsed: gasUsed?.toString() } : null,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ─── Step 2: Get platform demo data ────────────────────────────────────

app.get('/platform/demo-data', (_req, res) => {
  // Uber has no public API for driver stats.
  // These are hardcoded demo values, explicitly labelled as such.
  res.json({
    platform: 'Uber',
    platformId: 0x00, // Uber = Rideshare type 0
    platformType: 0, // Rideshare
    rating: 4.8,
    ratingEncoded: 48, // 48 = 4.8 * 10
    tripCount: 1547,
    driverSince: '2019-03-15',
    note: 'Demo data - Uber API is not public. Values are representative.',
  });
});

// ─── Step 3: Issue threshold credential ────────────────────────────────

app.post('/credential/issue', async (_req, res) => {
  try {
    if (!currentIdentity) {
      return res.status(400).json({ error: 'Register identity first (POST /identity/register)' });
    }

    const attrs = {
      rating: 48, // 4.8 stars
      tripCount: 1547,
      platformId: 0x00, // Uber
      derivedKey: currentIdentity.derivedKey,
    };

    // Pre-compute credential_message matching circuit:
    // attr_hash = pedersen_hash([rating, trip_count, platform_id, derived_key])
    const credMsg = await pedersenHash([
      48n, 1547n, 0n, currentIdentity.derivedKey,
    ]);

    console.log('Issuing threshold credential...');
    currentCredential = await issueThresholdCredential(attrs, credMsg);
    console.log('Credential issued successfully');
    const signerDetails = getSignerDetails();

    res.json({
      success: true,
      credential: {
        attributes: {
          rating: attrs.rating / 10,
          tripCount: attrs.tripCount,
          platform: 'Uber',
        },
        signature: {
          r: {
            x: '0x' + currentCredential.signature.r.x.toString(16).padStart(64, '0'),
            y: '0x' + currentCredential.signature.r.y.toString(16).padStart(64, '0'),
          },
          s: '0x' + currentCredential.signature.s.toString(16).padStart(64, '0'),
        },
        groupPublicKey: signerDetails.groupPublicKey,
      },
      threshold: signerDetails,
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ─── Step 4: Generate ZK proof ─────────────────────────────────────────

app.post('/proof/generate', async (req, res) => {
  try {
    if (!currentIdentity || !currentCredential || currentLeafIndex === null) {
      return res.status(400).json({
        error: 'Complete steps 1-3 first (register, connect, issue credential)',
      });
    }

    const {
      minRating = 45,
      minTrips = 1000,
      platformType = 0,
    } = req.body;

    // Get Merkle proof for this identity
    const { path, indices, root } = getMerkleProof(currentLeafIndex);
    console.log('DEBUG proof inputs:');
    console.log('  leafIndex:', currentLeafIndex);
    console.log('  commitment:', currentIdentity.commitment.toString(16));
    console.log('  root:', root.toString(16));
    console.log('  path[0]:', path[0]?.toString(16));
    console.log('  indices[0]:', indices[0]);

    // Compute nullifier matching circuit: pedersen_hash([master_secret, platform_type])
    const nullifier = await computeNullifier(currentIdentity.secret, platformType);

    // Compute credential_message matching circuit:
    // attr_hash = pedersen_hash([rating, trip_count, platform_id, derived_key])
    const credentialMessage = await pedersenHash([
      48n,   // rating
      1547n, // trip_count
      0n,    // platform_id (Uber)
      currentIdentity.derivedKey,
    ]);

    const proofInputs = {
      nullifier: nullifier.toString(),
      anonymity_set_root: root.toString(),
      platform_type: platformType.toString(),
      min_rating_threshold: minRating.toString(),
      min_trips_threshold: minTrips.toString(),
      master_secret: currentIdentity.secret.toString(),
      credential_pub_key_x: currentCredential.groupPublicKey.x.toString(),
      credential_pub_key_y: currentCredential.groupPublicKey.y.toString(),
      credential_signature_s: currentCredential.signature.s.toString(),
      credential_signature_r8_x: currentCredential.signature.r.x.toString(),
      credential_signature_r8_y: currentCredential.signature.r.y.toString(),
      credential_message: credentialMessage.toString(),
      rating: '48',
      trip_count: '1547',
      platform_id: '0',
      merkle_path: path.map((p) => p.toString()),
      merkle_indices: indices.map((i) => i.toString()),
      platform_secret: currentIdentity.platformSecret.toString(),
    };

    const result = await generateProof(proofInputs);

    res.json({
      success: true,
      proof: {
        data: Buffer.from(result.proof).toString('hex'),
        publicInputs: result.publicInputs,
        nullifier: '0x' + (nullifier as bigint).toString(16).padStart(64, '0'),
        generationTimeMs: result.generationTimeMs,
      },
      claim: {
        platformType: platformType === 0 ? 'Rideshare' : 'Homeshare',
        minRating: minRating / 10,
        minTrips,
      },
    });
  } catch (error) {
    console.error('Proof generation error:', error);
    res.status(500).json({ error: (error as Error).message });
  }
});

// ─── Step 5: Verify proof on-chain ─────────────────────────────────────

app.post('/proof/verify', async (req, res) => {
  try {
    const { proof, publicInputs } = req.body;

    if (!proof || !publicInputs) {
      return res.status(400).json({ error: 'proof and publicInputs required' });
    }

    const proofBytes = Uint8Array.from(Buffer.from(proof, 'hex'));

    // First verify locally
    const localValid = await verifyProofLocally(proofBytes, publicInputs);

    // Then verify on-chain
    let onChainResult = null;
    try {
      onChainResult = await verifyOnChain(proofBytes, publicInputs);
    } catch (e) {
      console.log('On-chain verification skipped:', (e as Error).message);
    }

    res.json({
      success: true,
      localVerification: localValid,
      onChainVerification: onChainResult
        ? {
            verified: onChainResult.verified,
            txHash: onChainResult.txHash,
            gasUsed: onChainResult.gasUsed.toString(),
          }
        : null,
      privacyAnalysis: {
        insurerLearned: [
          'Verified rideshare driver',
          'Rating >= 4.5 stars',
          'Trip count >= 1,000',
          'Credential signed by threshold committee',
        ],
        insurerDidNotLearn: [
          'Platform = Uber (only type "Rideshare" revealed)',
          'Rating = 4.8 (only ">= 4.5" proven)',
          'Trip count = 1,547 (only ">= 1,000" proven)',
          'Driver identity or account',
          'Link to any other application',
        ],
      },
    });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ─── Circuit info ──────────────────────────────────────────────────────

app.get('/circuit/info', async (_req, res) => {
  try {
    const info = await getCircuitInfo();
    res.json(info);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
});

// ─── Contract addresses config ─────────────────────────────────────────

app.post('/config/contracts', (req, res) => {
  const { registry, verifier } = req.body;
  if (registry && verifier) {
    setContractAddresses(registry, verifier);
    res.json({ success: true, contracts: getContractAddresses() });
  } else {
    res.status(400).json({ error: 'registry and verifier addresses required' });
  }
});

// ─── Start server ──────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`REPUTRANS API running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  POST /identity/register  - Step 1: Create master identity');
  console.log('  GET  /platform/demo-data - Step 2: View demo Uber data');
  console.log('  POST /credential/issue   - Step 3: Threshold credential issuance');
  console.log('  POST /proof/generate     - Step 4: Generate ZK proof');
  console.log('  POST /proof/verify       - Step 5: On-chain verification');
});
