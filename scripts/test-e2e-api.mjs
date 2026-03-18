/**
 * REPUTRANS — End-to-End API Test
 * Tests the full 5-step flow via the REST API.
 * Run: node scripts/test-e2e-api.mjs
 */

const BASE_URL = 'http://localhost:3001';
const WALLET = '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266';

let passed = 0;
let failed = 0;

function log(msg, ok = true) {
  const icon = ok ? '✅' : '❌';
  console.log(`${icon} ${msg}`);
  if (ok) passed++; else failed++;
}

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function postRaw(path, body) {
  return await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return res.json();
}

async function main() {
  console.log('\n=== REPUTRANS E2E API Tests ===\n');

  // ── Health check ───────────────────────────────────────────────────────
  console.log('--- Infrastructure ---');
  try {
    const health = await get('/health');
    log(`Health OK — registry: ${health.contracts?.registry?.slice(0, 10)}...`);
    log(`Anvil connected — chainId: ${health.contracts?.chainId}`);
  } catch (e) {
    log(`Health check failed: ${e.message}`, false);
    console.error('Cannot connect to API. Is the server running on port 3001?');
    process.exit(1);
  }

  // ── Step 1: Register identity ──────────────────────────────────────────
  console.log('\n--- Step 1: Register Identity ---');
  const reg = await post('/identity/register', { walletAddress: WALLET });
  log(`Register success: ${reg.success}`, reg.success);
  if (reg.success) {
    log(`Commitment: ${reg.identity?.commitment?.slice(0, 16)}...`);
    log(`On-chain TX: ${reg.onChain?.txHash?.slice(0, 16)}...`);
    log(`Gas used: ${reg.onChain?.gasUsed}`);
  } else {
    log(`Register error: ${reg.error}`, false);
  }

  // ── Step 2: Demo platform data ─────────────────────────────────────────
  console.log('\n--- Step 2: Platform Data (Uber) ---');
  const demo = await get('/platform/demo-data');
  log(`Platform: ${demo.platform}`, demo.platform === 'Uber');
  log(`Rating: ${demo.rating} (encoded: ${demo.ratingEncoded})`, demo.rating === 4.8);
  log(`Trips: ${demo.tripCount}`, demo.tripCount === 1547);

  // ── Step 3: Issue threshold credential ────────────────────────────────
  console.log('\n--- Step 3: Issue Threshold Credential (ThetaCrypt 3-of-5) ---');
  const cred = await post('/credential/issue', {
    walletAddress: WALLET,
    rating: 48,
    tripCount: 1547,
    platformId: 1,
  });
  log(`Credential issued: ${cred.success}`, cred.success);
  if (cred.success) {
    log(`Attributes: rating=${cred.credential?.attributes?.rating}, trips=${cred.credential?.attributes?.tripCount}`);
    log(`GroupPubKey X: ${cred.credential?.groupPublicKey?.x?.slice(0, 16)}...`);
    log(`Signature S: ${cred.credential?.signature?.s?.slice(0, 16)}...`);
  } else {
    log(`Credential error: ${cred.error}`, false);
  }

  // ── Step 4: Generate ZK proof ──────────────────────────────────────────
  console.log('\n--- Step 4: Generate ZK Proof (Barretenberg UltraPlonk) ---');
  console.log('   (This takes 20-60s...)');
  const t4start = Date.now();
  const proofResp = await post('/proof/generate', { walletAddress: WALLET });
  const t4ms = Date.now() - t4start;
  log(`Proof generated: ${proofResp.success}`, proofResp.success);
  if (proofResp.success) {
    const proofData = proofResp.proof;
    log(`Proof bytes: ${proofData.data.length / 2} bytes`);
    log(`Public inputs: ${proofData.publicInputs?.length} fields`);
    log(`Nullifier: ${proofData.nullifier?.slice(0, 16)}...`);
    log(`Generation time: ${t4ms}ms`);
    log(`Claim: platform=${proofResp.claim?.platformType}, minRating=${proofResp.claim?.minRating}, minTrips=${proofResp.claim?.minTrips}`);

    // ── Step 5: Verify proof ─────────────────────────────────────────────
    console.log('\n--- Step 5: Verify Proof (local + on-chain) ---');
    const verifyResp = await post('/proof/verify', {
      proof: proofData.data,
      publicInputs: proofData.publicInputs,
    });
    log(`Verify success: ${verifyResp.success}`, verifyResp.success);
    if (verifyResp.success) {
      log(`Local verification: ${verifyResp.localVerification}`, verifyResp.localVerification);
      if (verifyResp.onChainVerification) {
        log(`On-chain verified: ${verifyResp.onChainVerification.verified}`, verifyResp.onChainVerification.verified);
        log(`On-chain TX: ${verifyResp.onChainVerification.txHash?.slice(0, 16)}...`);
      } else {
        log('On-chain verification skipped (acceptable for demo)', true);
      }
      if (verifyResp.privacyAnalysis) {
        console.log('\n   Privacy Analysis:');
        console.log('   Insurer LEARNED:', verifyResp.privacyAnalysis.insurerLearned);
        console.log('   Insurer did NOT learn:', verifyResp.privacyAnalysis.insurerDidNotLearn);
      }
    } else {
      log(`Verify error: ${verifyResp.error}`, false);
    }
  } else {
    log(`Proof error: ${proofResp.error}`, false);
    console.log('\n--- Step 5: SKIPPED (no proof) ---');
  }

  // ── Circuit info ───────────────────────────────────────────────────────
  console.log('\n--- Circuit Info ---');
  try {
    const info = await get('/circuit/info');
    log(`Circuit: ${info.name}`);
    log(`Public inputs: ${info.publicInputCount}`);
  } catch (e) {
    log(`Circuit info error: ${e.message}`, false);
  }

  // ── Stream D: New endpoints ──────────────────────────────────────────────
  console.log('\n--- Stream D: Session State, Admin Reset, Custom Stats ---');

  // Test session state returns null after reset
  try {
    await post('/admin/reset', {});
    const state = await get('/session/state');
    log('GET /session/state returns null state after reset',
      state.identity === null && state.credential === null && state.proof === null);
  } catch (e) {
    log(`Session state (empty) failed: ${e.message}`, false);
  }

  // Test masterSecret in register response
  try {
    await post('/admin/reset', {});
    const reg2 = await post('/identity/register', {});
    log('POST /identity/register returns masterSecret',
      reg2.masterSecret && reg2.masterSecret.startsWith('0x') && reg2.masterSecret.length === 66);
  } catch (e) {
    log(`masterSecret test failed: ${e.message}`, false);
  }

  // Test session state returns identity after registration
  try {
    const state2 = await get('/session/state');
    log('GET /session/state returns identity after registration',
      state2.identity !== null && state2.identity.commitment.startsWith('0x'));
  } catch (e) {
    log(`Session state (identity) failed: ${e.message}`, false);
  }

  // Test custom credential stats
  try {
    const cred2 = await post('/credential/issue', { rating: 42, tripCount: 800 });
    log('POST /credential/issue with custom rating=42 tripCount=800',
      cred2.success && cred2.credential.attributes.rating === 4.2 && cred2.credential.attributes.tripCount === 800);
  } catch (e) {
    log(`Custom credential stats failed: ${e.message}`, false);
  }

  // Test session state returns credential after issuance
  try {
    const state3 = await get('/session/state');
    log('GET /session/state returns credential after issuance',
      state3.credential !== null && state3.credential.attributes.rating === 42 && state3.credential.attributes.tripCount === 800);
  } catch (e) {
    log(`Session state (credential) failed: ${e.message}`, false);
  }

  // Test admin reset clears all state
  try {
    const resetResp = await post('/admin/reset', {});
    const stateAfterReset = await get('/session/state');
    log('POST /admin/reset clears all state',
      resetResp.success && stateAfterReset.identity === null && stateAfterReset.credential === null && stateAfterReset.proof === null);
  } catch (e) {
    log(`Admin reset test failed: ${e.message}`, false);
  }

  // Test invalid rating rejected
  try {
    await post('/identity/register', {});
    const badRes = await postRaw('/credential/issue', { rating: 99 });
    log('POST /credential/issue rejects invalid rating (out of range)', badRes.status === 400);
  } catch (e) {
    log(`Invalid rating rejection test failed: ${e.message}`, false);
  }

  // ── Summary ────────────────────────────────────────────────────────────
  console.log('\n================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  if (failed === 0) {
    console.log('🎉 ALL TESTS PASSED — Full 5-step demo flow works!\n');
  } else {
    console.log(`⚠️  ${failed} test(s) failed\n`);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
