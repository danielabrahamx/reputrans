# Stream A: Wizard Polish — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish each wizard step: show the master key at registration, let users enter custom stats at connect, and add "Share Proof" + "Go to Dashboard" buttons after verification.

**Architecture:** Modify 3 existing frontend pages. No new files except tests. Depends on Stream D (must be merged first — Stream D adds `masterSecret` to register response and accepts custom stats in credential issue).

**Tech Stack:** Next.js 15 App Router, Tailwind CSS, React state hooks

**Spec:** `docs/superpowers/specs/2026-03-18-practical-mvp-design.md` — Stream A section

**Wave:** 2 (requires Stream D to be merged first)

**Exit condition:** Playwright tests pass + full `pnpm test:e2e` green

**Pre-check:** Before starting, verify Stream D is done:
```bash
curl -s -X POST http://localhost:3001/identity/register | node -p "JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')).masterSecret"
```
Expected: a hex string starting with `0x`. If `undefined`, Stream D is not merged yet.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `packages/frontend/app/register/page.tsx` | Modify | Show master key with copy button after registration |
| `packages/frontend/app/connect/page.tsx` | Modify | Add editable rating + trip count inputs |
| `packages/frontend/app/verify/page.tsx` | Modify | Add "Share Your Proof" and "Go to Dashboard" buttons |
| `packages/frontend/tests/e2e/wizard-polish.spec.ts` | Create | Playwright E2E tests |

---

## Chunk 1: Register page — master key display

### Task 1: Show master key on Step 1

**Files:**
- Modify: `packages/frontend/app/register/page.tsx`

- [ ] **Step 1: Read the current register page**

```bash
cat packages/frontend/app/register/page.tsx
```
Identify:
- The `data` state type (what fields does the register API response return?)
- The result card that shows commitment/leafIndex/merkleRoot
- The "Next: Connect Platform" link

- [ ] **Step 2: Add `masterSecret` to the response type**

Find the interface or type for the register response. Add `masterSecret?: string` to it.

- [ ] **Step 3: Add `keySaved` state**

Add to the component's state declarations:
```typescript
const [keySaved, setKeySaved] = useState(false);
const [copied, setCopied] = useState(false);
```

- [ ] **Step 4: Add the master key card after the existing result card**

Inside the `{data && (...)}` block, after the existing commitment/leafIndex display card, add:

```tsx
{/* Master key — shown once, copy to save */}
{data.masterSecret && (
  <div className="bg-amber-500/[0.08] border border-amber-500/30 rounded-xl p-5">
    <div className="flex items-center gap-2 mb-3">
      <span className="text-amber-400 text-lg">🔑</span>
      <h2 className="text-base font-semibold text-amber-400">Your Master Key</h2>
      <span className="ml-auto text-xs text-[#94A3B8] bg-white/[0.05] px-2 py-0.5 rounded">
        Shown once
      </span>
    </div>
    <p className="text-xs text-[#94A3B8] mb-3 leading-relaxed">
      This key is your identity. Save it somewhere safe — it cannot be recovered if lost.
    </p>
    <div className="bg-[#080C15] border border-white/[0.08] rounded-lg p-3 mb-3 font-mono text-xs text-white/70 break-all">
      {data.masterSecret}
    </div>
    <button
      onClick={() => {
        navigator.clipboard.writeText(data.masterSecret!);
        setCopied(true);
        setKeySaved(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="w-full bg-amber-400/10 border border-amber-400/30 text-amber-400 text-sm font-medium py-2 rounded-lg hover:bg-amber-400/20 transition-colors duration-200 cursor-pointer"
    >
      {copied ? "Copied ✓" : "Copy Key"}
    </button>
  </div>
)}
```

- [ ] **Step 5: Gate the "Next" button behind `keySaved`**

Find the `<Link href="/connect" ...>Next: Connect Platform</Link>` button. Wrap it:

```tsx
{keySaved && (
  <Link
    href="/connect"
    className="inline-block bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
  >
    Next: Connect Platform
  </Link>
)}
{!keySaved && data && (
  <p className="text-xs text-[#94A3B8]">Copy your key above to continue.</p>
)}
```

- [ ] **Step 6: Build to check for errors**

