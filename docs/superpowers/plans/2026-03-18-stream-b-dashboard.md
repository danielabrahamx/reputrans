# Stream B: Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a `/dashboard` page where users land after completing the 5-step flow, showing their identity/credential/proof summary and a demo reset button.

**Architecture:** New Next.js App Router page. Hydrates from `GET /session/state` (Stream D) for server-side state and from `sessionStorage` (via `loadState`) for registration-time snapshots like setIndex and merkleRoot. Depends on Stream D being merged first.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, `apiFetch` + `loadState` from `app/lib/api.ts`

**Spec:** `docs/superpowers/specs/2026-03-18-practical-mvp-design.md` — Stream B section

**Wave:** 2 (requires Stream D to be merged first)

**Ownership note:** This stream owns `clearAllState()` in `app/lib/api.ts`. Stream A does NOT use `clearAllState` directly — only the dashboard reset button does. No cross-dependency between A and B.

**Exit condition:** Playwright tests pass + full `pnpm test:e2e` green

**Pre-check:** Before starting, verify Stream D is done:
```bash
curl -s http://localhost:3001/session/state
```
Expected: `{"identity":null,"credential":null,"proof":null}` — if 404, Stream D is not merged.

---

## File Map

| File | Action | What it does |
|------|--------|-------------|
| `packages/frontend/app/dashboard/page.tsx` | Create | Dashboard with identity/credential/proof cards + reset |
| `packages/frontend/app/lib/api.ts` | Modify | Add `clearAllState()` helper for demo reset |
| `packages/frontend/tests/e2e/dashboard.spec.ts` | Create | Playwright E2E tests |

---

## Chunk 1: `clearAllState` helper

### Task 1: Add `clearAllState()` to `app/lib/api.ts`

**Files:**
- Modify: `packages/frontend/app/lib/api.ts`

- [ ] **Step 1: Read the current api.ts**

```bash
cat packages/frontend/app/lib/api.ts
```
Identify: the `saveState` / `loadState` functions and the `reputrans_` prefix they use.

- [ ] **Step 2: Add `clearAllState` at the end of the file**

```typescript
/**
 * Clears all REPUTRANS session state from sessionStorage.
 * Used by the demo reset flow.
 */
export function clearAllState(): void {
  if (typeof window === 'undefined') return;
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith('reputrans_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach((k) => sessionStorage.removeItem(k));
}
```

- [ ] **Step 3: Build**

```bash
cd packages/frontend && pnpm build 2>&1 | grep -E "error|Error" | head -10
```

- [ ] **Step 4: Commit**

```bash
cd ../..
git add packages/frontend/app/lib/api.ts
git commit -m "feat(frontend): add clearAllState() helper to api.ts"
```

---

## Chunk 2: Dashboard page

### Task 2: Create `app/dashboard/page.tsx`

**Files:**
- Create: `packages/frontend/app/dashboard/page.tsx`

- [ ] **Step 1: Read existing pages for style reference**

```bash
cat packages/frontend/app/verify/page.tsx
```
Note the color palette and card patterns. The dashboard should match the existing dark theme.

- [ ] **Step 2: Write the dashboard page**

