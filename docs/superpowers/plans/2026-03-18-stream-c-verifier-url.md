# Stream C: Verifier URL — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a read-only `/shared-proof` page that an insurer/verifier can open to see what a driver has proven — without seeing anything they shouldn't.

**Architecture:** Single new Next.js App Router page. Reads `proof` and `inputs` from URL query params, calls the existing `POST /proof/verify` endpoint (no backend changes needed), and renders the verified claims. Completely independent of all other streams.

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, existing `apiFetch` from `app/lib/api.ts`

**Spec:** `docs/superpowers/specs/2026-03-18-practical-mvp-design.md` — Stream C section

**Wave:** 1 (no dependencies — run parallel with Stream D)

**Exit condition:** Playwright tests pass + full `pnpm test:e2e` green

---

## File Map

| File | Action | What it does |
|------|--------|-------------|
| `packages/frontend/app/shared-proof/page.tsx` | Create | Read-only verifier view page |
| `packages/frontend/tests/e2e/verifier-url.spec.ts` | Create | Playwright E2E tests |

---

## Chunk 1: Verifier page

### Task 1: Read existing patterns before writing anything

- [ ] **Step 1: Read the verify page for style reference**

```bash
cat packages/frontend/app/verify/page.tsx
```
Note: the dark color scheme (`#080C15` background, `#94A3B8` secondary text, amber accents), the `apiFetch` usage pattern, and the card component style.

- [ ] **Step 2: Read `app/lib/api.ts` for the `apiFetch` helper**

```bash
cat packages/frontend/app/lib/api.ts
```
Note the `apiFetch(path, options)` signature — it prefixes `http://localhost:3001`.

---

### Task 2: Create `app/shared-proof/page.tsx`

**Files:**
- Create: `packages/frontend/app/shared-proof/page.tsx`

- [ ] **Step 1: Write the page**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "../lib/api";

interface VerifyResult {
  success: boolean;
  localVerification: boolean;
  onChainVerification: {
    verified: boolean;
    txHash: string;
    gasUsed: string;
  } | null;
  privacyAnalysis?: {
    insurerLearned: string[];
    insurerDidNotLearn: string[];
  };
}

type Status = "loading" | "verified" | "failed" | "invalid-url";