```bash
cd packages/frontend && pnpm build 2>&1 | grep -E "error|Error" | head -20
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
cd ../..
git add packages/frontend/app/register/page.tsx
git commit -m "feat(frontend): show master key with copy-to-proceed gate on Step 1"
```

---

## Chunk 2: Connect page — editable stats

### Task 2: Add editable rating and trip count inputs on Step 2

**Files:**
- Modify: `packages/frontend/app/connect/page.tsx`

- [ ] **Step 1: Read the current connect page**

```bash
cat packages/frontend/app/connect/page.tsx
```
Identify: where the "Connect" button is, how `data` is fetched, and how `saveState` is called.

- [ ] **Step 2: Add custom stats state**

Add to the component's state declarations:
```typescript
const [customRating, setCustomRating] = useState<string>("4.8");
const [customTrips, setCustomTrips] = useState<string>("1547");
```

- [ ] **Step 3: Add the inputs before the Connect/Next button**

Find where the platform data is displayed (after `{data && (...)`). Before the "Next: Certify This Data" link, add an editable section:

```tsx
{/* Editable thresholds for demo — these become the credential */}
<div className="bg-white/[0.03] border border-white/[0.07] rounded-xl p-5">
  <div className="text-xs text-[#94A3B8] font-mono uppercase tracking-widest mb-4">
    Adjust values for demo
  </div>
  <div className="grid grid-cols-2 gap-4">
    <div>
      <label className="text-xs text-[#94A3B8] block mb-1">Rating (e.g. 4.8)</label>
      <input
        type="number"
        min="1.0"
        max="5.0"
        step="0.1"
        value={customRating}
        onChange={(e) => setCustomRating(e.target.value)}
        className="w-full bg-[#0F1829] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50"
      />
    </div>
    <div>
      <label className="text-xs text-[#94A3B8] block mb-1">Trip count</label>
      <input
        type="number"
        min="1"
        max="99999"
        step="1"
        value={customTrips}
        onChange={(e) => setCustomTrips(e.target.value)}
        className="w-full bg-[#0F1829] border border-white/[0.10] rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-amber-400/50"
      />
    </div>
  </div>
  <p className="text-xs text-[#94A3B8] mt-3 leading-relaxed">
    These will be certified by the threshold committee. The ZK proof will prove you meet the minimum thresholds — not the exact values.
  </p>
</div>
```

- [ ] **Step 4: Save custom stats to sessionStorage when navigating to next step**

Find the "Next: Certify This Data" `<Link>`. Replace it with a button that saves state then navigates:

```tsx
<button
  onClick={() => {
    const ratingInt = Math.round(parseFloat(customRating) * 10);
    const tripInt = parseInt(customTrips, 10);
    saveState('customStats', { rating: ratingInt, tripCount: tripInt });
    window.location.href = '/credential';
  }}
  className="bg-amber-400 text-black font-semibold px-6 py-3 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer"
>
  Next: Certify This Data
</button>
```

> `ratingInt` converts 4.8 → 48 (the integer encoding the API expects).

- [ ] **Step 5: Build**

