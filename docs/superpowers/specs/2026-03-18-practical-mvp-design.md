# REPUTRANS — Practical MVP Design Spec
**Date:** 2026-03-18
**Status:** Approved
**Context:** Shape Rotator Hackathon (Encode Club) + potential accelerator entry
**Goal:** Transform working ZK tech demo into a convincing, navigable product

---

## Problem Statement

The current app is technically complete (25/25 API tests pass, full ZK proof pipeline works) but feels like a developer tool, not a product:

- User's master key is generated but never shown to them
- Platform stats are hardcoded (no user agency)
- The flow dead-ends after Step 5 — no home, no summary
- No easy demo reset — requires killing the server and clearing localStorage manually
- The privacy story (what the verifier sees vs. what stays private) is never demonstrated end-to-end

---

## Solution Overview

Three additions on top of the existing 5-step wizard:

1. **Wizard Polish** — show the master key, allow custom stats, improve each step's UX
2. **Dashboard** — a home page users land on after completing the flow, showing their identity/credential/proof summary with a demo reset button
3. **Verifier URL** — a shareable read-only page showing exactly what a verifier/insurer sees (claims proven, data not revealed, on-chain confirmation)

Plus two new API endpoints supporting the above.

---

## Architecture

No new packages. No new dependencies. Stays within the existing stack:
- **Frontend:** Next.js App Router, Tailwind CSS — add new routes `/dashboard` and `/shared-proof`
- **API:** Express + TypeScript — add `GET /session/state` and `POST /admin/reset`, extend `POST /credential/issue` to accept optional body params
- **No changes to:** circuits, contracts, ZK proof pipeline, threshold EdDSA, Pedersen/Merkle logic

---

## Parallel Workstreams

**These four streams are independent and MUST be executed in parallel by separate agents.**
Each agent owns their stream end-to-end: implementation + tests. No agent marks done until `pnpm test:e2e` passes for the full suite.

---

### Stream A — Wizard Polish
**Owner:** Agent A
**Files:** `packages/frontend/app/register/page.tsx`, `connect/page.tsx`, `credential/page.tsx`, `prove/page.tsx`, `verify/page.tsx`

#### Changes

**Step 1 — Register (`/register`)**
- After successful registration, display the master secret (the raw bigint from `data.masterSecret`) in a styled "Save your key" card
- Copy-to-clipboard button
- Warning: "This key is your identity. If you lose it, you cannot recover your account."
- **Dependency on Stream D:** `masterSecret` is NOT currently returned by `/identity/register`. Stream D adds it. Agent A must handle the case where the field is absent (show a placeholder until Stream D is merged, or coordinate with Agent D first).
- Navigation: "Next" button only appears after user has seen the key (track with local state)

**Step 2 — Connect (`/connect`)**
- Add two editable inputs before the "Connect" button: **Rating** (0.0–5.0, default 4.8) and **Trip Count** (integer, default 1547)
- Store these in `sessionStorage` as `customStats: { rating, tripCount }` via `saveState('customStats', ...)` — consistent with how all other frontend state is stored in this app
- Pass them through to the credential step (already stored in `saveState`)
- Keep the "Demo data" badge — just make the values editable

**Step 3–4 — No structural changes** — minor copy tweaks only (already good)

**Step 5 — Verify (`/verify`)**
- After successful verification, show a "Share Your Proof" button
- Constructs the verifier URL: `/shared-proof?proof=<hex>&inputs=<json-encoded-public-inputs>`
- Copy-to-clipboard
- Add a "Go to Dashboard" button alongside "Share Your Proof"
- On click: redirect to `/dashboard`

#### Tests (new file: `tests/e2e/wizard-polish.spec.ts`)
- Master key is displayed on register page after registration
- Copy button exists on register page
- Rating and trip count inputs are present on connect page with correct defaults
- Custom values (e.g. rating=4.2, trips=800) persist after page interaction
- After verify, "Share Your Proof" button is present
- After verify, "Go to Dashboard" button is present and navigates correctly

---

### Stream B — Dashboard Page
**Owner:** Agent B
**Files:** `packages/frontend/app/dashboard/page.tsx` (new), `packages/frontend/app/lib/api.ts`

#### New route: `/dashboard`