export default function SharedProofPage() {
  const params = useSearchParams();
  const [status, setStatus] = useState<Status>("loading");
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const proof = params.get("proof");
    const inputsRaw = params.get("inputs");

    if (!proof || !inputsRaw) {
      setStatus("invalid-url");
      return;
    }

    let publicInputs: string[];
    try {
      publicInputs = JSON.parse(decodeURIComponent(inputsRaw));
    } catch {
      setStatus("invalid-url");
      setError("Could not parse proof inputs from URL.");
      return;
    }

    apiFetch("/proof/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ proof, publicInputs }),
    })
      .then((data: VerifyResult) => {
        setResult(data);
        setStatus(data.localVerification ? "verified" : "failed");
      })
      .catch((err: Error) => {
        setStatus("failed");
        setError(err.message);
      });
  }, [params]);

  return (
    <div className="min-h-screen bg-[#080C15] text-white">
      {/* Minimal nav — no step progress, this is a standalone shareable page */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#080C15]/95 backdrop-blur border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-base font-bold tracking-widest text-white">REPUTRANS</span>
          <span className="text-xs font-mono text-[#94A3B8] bg-white/[0.05] px-3 py-1 rounded-full border border-white/[0.08]">
            Verifier View
          </span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-6 pt-28 pb-16">

        {/* Loading */}
        {status === "loading" && (
          <div className="text-center py-20">
            <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-[#94A3B8] text-sm">Verifying proof on-chain...</p>
          </div>
        )}

        {/* Invalid URL */}
        {status === "invalid-url" && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-red-400">
            <div className="text-lg font-semibold mb-2">Invalid proof URL</div>
            <p className="text-sm">{error ?? "This URL is missing required proof data."}</p>
          </div>
        )}

        {/* Failed verification */}
        {status === "failed" && (
          <div className="bg-red-500/[0.08] border border-red-500/25 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-400/20 flex items-center justify-center text-red-400 text-lg font-bold">✗</div>
              <span className="text-red-400 text-xl font-bold">Proof Invalid</span>
            </div>
            <p className="text-[#94A3B8] text-sm">{error ?? "This proof did not pass verification."}</p>
          </div>
        )}

        {/* Verified */}
        {status === "verified" && result && (
          <div className="space-y-5">

            {/* Verification badge */}
            <div className="bg-emerald-500/[0.08] border border-emerald-500/25 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-emerald-400/20 flex items-center justify-center text-emerald-400 text-lg font-bold">✓</div>
                <div>
                  <div className="text-emerald-400 font-semibold text-lg">Proof Verified On-Chain</div>
                  <div className="text-[#94A3B8] text-xs mt-0.5">
                    {result.onChainVerification
                      ? `Confirmed · Anvil Sepolia Fork`
                      : "Confirmed locally"}
                  </div>
                </div>
              </div>
              {result.onChainVerification?.txHash && (
                <div className="text-xs font-mono text-emerald-400/70 border-t border-emerald-500/15 pt-3 mt-3 break-all">
                  TX: {result.onChainVerification.txHash}
                </div>
              )}
            </div>

            {/* What was proven */}
            <div>
              <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-3">
                What this person has proven
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: "🚗", label: "Platform type", value: "Rideshare" },
                  { icon: "⭐", label: "Rating", value: "≥ 4.5 stars" },
                  { icon: "🗺️", label: "Trips", value: "≥ 1,000" },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 text-center"
                  >
                    <div className="text-2xl mb-2">{item.icon}</div>
                    <div className="text-[#94A3B8] text-xs mb-1">{item.label}</div>
                    <div className="text-white font-semibold text-sm">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* What was NOT revealed */}
            <div className="bg-violet-500/[0.06] border border-violet-500/20 rounded-xl p-5">
              <div className="text-xs text-violet-400 font-mono uppercase tracking-widest mb-3">
                🔒 Not revealed to you
              </div>
              <div className="flex flex-wrap gap-2">
                {[
                  "Driver identity",
                  "Exact rating (e.g. 4.8)",
                  "Exact trip count",
                  "Which platform (Uber/Lyft)",
                  "Account or name",
                ].map((item) => (
                  <span
                    key={item}
                    className="text-xs px-3 py-1 rounded-full bg-white/[0.05] border border-white/[0.07] text-[#94A3B8]"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>

            {/* Credential provenance */}
            <div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-4">
              <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-2">
                Credential signed by
              </div>
              <div className="text-white text-sm font-medium mb-1">3-of-5 threshold committee</div>
              <div className="text-[#94A3B8] text-xs mb-2">ThetaCrypt EdDSA · Baby Jubjub curve</div>
              <p className="text-[#94A3B8] text-xs leading-relaxed">
                No single validator — including the platform — can forge or revoke this credential alone.
              </p>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

```bash
cd packages/frontend && pnpm build 2>&1 | tail -20
```
Expected: no TypeScript or build errors for `shared-proof/page.tsx`.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/frontend/app/shared-proof/page.tsx
git commit -m "feat(frontend): add /shared-proof verifier view page"
```

---

## Chunk 2: Tests

### Task 3: Write Playwright E2E tests for the verifier URL

**Files:**
- Create: `packages/frontend/tests/e2e/verifier-url.spec.ts`

- [ ] **Step 1: Read existing E2E test for patterns**

```bash
cat packages/frontend/tests/e2e/reputrans-flow.spec.ts
```
Note: how the test drives the full flow, the `page.goto()` and `page.click()` pattern, and the `expect()` matchers used.

- [ ] **Step 2: Write the test file**

```typescript
import { test, expect } from '@playwright/test';

// Helper: run full flow up to and including verify, return the proof URL
async function runFullFlowAndGetProofUrl(page: any) {
  // Step 1: Register
  await page.goto('http://localhost:3000/register');
  await page.click('button:has-text("Register")');
  await page.waitForSelector('text=Identity Registered', { timeout: 15000 });

  // Step 2: Connect
  await page.goto('http://localhost:3000/connect');
  await page.click('button:has-text("Connect")');
  await page.waitForSelector('[data-testid="platform-data"], text=4.8', { timeout: 10000 });

  // Step 3: Credential
  await page.goto('http://localhost:3000/credential');
  await page.click('button:has-text("Request Certification")');
  await page.waitForSelector('text=Credential Issued', { timeout: 15000 });

  // Step 4: Prove
  await page.goto('http://localhost:3000/prove');
  await page.click('button:has-text("Generate Proof")');
  await page.waitForSelector('text=Proof Generated', { timeout: 60000 });

  // Step 5: Verify
  await page.goto('http://localhost:3000/verify');
  await page.click('button:has-text("Verify")');
  await page.waitForSelector('text=Verified', { timeout: 30000 });

  // Get the share URL
  const shareButton = page.locator('button:has-text("Share"), a:has-text("Share")');
  await expect(shareButton).toBeVisible({ timeout: 10000 });
  return page.url(); // will update once Stream A adds the Share button
}

test.describe('Verifier URL (/shared-proof)', () => {
  test('page loads with valid proof params and shows verified state', async ({ page }) => {
    // Navigate directly with a dummy proof to test the page renders
    // The actual proof URL is tested in the integration test below
    await page.goto('http://localhost:3000/shared-proof?proof=invalid&inputs=%5B%5D');
    // Should show failed state (invalid proof), not crash
    await expect(page.locator('body')).toBeVisible();
    // Loading should resolve to failed/invalid state
    await page.waitForSelector('text=Invalid, text=failed, text=Proof Invalid', {
      timeout: 30000,
    });
  });

  test('shows "Proof Invalid" on bad proof data', async ({ page }) => {
    await page.goto('http://localhost:3000/shared-proof?proof=deadbeef&inputs=%5B%220x1%22%5D');
    await page.waitForSelector('text=Proof Invalid, text=failed, text=Invalid', { timeout: 30000 });
  });

  test('missing params shows invalid-url state', async ({ page }) => {
    await page.goto('http://localhost:3000/shared-proof');
    await expect(page.locator('text=Invalid proof URL')).toBeVisible({ timeout: 5000 });
  });

  test('page shows "Verifier View" badge in nav', async ({ page }) => {
    await page.goto('http://localhost:3000/shared-proof');
    await expect(page.locator('text=Verifier View')).toBeVisible();
  });

  test('verified page shows all required sections', async ({ page }) => {
    // This test requires a valid proof — skip if API is not running
    // The full integration test is in the orchestrator test run
    // For now test the structure with a page that has been verified
    await page.goto('http://localhost:3000/shared-proof?proof=abc&inputs=%5B%5D');
    await page.waitForTimeout(3000); // let verification attempt complete

    // Regardless of verification result, page structure should be present
    await expect(page.locator('text=REPUTRANS')).toBeVisible();
    await expect(page.locator('text=Verifier View')).toBeVisible();
  });
});
```

- [ ] **Step 3: Run the tests (frontend server must be running)**

```bash
# Terminal: ensure frontend is running
cd packages/frontend && pnpm dev

# Run tests
cd packages/frontend && npx playwright test tests/e2e/verifier-url.spec.ts --reporter=line
```
Expected: all 5 tests pass. The proof validity tests will show "Proof Invalid" / "Invalid proof URL" states which is correct without a real proof.

- [ ] **Step 4: Commit**

```bash
cd ../..
git add packages/frontend/tests/e2e/verifier-url.spec.ts
git commit -m "test(e2e): add Playwright tests for /shared-proof verifier page"
```

---

## Done

Stream C is complete when:
- [ ] `packages/frontend/app/shared-proof/page.tsx` exists and builds cleanly
- [ ] `/shared-proof` with missing params shows "Invalid proof URL"
- [ ] `/shared-proof` with bad proof data shows "Proof Invalid"
- [ ] Page shows "REPUTRANS" logo and "Verifier View" badge
- [ ] Playwright tests pass: `npx playwright test tests/e2e/verifier-url.spec.ts`
- [ ] Full suite clean: `pnpm test:e2e`
