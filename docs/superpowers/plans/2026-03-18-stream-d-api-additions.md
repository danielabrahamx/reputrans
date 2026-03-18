# Stream D: API Additions — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `GET /session/state`, `POST /admin/reset`, expose `masterSecret` on register, accept custom stats on credential issue, and propagate custom stats through proof generation.

**Architecture:** All changes are in `packages/api/src/server.ts`. Add a `currentProof` module-level variable, wire custom credential values through the proof pipeline, and expose two new endpoints. No new files needed.

**Tech Stack:** Express 5, TypeScript, existing Pedersen/Merkle/ThetaCrypt libs (untouched)

**Spec:** `docs/superpowers/specs/2026-03-18-practical-mvp-design.md` — Stream D section

**Wave:** 1 (no dependencies — run this first, parallel with Stream C)

**Exit condition:** All new API tests pass + existing `scripts/test-e2e-api.mjs` still 25/25

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `packages/api/src/server.ts` | Modify | Add `currentProof` var, expose masterSecret, custom stats, new endpoints |
| `scripts/test-e2e-api.mjs` | Modify | Add tests for all new/changed endpoints |

---

## Chunk 1: currentProof variable + /admin/reset + /session/state

### Task 1: Add `currentProof` session variable and `POST /admin/reset`

**Files:**
- Modify: `packages/api/src/server.ts`

- [ ] **Step 1: Read the current session variables block**

Open `packages/api/src/server.ts`. Find this block (around line 47):
```typescript
// In-memory session state (demo only)
let currentIdentity: MasterIdentity | null = null;
let currentLeafIndex: number | null = null;
let currentCredential: ThresholdCredential | null = null;
```

- [ ] **Step 2: Add `currentProof` variable after `currentCredential`**

```typescript
// In-memory session state (demo only)
let currentIdentity: MasterIdentity | null = null;
let currentLeafIndex: number | null = null;
let currentCredential: ThresholdCredential | null = null;
let currentProof: {
  nullifier: string;
  generationTimeMs: number;
  proofSizeBytes: number;
} | null = null;
```

- [ ] **Step 3: Add `POST /admin/reset` endpoint**

Add after the health check endpoint (`app.get('/health', ...)`):

```typescript
// ─── Demo reset ────────────────────────────────────────────────────────

app.post('/admin/reset', (_req, res) => {
  currentIdentity = null;
  currentLeafIndex = null;
  currentCredential = null;
  currentProof = null;
  // Intentionally does NOT reset Merkle tree — anonymity set grows with each demo
  res.json({ success: true });
});
```

- [ ] **Step 4: Build and smoke-test**

```bash
cd packages/api && pnpm build
```
Expected: no TypeScript errors.

```bash
node dist/server.js &
curl -s -X POST http://localhost:3001/admin/reset | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d)))"
```
Expected: `{ success: true }`

```bash
kill %1
```

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/api/src/server.ts
git commit -m "feat(api): add currentProof session var and POST /admin/reset"
```

---

### Task 2: Add `GET /session/state`

**Files:**
- Modify: `packages/api/src/server.ts`

- [ ] **Step 1: Add the endpoint**

Add after `POST /admin/reset`:

```typescript
// ─── Session state (for dashboard hydration) ───────────────────────────

app.get('/session/state', (_req, res) => {
  res.json({
    identity: currentIdentity
      ? {
          commitment: '0x' + currentIdentity.commitment.toString(16).padStart(64, '0'),
          leafIndex: currentLeafIndex,
          setIndex: null, // set during registration, not stored separately — see register response
          merkleRoot: null, // same — snapshot at registration time
        }
      : null,
    credential: currentCredential
      ? {
          attributes: {
            rating: (currentCredential as any).customRating ?? 48,
            tripCount: (currentCredential as any).customTripCount ?? 1547,
            platform: 'Uber',
          },
          threshold: {
            threshold: 3,
            totalSigners: 5,
          },
        }
      : null,
    proof: currentProof ?? null,
  });
});
```

> **Note:** `setIndex` and `merkleRoot` are returned at registration time and stored in frontend sessionStorage. The dashboard should read these from sessionStorage (`loadState('identity').setIndex` etc.) rather than re-fetching from API. The `/session/state` endpoint is for server-side state that can't be recovered from sessionStorage (nullifier, proof metrics, credential details).

- [ ] **Step 2: Build and test**

```bash
cd packages/api && pnpm build && node dist/server.js &
curl -s http://localhost:3001/session/state
```
Expected:
```json
{"identity":null,"credential":null,"proof":null}
```

```bash
kill %1
```

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/api/src/server.ts
git commit -m "feat(api): add GET /session/state endpoint"
```

---

## Chunk 2: Expose masterSecret + custom credential stats

### Task 3: Return `masterSecret` from `POST /identity/register`

**Files:**
- Modify: `packages/api/src/server.ts`