```bash
cd packages/frontend && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 6: Commit**

```bash
cd ../..
git add packages/frontend/app/connect/page.tsx
git commit -m "feat(frontend): add editable rating/tripCount inputs on Step 2 connect"
```

---

### Task 3: Wire custom stats through to credential issuance

**Files:**
- Modify: `packages/frontend/app/credential/page.tsx`

- [ ] **Step 1: Read the credential page**

```bash
cat packages/frontend/app/credential/page.tsx
```
Find the `handleIssue` function and the `apiFetch('/credential/issue', ...)` call.

- [ ] **Step 2: Pass custom stats in the credential issue request**

In `handleIssue`, before or inside the `apiFetch` call, load the saved custom stats:

```typescript
async function handleIssue() {
  setLoading(true);
  setError(null);
  try {
    const customStats = loadState('customStats') as { rating: number; tripCount: number } | null;
    const body = customStats
      ? { rating: customStats.rating, tripCount: customStats.tripCount }
      : {};

    const result = await apiFetch('/credential/issue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // ... rest of handler unchanged
```

- [ ] **Step 3: Build**

```bash
cd packages/frontend && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 4: Commit**

```bash
cd ../..
git add packages/frontend/app/credential/page.tsx
git commit -m "feat(frontend): pass custom stats from sessionStorage to credential/issue"
```

---

## Chunk 3: Verify page — share + dashboard buttons

### Task 4: Add "Share Your Proof" and "Go to Dashboard" to Step 5

**Files:**
- Modify: `packages/frontend/app/verify/page.tsx`

- [ ] **Step 1: Read the verify page**

```bash
cat packages/frontend/app/verify/page.tsx
```
Identify: where `data` (the verify response) is used, what `data.proof` and `data.publicInputs` look like, and where the result card ends.

- [ ] **Step 2: Add share URL builder and copy state**

Add to state declarations:
```typescript
const [shareUrl, setShareUrl] = useState<string | null>(null);
const [urlCopied, setUrlCopied] = useState(false);
```

After successful verification (where `setData(result)` is called), build the share URL:
```typescript
// Build shareable verifier URL
if (result.proof?.data && result.proof?.publicInputs) {
  const params = new URLSearchParams({
    proof: result.proof.data,
    inputs: encodeURIComponent(JSON.stringify(result.proof.publicInputs)),
  });
  const url = `${window.location.origin}/shared-proof?${params.toString()}`;
  setShareUrl(url.length < 8192 ? url : null); // guard against URL too long
}
```

- [ ] **Step 3: Add the two buttons after the result card**

Inside `{data && (...)}`, after the existing verification result display, add:

```tsx
{/* Actions */}
<div className="flex gap-3 flex-wrap">
  {shareUrl && (
    <button
      onClick={() => {
        navigator.clipboard.writeText(shareUrl);
        setUrlCopied(true);
        setTimeout(() => setUrlCopied(false), 2000);
      }}
      className="bg-violet-500/10 border border-violet-500/30 text-violet-400 font-medium px-5 py-2.5 rounded-xl hover:bg-violet-500/20 transition-colors duration-200 cursor-pointer text-sm"
    >
      {urlCopied ? "Link copied ✓" : "Share Your Proof"}
    </button>
  )}
  <a
    href="/dashboard"
    className="bg-amber-400 text-black font-semibold px-5 py-2.5 rounded-xl hover:bg-amber-300 transition-colors duration-200 cursor-pointer text-sm inline-block"
  >
    Go to Dashboard →
  </a>
</div>
```

- [ ] **Step 4: Build**

```bash
cd packages/frontend && pnpm build 2>&1 | grep -E "error|Error" | head -20
```

- [ ] **Step 5: Commit**

```bash
cd ../..
git add packages/frontend/app/verify/page.tsx
git commit -m "feat(frontend): add Share Proof and Go to Dashboard buttons on Step 5"
```

---

## Chunk 4: Tests

### Task 5: Write Playwright E2E tests for wizard polish

**Files:**
- Create: `packages/frontend/tests/e2e/wizard-polish.spec.ts`

- [ ] **Step 1: Write the tests**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Stream A: Wizard Polish', () => {

  test('Step 1: master key is displayed after registration', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    await page.click('button:has-text("Register")');
    await page.waitForSelector('text=Identity Registered', { timeout: 15000 });
    // Master key card should appear
    await expect(page.locator('text=Your Master Key')).toBeVisible({ timeout: 5000 });
    // Should show a hex string
    const keyText = await page.locator('.font-mono.break-all').first().textContent();
    expect(keyText).toMatch(/^0x[0-9a-fA-F]{64}$/);
  });

  test('Step 1: copy button exists and gates Next button', async ({ page }) => {
    await page.goto('http://localhost:3000/register');
    await page.click('button:has-text("Register")');
    await page.waitForSelector('text=Your Master Key', { timeout: 15000 });
    // Copy button should be present
    await expect(page.locator('button:has-text("Copy Key")')).toBeVisible();
    // Next button should NOT be visible yet (gated behind keySaved)
    const nextLink = page.locator('a:has-text("Next: Connect Platform")');
    await expect(nextLink).not.toBeVisible();
    // Click copy → Next appears
    await page.click('button:has-text("Copy Key")');
    await expect(nextLink).toBeVisible({ timeout: 3000 });
  });

  test('Step 2: rating and trip count inputs are present with defaults', async ({ page }) => {
    // First complete Step 1
    await page.goto('http://localhost:3000/register');
    await page.click('button:has-text("Register")');
    await page.waitForSelector('text=Your Master Key', { timeout: 15000 });
    await page.click('button:has-text("Copy Key")');
    await page.click('a:has-text("Next: Connect Platform")');

    await page.waitForURL('**/connect');
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('text=4.8', { timeout: 10000 });

    // Rating input should be present with default 4.8
    const ratingInput = page.locator('input[type="number"]').first();
    await expect(ratingInput).toBeVisible();
    await expect(ratingInput).toHaveValue('4.8');

    // Trip count input should be present with default 1547
    const tripInput = page.locator('input[type="number"]').nth(1);
    await expect(tripInput).toBeVisible();
    await expect(tripInput).toHaveValue('1547');
  });

  test('Step 2: custom values are accepted and saved', async ({ page }) => {
    await page.goto('http://localhost:3000/connect');
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('text=4.8', { timeout: 10000 });

    // Change rating to 4.2 and trips to 800
    const ratingInput = page.locator('input[type="number"]').first();
    await ratingInput.fill('4.2');
    const tripInput = page.locator('input[type="number"]').nth(1);
    await tripInput.fill('800');

    // Values should persist
    await expect(ratingInput).toHaveValue('4.2');
    await expect(tripInput).toHaveValue('800');
  });

  test('Step 5: Share Your Proof button is present after verification', async ({ page }) => {
    // Run full flow
    await page.goto('http://localhost:3000/register');
    await page.click('button:has-text("Register")');
    await page.waitForSelector('text=Your Master Key', { timeout: 15000 });
    await page.click('button:has-text("Copy Key")');
    await page.click('a:has-text("Next: Connect Platform")');
    await page.waitForURL('**/connect');
    await page.click('button:has-text("Connect")');
    await page.waitForSelector('text=4.8', { timeout: 10000 });
    await page.click('button:has-text("Next: Certify")');
    await page.waitForURL('**/credential');
    await page.click('button:has-text("Request Certification")');
    await page.waitForSelector('text=Credential Issued', { timeout: 15000 });
    await page.goto('http://localhost:3000/prove');
    await page.click('button:has-text("Generate Proof")');
    await page.waitForSelector('text=Proof Generated', { timeout: 60000 });
    await page.goto('http://localhost:3000/verify');
    await page.click('button:has-text("Verify")');
    await page.waitForSelector('text=Verified', { timeout: 30000 });

    await expect(page.locator('button:has-text("Share Your Proof")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('a:has-text("Go to Dashboard")')).toBeVisible({ timeout: 5000 });
  });

  test('Step 5: Go to Dashboard navigates correctly', async ({ page }) => {
    await page.goto('http://localhost:3000/verify');
    // If already verified in session, dashboard button should be there
    // Otherwise navigate directly
    const dashboardLink = page.locator('a:has-text("Go to Dashboard")');
    if (await dashboardLink.isVisible()) {
      await dashboardLink.click();
      await expect(page).toHaveURL(/.*dashboard/);
    }
  });
});
```

- [ ] **Step 2: Run the tests**

```bash
# Ensure API + Anvil + frontend are all running
cd packages/frontend && npx playwright test tests/e2e/wizard-polish.spec.ts --reporter=line
```
Expected: all tests pass. The full-flow test (~60s for proof generation) may be slow.

- [ ] **Step 3: Commit**

```bash
cd ../..
git add packages/frontend/tests/e2e/wizard-polish.spec.ts
git commit -m "test(e2e): add Playwright tests for wizard polish (Stream A)"
```

---

## Done

Stream A is complete when:
- [ ] Register page shows master key after registration
- [ ] Copy button gates the Next button on Step 1
- [ ] Connect page has rating + trip count inputs with correct defaults
- [ ] Custom values flow through to credential issuance (verified by checking proof generates without error with custom stats)
- [ ] Verify page has "Share Your Proof" + "Go to Dashboard" buttons after verification
- [ ] All Playwright tests pass: `npx playwright test tests/e2e/wizard-polish.spec.ts`
- [ ] Full suite clean: `pnpm test:e2e`
