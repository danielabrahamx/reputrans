/**
 * REPUTRANS — End-to-End Playwright Tests
 * Tests the full 5-step demo flow in the browser.
 *
 * Prerequisites: API (3001), Anvil (8545), Frontend (3000) all running.
 */
import { test, expect, Page } from '@playwright/test';

// Reset API session state before each test to avoid cross-test contamination
test.beforeEach(async ({ request }) => {
  await request.post('http://localhost:3001/admin/reset');
});

// ── Helpers ──────────────────────────────────────────────────────────────

async function waitForButton(page: Page, text: string) {
  return page.getByRole('button', { name: text });
}

// ── Home page ─────────────────────────────────────────────────────────────

test.describe('Home Page', () => {
  test('shows REPUTRANS heading and Start Demo button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('REPUTRANS');
    await expect(page.getByRole('link', { name: 'Start Demo' })).toBeVisible();
    await expect(page.getByText('Privacy-Preserving Reputation Transfer')).toBeVisible();
  });

  test('shows research paper links', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('U2SSO', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('ThetaCrypt', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Map-to-Curve', { exact: true }).first()).toBeVisible();
  });

  test('Start Demo navigates to register page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: 'Start Demo' }).click();
    await expect(page).toHaveURL('/register');
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
  });
});

// ── Full 5-step flow ──────────────────────────────────────────────────────

test.describe('Full 5-Step Demo Flow', () => {
  test('Full 5-step flow', async ({ page }) => {
    // Step 1 — Register
    await page.goto('/register');
    await expect(page.getByText('Step 1 of 5')).toBeVisible();
    await expect(page.getByText('Create Master Identity')).toBeVisible();
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Identity Registered')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Commitment:')).toBeVisible();
    await expect(page.getByText('Leaf Index:')).toBeVisible();
    await expect(page.getByText('Merkle Root:')).toBeVisible();
    // Master key gate: copy key before Next becomes visible
    await expect(page.getByText('Your Master Key')).toBeVisible({ timeout: 5_000 });
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy Key' }).click();
    await page.getByRole('link', { name: 'Next: Connect Platform' }).click();

    // Step 2 — Connect platform
    await expect(page).toHaveURL('/connect');
    await expect(page.getByText('Step 2 of 5')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Uber', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('4.8').first()).toBeVisible();
    await expect(page.getByText('1,547').first()).toBeVisible();
    await expect(page.getByText('Demo data').first()).toBeVisible();
    await page.getByRole('button', { name: 'Next: Certify This Data' }).click();

    // Step 3 — Issue credential
    await expect(page).toHaveURL('/credential');
    await expect(page.getByText('Step 3 of 5')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Certify Your Work History' })).toBeVisible();
    await page.getByRole('button', { name: 'Request Certification' }).click();
    await expect(page.getByText('Credential Issued')).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('3 of 5 validators agreed')).toBeVisible();
    await expect(page.getByText('Signed').first()).toBeVisible();
    await page.getByRole('link', { name: 'Next: Generate Zero-Knowledge Proof' }).click();

    // Step 4 — Generate ZK proof
    await expect(page).toHaveURL('/prove');
    await expect(page.getByText('Step 4 of 5')).toBeVisible();
    await expect(page.getByText('Generate Zero-Knowledge Proof')).toBeVisible();
    await expect(page.getByLabel('Minimum Rating')).toHaveValue('4.5');
    await expect(page.getByLabel('Minimum Trips')).toHaveValue('1000');
    await page.getByRole('button', { name: 'Generate Proof' }).click();
    await expect(page.getByText('Generating Proof...')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Proof Generated')).toBeVisible({ timeout: 120_000 });
    await expect(page.getByText('Generation Time:')).toBeVisible();
    await expect(page.locator('text=/\\d+ms/')).toBeVisible();
    await expect(page.getByText(/Platform type/)).toBeVisible();
    await expect(page.getByText(/Rating ≥/)).toBeVisible();
    await page.getByRole('link', { name: 'Next: Verify On-Chain' }).click();

    // Step 5 — Verify on-chain
    await expect(page).toHaveURL('/verify');
    await expect(page.getByText('Step 5 of 5')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'On-Chain Verification' })).toBeVisible();
    await page.getByRole('button', { name: 'Verify on Base Sepolia' }).click();
    await expect(page.getByText('Verifying on Base Sepolia...')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('span.text-emerald-400').filter({ hasText: 'Verified' })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('heading', { name: 'Insurer Learned' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Insurer Did NOT Learn' })).toBeVisible();
    await expect(page.getByText('Rating exceeds 4.5 stars')).toBeVisible();
    await expect(page.getByText('Exact rating (4.8)')).toBeVisible();
    await expect(page.getByText('Proof Generation', { exact: true })).toBeVisible();
    await expect(page.getByText('Circuit Constraints', { exact: true })).toBeVisible();
    await expect(page.getByText('Gas Cost', { exact: true })).toBeVisible();
    await expect(page.getByText('Anonymity Set Size', { exact: true })).toBeVisible();
    await expect(page.getByText('1,024')).toBeVisible();
  });
});

// ── Guard tests ───────────────────────────────────────────────────────────

test.describe('Step Guards (missing previous step)', () => {
  test('connect page redirects if no identity', async ({ page }) => {
    await page.goto('/connect');
    await expect(page.getByText('Complete previous steps first')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: 'Go to Step 1' })).toBeVisible();
  });

  test('credential page redirects if no platform data', async ({ page }) => {
    await page.goto('/credential');
    await expect(page.getByText('Complete previous steps first')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: 'Go to Step 2' })).toBeVisible();
  });

  test('prove page redirects if no credential', async ({ page }) => {
    await page.goto('/prove');
    await expect(page.getByText('Complete previous steps first')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: 'Go to Step 3' })).toBeVisible();
  });

  test('verify page redirects if no proof', async ({ page }) => {
    await page.goto('/verify');
    await expect(page.getByText('Complete previous steps first')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: 'Go to Step 4' })).toBeVisible();
  });
});