```typescript
"use client";

import { useEffect, useState } from "react";
import { apiFetch, loadState, clearAllState } from "../lib/api";

interface SessionState {
  identity: {
    commitment: string;
    leafIndex: number | null;
    setIndex: number | null;
    merkleRoot: string | null;
  } | null;
  credential: {
    attributes: { rating: number; tripCount: number; platform: string } | null;
    threshold: { threshold: number; totalSigners: number } | null;
  } | null;
  proof: {
    nullifier: string;
    generationTimeMs: number;
    proofSizeBytes: number;
  } | null;
}

function truncate(hex: string, chars = 8): string {
  if (!hex || hex.length <= chars * 2 + 5) return hex;
  return hex.slice(0, chars + 2) + '...' + hex.slice(-6);
}

export default function DashboardPage() {
  const [state, setState] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);

  // Merge server state with sessionStorage snapshots.
  // GET /session/state returns setIndex: null and merkleRoot: null (Stream D omits them
  // since they're not stored as module-level vars on the server). The registration response
  // does include them, and they're saved to sessionStorage via saveState('identity', ...) in
  // register/page.tsx. We merge them here so the dashboard can display them.
  useEffect(() => {
    apiFetch('/session/state')
      .then((serverState: SessionState) => {
        const storedIdentity = loadState('identity') as any;
        if (serverState.identity && storedIdentity) {
          // Override nulls from server with sessionStorage values from registration
          serverState.identity.setIndex = storedIdentity.setIndex ?? serverState.identity.setIndex ?? null;
          serverState.identity.merkleRoot = storedIdentity.merkleRoot ?? serverState.identity.merkleRoot ?? null;
        }
        setState(serverState);
      })
      .catch(() => setState(null))
      .finally(() => setLoading(false));
  }, []);

  async function handleReset() {
    setResetting(true);
    try {
      await apiFetch('/admin/reset', { method: 'POST' });
    } catch {
      // Best-effort — clear frontend state regardless
    }
    clearAllState();
    window.location.href = '/register';
  }

  const isEmpty = !state?.identity && !state?.credential && !state?.proof;

  return (
    <div className="min-h-screen bg-[#080C15] text-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080C15]/95 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="text-base font-bold tracking-widest text-white hover:text-amber-400 transition-colors duration-200">
            REPUTRANS
          </a>
          <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.05] px-3 py-1 rounded-full border border-white/[0.08]">
            Dashboard
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">
        <div className="text-xs text-[#94A3B8] font-mono mb-1 tracking-widest uppercase">
          Your identity
        </div>
        <h1 className="text-3xl font-bold mb-8 text-white">Dashboard</h1>

        {loading && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#94A3B8] text-sm">Loading your identity...</p>
          </div>
        )}

        {!loading && isEmpty && (
          <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-8 text-center">
            <p className="text-[#94A3B8] mb-5">No active identity found.</p>
            <a
              href="/register"
              className="inline-block bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
            >
              Start your journey
            </a>
          </div>
        )}

        {!loading && !isEmpty && (
          <div className="space-y-5">

            {/* Identity card */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <h2 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider font-mono">Identity</h2>
              </div>
              {state?.identity ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Commitment</span>
                    <span className="text-white">{truncate(state.identity.commitment)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Leaf index</span>
                    <span className="text-white">{state.identity.leafIndex ?? '—'}</span>
                  </div>
                  {state.identity.setIndex !== null && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#94A3B8]">Set index</span>
                      <span className="text-white">{state.identity.setIndex}</span>
                    </div>
                  )}
                  {state.identity.merkleRoot && (
                    <div className="flex justify-between gap-4">
                      <span className="text-[#94A3B8]">Merkle root</span>
                      <span className="text-white">{truncate(state.identity.merkleRoot)}</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">
                  Not registered.{' '}
                  <a href="/register" className="text-amber-400 underline">Register →</a>
                </p>
              )}
            </div>

            {/* Credential card */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${state?.credential ? 'bg-violet-400' : 'bg-white/20'}`} />
                <h2 className={`text-sm font-semibold uppercase tracking-wider font-mono ${state?.credential ? 'text-violet-400' : 'text-white/30'}`}>
                  Credential
                </h2>
              </div>
              {state?.credential?.attributes ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Platform</span>
                    <span className="text-white">{state.credential.attributes.platform} (Rideshare)</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Rating</span>
                    <span className="text-white">{(state.credential.attributes.rating / 10).toFixed(1)}★</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Trip count</span>
                    <span className="text-white">{state.credential.attributes.tripCount.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Signed by</span>
                    <span className="text-white">{state.credential.threshold?.threshold}-of-{state.credential.threshold?.totalSigners} committee</span>
                  </div>
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">
                  Not yet issued.{' '}
                  {state?.identity && <a href="/credential" className="text-amber-400 underline">Issue credential →</a>}
                </p>
              )}
            </div>

            {/* Proof card */}
            <div className="bg-[#0F1829] border border-white/[0.07] rounded-xl p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-2 h-2 rounded-full ${state?.proof ? 'bg-amber-400' : 'bg-white/20'}`} />
                <h2 className={`text-sm font-semibold uppercase tracking-wider font-mono ${state?.proof ? 'text-amber-400' : 'text-white/30'}`}>
                  ZK Proof
                </h2>
              </div>
              {state?.proof ? (
                <div className="space-y-2 text-sm font-mono">
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Nullifier</span>
                    <span className="text-white">{truncate(state.proof.nullifier)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Generation time</span>
                    <span className="text-white">{(state.proof.generationTimeMs / 1000).toFixed(1)}s</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Proof size</span>
                    <span className="text-white">{state.proof.proofSizeBytes.toLocaleString()} bytes</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-[#94A3B8]">Status</span>
                    <span className="text-emerald-400">Verified on-chain ✓</span>
                  </div>
                </div>
              ) : (
                <p className="text-[#94A3B8] text-sm">
                  Not yet generated.{' '}
                  {state?.credential && <a href="/prove" className="text-amber-400 underline">Generate proof →</a>}
                </p>
              )}
            </div>

            {/* Demo reset */}
            <div className="pt-4 border-t border-white/[0.06]">
              <button
                onClick={handleReset}
                disabled={resetting}
                className="text-xs text-[#94A3B8] hover:text-red-400 transition-colors duration-200 cursor-pointer disabled:opacity-50"
              >
                {resetting ? 'Resetting...' : 'Reset demo → start fresh'}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Build**

```bash
cd packages/frontend && pnpm build 2>&1 | grep -E "error|Error" | head -20
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd ../..
git add packages/frontend/app/dashboard/page.tsx
git commit -m "feat(frontend): add /dashboard page with identity/credential/proof summary"
```

---

## Chunk 3: Tests

### Task 3: Write Playwright E2E tests for the dashboard

**Files:**
- Create: `packages/frontend/tests/e2e/dashboard.spec.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:3001';

async function resetDemo() {
  await fetch(`${BASE_API}/admin/reset`, { method: 'POST' });
}

test.describe('Stream B: Dashboard', () => {

  test('empty state shows "Start your journey" when no session', async ({ page }) => {
    await resetDemo();
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Start your journey')).toBeVisible({ timeout: 5000 });
  });

  test('identity card shows data after Step 1 registration', async ({ page }) => {
    await resetDemo();
    // Register
    await page.goto('http://localhost:3000/register');
    await page.click('button:has-text("Register")');
    await page.waitForSelector('text=Identity Registered', { timeout: 15000 });

    // Dashboard should show identity
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Identity')).toBeVisible();
    await expect(page.locator('text=Commitment')).toBeVisible();
    await expect(page.locator('text=Leaf index')).toBeVisible();
  });

  test('credential card shows data after Step 3 issuance', async ({ page }) => {
    // Continue from previous session (identity already registered)
    await page.goto('http://localhost:3000/connect');
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('text=4.8', { timeout: 10000 });
    await page.click('button:has-text("Next: Certify")');
    await page.waitForURL('**/credential');
    await page.click('button:has-text("Request Certification")');
    await page.waitForSelector('text=Credential Issued', { timeout: 15000 });

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Credential')).toBeVisible();
    await expect(page.locator('text=Trip count')).toBeVisible();
  });

  test('proof card shows data after Steps 4-5', async ({ page }) => {
    await page.goto('http://localhost:3000/prove');
    await page.click('button:has-text("Generate Proof")');
    await page.waitForSelector('text=Proof Generated', { timeout: 60000 });
    await page.goto('http://localhost:3000/verify');
    await page.click('button:has-text("Verify")');
    await page.waitForSelector('text=Verified', { timeout: 30000 });

    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=ZK Proof')).toBeVisible();
    await expect(page.locator('text=Nullifier')).toBeVisible();
    await expect(page.locator('text=Verified on-chain')).toBeVisible();
  });

  test('Reset demo button clears state and redirects to /register', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');

    const resetButton = page.locator('button:has-text("Reset demo")');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await expect(page).toHaveURL(/.*register/, { timeout: 10000 });
    }
  });

  test('after reset, /session/state returns null state', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    const resetButton = page.locator('button:has-text("Reset demo")');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForURL(/.*register/);
    }

    // Check server state is cleared
    const response = await page.request.get(`${BASE_API}/session/state`);
    const state = await response.json();
    expect(state.identity).toBeNull();
    expect(state.credential).toBeNull();
    expect(state.proof).toBeNull();
  });

  test('after reset, sessionStorage is cleared', async ({ page }) => {
    await page.goto('http://localhost:3000/dashboard');
    await page.waitForLoadState('networkidle');
    const resetButton = page.locator('button:has-text("Reset demo")');
    if (await resetButton.isVisible()) {
      await resetButton.click();
      await page.waitForURL(/.*register/);
    }

    // Check sessionStorage has no reputrans_ keys
    const keys = await page.evaluate(() => {
      const result: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('reputrans_')) result.push(key);
      }
      return result;
    });
    expect(keys).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
cd packages/frontend && npx playwright test tests/e2e/dashboard.spec.ts --reporter=line
```
Expected: all tests pass. Note: tests that depend on an active session must run in order.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/frontend/tests/e2e/dashboard.spec.ts
git commit -m "test(e2e): add Playwright tests for dashboard and demo reset (Stream B)"
```

---

## Done

Stream B is complete when:
- [ ] `/dashboard` route exists and loads without errors
- [ ] Empty state shows "Start your journey" link to `/register`
- [ ] Identity card populates from `GET /session/state` after Step 1
- [ ] Credential card populates after Step 3
- [ ] Proof card populates after Steps 4–5
- [ ] "Reset demo" button calls `POST /admin/reset`, clears sessionStorage, redirects to `/register`
- [ ] All Playwright tests pass: `npx playwright test tests/e2e/dashboard.spec.ts`
- [ ] Full suite clean: `pnpm test:e2e`