- [ ] **Step 1: Find the register response**

In `POST /identity/register`, find the `res.json({...})` call. It currently returns:
```typescript
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
```

- [ ] **Step 2: Add masterSecret to the response**

```typescript
res.json({
  success: true,
  identity: {
    commitment: '0x' + currentIdentity.commitment.toString(16).padStart(64, '0'),
    leafIndex,
    setIndex,
    merkleRoot: '0x' + merkleRoot.toString(16).padStart(64, '0'),
  },
  masterSecret: '0x' + currentIdentity.secret.toString(16).padStart(64, '0'),
  onChain: txHash ? { txHash, gasUsed: gasUsed?.toString() } : null,
});
```

> **Security note:** This is the only endpoint that ever sends the master secret over the wire. It is sent once, immediately after generation, over localhost. The frontend must display it and never send it back to the server.

- [ ] **Step 3: Build and smoke-test**

```bash
cd packages/api && pnpm build && node dist/server.js &
curl -s -X POST http://localhost:3001/identity/register | node -p "JSON.stringify(JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')),null,2)"
```
Expected: response includes `"masterSecret": "0x..."` (64-char hex after 0x prefix).

```bash
kill %1
```

- [ ] **Step 4: Commit**

```bash
cd ../..
git add packages/api/src/server.ts
git commit -m "feat(api): expose masterSecret in register response (sent once, localhost only)"
```

---

### Task 4: Accept custom `rating` and `tripCount` in `POST /credential/issue`

**Files:**
- Modify: `packages/api/src/server.ts`

- [ ] **Step 1: Find the credential issue handler**

Find `app.post('/credential/issue', ...)`. The `attrs` block currently reads:
```typescript
const attrs = {
  rating: 48, // 4.8 stars
  tripCount: 1547,
  platformId: 0x00, // Uber
  derivedKey: currentIdentity.derivedKey,
};
```

- [ ] **Step 2: Extract and validate custom values from request body**

Replace the `attrs` block and the `pedersenHash` call that follows it:

```typescript
// Accept optional custom stats from frontend (editable on Step 2)
const rawRating = req.body?.rating;
const rawTripCount = req.body?.tripCount;

// Validate if provided
let rating = 48; // default: 4.8 stars encoded as integer
let tripCount = 1547; // default
if (rawRating !== undefined) {
  const r = Number(rawRating);
  if (!Number.isInteger(r) || r < 10 || r > 50) {
    return res.status(400).json({ error: 'rating must be integer 10–50 (e.g. 48 = 4.8 stars)' });
  }
  rating = r;
}
if (rawTripCount !== undefined) {
  const t = Number(rawTripCount);
  if (!Number.isInteger(t) || t < 1 || t > 99999) {
    return res.status(400).json({ error: 'tripCount must be integer 1–99999' });
  }
  tripCount = t;
}

const attrs = {
  rating,
  tripCount,
  platformId: 0x00, // Uber
  derivedKey: currentIdentity.derivedKey,
};

const credMsg = await pedersenHash([
  BigInt(rating), BigInt(tripCount), 0n, currentIdentity.derivedKey,
]);
```

- [ ] **Step 3: Store custom values on `currentCredential` for `/session/state`**

After `currentCredential = await issueThresholdCredential(attrs, credMsg);`, add:

```typescript
// Attach custom values so /session/state can return them
(currentCredential as any).customRating = rating;
(currentCredential as any).customTripCount = tripCount;
```

- [ ] **Step 4: Build**

```bash
cd packages/api && pnpm build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/api/src/server.ts
git commit -m "feat(api): accept optional rating/tripCount in /credential/issue"
```

---

### Task 5: Fix `POST /proof/generate` to use stored credential values

**Files:**
- Modify: `packages/api/src/server.ts`

> **Critical:** `/proof/generate` currently hardcodes `48n` and `1547n` in the `credentialMessage` Pedersen hash. If custom stats were used in `/credential/issue`, this will cause a circuit mismatch and proof failure.

- [ ] **Step 1: Find the hardcoded values in `/proof/generate`**

Find the `credentialMessage` computation in `POST /proof/generate`:
```typescript
const credentialMessage = await pedersenHash([
  48n,   // rating
  1547n, // trip_count
  0n,    // platform_id (Uber)
  currentIdentity.derivedKey,
]);
```

- [ ] **Step 2: Replace with values from `currentCredential`**

```typescript
const storedRating = BigInt((currentCredential as any).customRating ?? 48);
const storedTripCount = BigInt((currentCredential as any).customTripCount ?? 1547);

const credentialMessage = await pedersenHash([
  storedRating,
  storedTripCount,
  0n,    // platform_id (Uber)
  currentIdentity.derivedKey,
]);
```

- [ ] **Step 3: Also populate `currentProof` after successful proof generation**

Find where `res.json({...})` is called in `POST /proof/generate`. Before it, add:

```typescript
currentProof = {
  nullifier: '0x' + (nullifier as bigint).toString(16).padStart(64, '0'),
  generationTimeMs: result.generationTimeMs,
  proofSizeBytes: result.proof.length,
};
```

- [ ] **Step 4: Build**

```bash
cd packages/api && pnpm build
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/api/src/server.ts
git commit -m "fix(api): use stored credential values in proof/generate; populate currentProof"
```

---

## Chunk 3: Tests

### Task 6: Write and run API tests for all new/changed endpoints

**Files:**
- Modify: `scripts/test-e2e-api.mjs` (or create `scripts/test-stream-d.mjs` if preferred)

- [ ] **Step 1: Read the existing test script for patterns**

```bash
head -60 scripts/test-e2e-api.mjs
```
Use the same `test()` helper pattern.

- [ ] **Step 2: Add tests at the end of the existing script (or new file)**

Add these test cases:

```javascript
// ── Stream D: New endpoints ──────────────────────────────────────────────

await test('GET /session/state returns null state before registration', async () => {
  // Reset first
  await fetch(`${BASE}/admin/reset`, { method: 'POST' });
  const res = await fetch(`${BASE}/session/state`);
  const data = await res.json();
  assert(data.identity === null, 'identity should be null');
  assert(data.credential === null, 'credential should be null');
  assert(data.proof === null, 'proof should be null');
});

await test('POST /identity/register response includes masterSecret', async () => {
  await fetch(`${BASE}/admin/reset`, { method: 'POST' });
  const res = await fetch(`${BASE}/identity/register`, { method: 'POST' });
  const data = await res.json();
  assert(data.masterSecret, 'masterSecret should be present');
  assert(data.masterSecret.startsWith('0x'), 'masterSecret should be hex');
  assert(data.masterSecret.length === 66, 'masterSecret should be 32 bytes = 66 chars with 0x');
});

await test('GET /session/state returns identity after registration', async () => {
  const res = await fetch(`${BASE}/session/state`);
  const data = await res.json();
  assert(data.identity !== null, 'identity should be present after registration');
  assert(data.identity.commitment.startsWith('0x'), 'commitment should be hex');
});

await test('POST /credential/issue with custom rating=42 tripCount=800 uses those values', async () => {
  const res = await fetch(`${BASE}/credential/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: 42, tripCount: 800 }),
  });
  const data = await res.json();
  assert(data.success, 'credential issue should succeed');
  assert(data.credential.attributes.rating === 4.2, `expected 4.2, got ${data.credential.attributes.rating}`);
  assert(data.credential.attributes.tripCount === 800, `expected 800, got ${data.credential.attributes.tripCount}`);
});

await test('GET /session/state returns credential after issuance', async () => {
  const res = await fetch(`${BASE}/session/state`);
  const data = await res.json();
  assert(data.credential !== null, 'credential should be present');
  assert(data.credential.attributes.rating === 42, 'should reflect custom rating (raw integer)');
  assert(data.credential.attributes.tripCount === 800, 'should reflect custom tripCount');
});

await test('POST /admin/reset clears all state', async () => {
  const res = await fetch(`${BASE}/admin/reset`, { method: 'POST' });
  const data = await res.json();
  assert(data.success, 'reset should return success');
  const state = await (await fetch(`${BASE}/session/state`)).json();
  assert(state.identity === null, 'identity should be cleared');
  assert(state.credential === null, 'credential should be cleared');
  assert(state.proof === null, 'proof should be cleared');
});

await test('POST /credential/issue rejects invalid rating (out of range)', async () => {
  await fetch(`${BASE}/identity/register`, { method: 'POST' });
  const res = await fetch(`${BASE}/credential/issue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rating: 99 }),
  });
  assert(res.status === 400, `expected 400, got ${res.status}`);
});
```

- [ ] **Step 3: Run the full test script**

Start services first:
```bash
# Terminal 1: Start Anvil
anvil --fork-url https://ethereum-sepolia-rpc.publicnode.com --port 8545

# Terminal 2: Build and start API
cd packages/api && pnpm build && node dist/server.js
```

Run tests:
```bash
node scripts/test-e2e-api.mjs
```
Expected: all tests pass including existing 25 + new Stream D tests.

- [ ] **Step 4: Commit**

```bash
git add scripts/test-e2e-api.mjs
git commit -m "test(api): add Stream D tests for session/state, admin/reset, custom credential stats"
```

---

## Done

Stream D is complete when:
- [ ] `pnpm build` in `packages/api` succeeds with no errors
- [ ] All API tests pass (`node scripts/test-e2e-api.mjs`)
- [ ] `POST /admin/reset` returns `{ success: true }`
- [ ] `GET /session/state` returns correct shape at each stage
- [ ] `POST /identity/register` returns `masterSecret`
- [ ] `POST /credential/issue` with `{ rating: 42, tripCount: 800 }` works and proof generation succeeds with those values