A summary page with four sections:

**Identity card**
- Shows: commitment (truncated, 0x + first 8 + ... + last 6 chars), leaf index, set index, Merkle root
- Does NOT show master secret (that was shown once at Step 1)

**Credential card**
- Shows: platform type (Rideshare), rating proved (4.8★ or whatever custom value), trip count, "Certified by 3-of-5 committee"
- Greyed out / "Not yet issued" state if no credential in session

**Proof card**
- Shows: nullifier (truncated), generation time, proof size (bytes), "Verified on-chain ✓" badge
- Greyed out if no proof in session
- "Share Proof" button — same verifier URL construction as Stream A

**Demo Controls**
- "Reset Demo" button — calls `POST /admin/reset`, clears sessionStorage (all `reputrans_*` keys), redirects to `/register`
- Styled as a secondary/danger action (not prominent — small, bottom of page)

**Hydration**
- On mount, call `GET /session/state` to populate the cards
- If API returns empty state AND sessionStorage has no `reputrans_*` keys, show empty state with "Start your journey" → `/register`

#### Tests (new file: `tests/e2e/dashboard.spec.ts`)
- Dashboard shows correct identity data after completing Steps 1–2
- Dashboard shows credential data after Step 3
- Dashboard shows proof data after Steps 4–5
- Reset button clears state and redirects to `/register`
- After reset, `/session/state` returns empty
- After reset, sessionStorage is cleared (no `reputrans_*` keys)

---

### Stream C — Verifier URL
**Owner:** Agent C
**Files:** `packages/frontend/app/shared-proof/page.tsx` (new)

#### New route: `/shared-proof`

Read-only page. Accepts query params: `proof` (hex string) and `inputs` (URL-encoded JSON array of public inputs).

**On load:**
1. Parse `proof` and `inputs` from URL params
2. Call `POST /proof/verify` with the decoded values
3. Show loading state while verifying

**On verified result — display:**

```
┌─ PROOF VERIFIED ON-CHAIN ─────────────────────────────────┐
│  ✓  Confirmed · Anvil Sepolia Fork · TX: 0x3f9a...b2c1    │
└────────────────────────────────────────────────────────────┘

WHAT THIS PERSON HAS PROVEN
  🚗 Platform type: Rideshare
  ⭐ Rating:        ≥ 4.5 stars
  🗺️ Trips:         ≥ 1,000

🔒 NOT REVEALED TO YOU
  Driver identity · Exact rating · Exact trip count
  Which platform (Uber/Lyft/etc.) · Account or name

CREDENTIAL SIGNED BY
  3-of-5 threshold committee · ThetaCrypt EdDSA · Baby Jubjub
  "No single validator — including the platform — can forge or revoke this credential alone."
```

**On failed verification:** Show error state with red badge.

**URL construction** (used by Streams A and B):
```
/shared-proof?proof=<proofHex>&inputs=<encodeURIComponent(JSON.stringify(publicInputs))>
```
If the URL exceeds ~8KB (proof hex alone is ~4KB), truncate gracefully with an error message.

#### Tests (new file: `tests/e2e/verifier-url.spec.ts`)
- After full flow, "Share Your Proof" constructs a valid `/shared-proof` URL
- Opening the URL shows "Proof Verified" state
- All three claim cards are present (platform, rating, trips)
- "Not revealed" section is present
- Opening the URL with invalid proof shows error state

---

### Stream D — API Additions
**Owner:** Agent D
**Files:** `packages/api/src/server.ts`

#### New endpoint: `GET /session/state`

Returns the current in-memory session as a JSON object. Safe to call at any time.

```typescript
{
  identity: {
    commitment: string | null,  // hex
    leafIndex: number | null,
    setIndex: number | null,
    merkleRoot: string | null
  } | null,
  credential: {
    attributes: { rating: number, tripCount: number, platform: string } | null,
    threshold: { threshold: number, totalSigners: number } | null
  } | null,
  proof: {
    nullifier: string | null,    // hex
    generationTimeMs: number | null,
    proofSizeBytes: number | null
  } | null
}
```

Never expose: `masterSecret`, `derivedKey`, raw signature bytes.

#### New endpoint: `POST /admin/reset`

```typescript
// Clears all server-side session state
currentIdentity = null;
currentLeafIndex = null;
currentCredential = null;
currentProof = null;  // see currentProof below
// Does NOT reset the Merkle tree (intentional — anonymity set grows)
res.json({ success: true });
```

#### New session variable: `currentProof`

Add a new module-level variable to `server.ts`:
```typescript
let currentProof: { nullifier: string; generationTimeMs: number; proofSizeBytes: number } | null = null;
```
Populate it in `POST /proof/generate` after a successful proof is generated. Used by `GET /session/state` and cleared by `POST /admin/reset`.

#### Extended endpoint: `POST /credential/issue`

Accept optional body: `{ rating?: number, tripCount?: number }`
- If provided, use these values instead of hardcoded `48` / `1547`
- `rating` is the raw integer (48 = 4.8 stars) — frontend should multiply by 10
- Validate: `rating` must be 10–50, `tripCount` must be 1–99999
- Store custom values in `currentCredential` so `GET /session/state` returns them

**Critical:** `POST /proof/generate` currently hardcodes `48n` and `1547n` in the `credentialMessage` Pedersen hash. This **must** be updated to use the values stored in `currentCredential.attributes` (rating and tripCount) instead of literals. Failure to do this will cause a circuit mismatch and proof generation failure when custom stats are used.

Also: `POST /identity/register` — return `masterSecret` in the response (currently it's created but not returned). Add `masterSecret: '0x' + currentIdentity.secret.toString(16).padStart(64, '0')` to the response body. **This is the only time it is ever sent over the wire.**

#### Tests (new file in `packages/api/` or extend existing test script)
- `GET /session/state` returns null state before registration
- `GET /session/state` returns identity after registration
- `GET /session/state` returns credential after issuance
- `POST /admin/reset` clears identity/credential/proof
- `POST /credential/issue` with custom `{ rating: 42, tripCount: 800 }` uses those values
- `POST /identity/register` response includes `masterSecret`

---

## Demo Reset Flow

```
Dashboard → "Reset Demo"
  → POST /admin/reset (clears server state: currentIdentity, currentCredential, currentProof)
  → clear all sessionStorage keys matching prefix "reputrans_"
  → redirect to /register
```

On `/register`, the user starts fresh as a new anonymous identity. The Merkle tree retains previous leaves (the anonymity set grows with each demo — this is correct behaviour per U2SSO).

---

## Out of Scope

- Real Uber API integration
- TEE/secure enclave
- Real Sepolia deployment (tracked separately in reputrans.md)
- Multi-user sessions / authentication
- Full two-sided verifier portal (just the shareable URL is sufficient)
- Changing the ZK circuits or contracts

---

## Completion Criteria

Each stream: all new Playwright tests pass + full existing suite (`pnpm test:e2e`) passes.
Overall: A user can go Register → Connect (custom stats) → Credential → Prove → Verify → Dashboard → Share Proof URL → Reset → Register again, all without touching the terminal.

---

## For the Executing Agent

**YOU MUST USE TWO WAVES OF PARALLEL AGENTS.** Do not execute streams sequentially.

### Dependency Map

| Stream | Depends on | Can start immediately? |
|--------|-----------|----------------------|
| D (API Additions) | Nothing | ✅ Yes |
| C (Verifier URL) | Nothing | ✅ Yes |
| A (Wizard Polish) | Stream D (masterSecret + custom stats endpoints) | ❌ Wave 2 |
| B (Dashboard) | Stream D (GET /session/state) | ❌ Wave 2 |

### Wave 1 — Spawn 2 agents in parallel

```
Agent D → Stream D (API Additions)   — ~30-60 mins, smallest stream
Agent C → Stream C (Verifier URL)    — independent, no deps
```

Wait for **both Wave 1 agents to complete and pass tests** before proceeding.

### Wave 2 — Spawn 2 agents in parallel

```
Agent A → Stream A (Wizard Polish)   — now unblocked (D is done)
Agent B → Stream B (Dashboard)       — now unblocked (D is done)
```

Wait for **both Wave 2 agents to complete and pass tests**.

### Done

Run the full E2E suite one final time across all streams: `pnpm test:e2e`

**Each agent's exit condition:** All new tests written, all tests green. No exceptions.
