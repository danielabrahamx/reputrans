/**
 * Stream B: Dashboard E2E Tests
 * Tests the /dashboard page — identity/credential/proof cards and demo reset.
 *
 * Prerequisites: API (3001), Anvil (8545), Frontend (3000) all running.
 *
 * The full flow tests run in a single browser context because each step's page
 * checks sessionStorage (via loadState) for data from the previous step.
 * Separate tests would get fresh contexts with empty sessionStorage.
 */
import { test, expect } from '@playwright/test';

const BASE_API = 'http://localhost:3001';

async function resetDemo() {
  await fetch(`${BASE_API}/admin/reset`, { method: 'POST' });
}

test.describe('Stream B: Dashboard', () => {

  test('empty state shows "Start your journey" when no session', async ({ page }) => {
    await resetDemo();
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Start your journey')).toBeVisible({ timeout: 5_000 });
  });

  test('full flow: dashboard shows identity, credential, proof, then reset works', async ({ page }) => {
    await resetDemo();

    // ── Step 1: Register ──
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();
    await page.waitForSelector('text=Identity Registered', { timeout: 30_000 });

    // Check dashboard shows identity card
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Commitment')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Leaf index')).toBeVisible();

    // ── Step 2: Connect (auto-loads) ──
    await page.goto('/connect');
    await page.waitForSelector('text=4.8', { timeout: 15_000 });
    await page.getByText('Next: Certify This Data').click();
    await page.waitForURL('**/credential');

    // ── Step 3: Issue credential ──
    await page.getByRole('button', { name: 'Request Certification' }).click();
    await page.waitForSelector('text=Credential Issued', { timeout: 30_000 });

    // Check dashboard shows credential card
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Trip count')).toBeVisible({ timeout: 5_000 });

    // ── Step 4: Generate proof ──
    await page.goto('/prove');
    await page.getByRole('button', { name: 'Generate Proof' }).click();
    await page.waitForSelector('text=Proof Generated', { timeout: 120_000 });

    // ── Step 5: Verify on-chain ──
    await page.goto('/verify');
    await page.getByRole('button', { name: 'Verify on Sepolia' }).click();
    await page.waitForSelector('text=Verified', { timeout: 60_000 });

    // Check dashboard shows proof card
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('ZK Proof')).toBeVisible({ timeout: 5_000 });
    await expect(page.getByText('Nullifier')).toBeVisible();
    await expect(page.getByText('Verified on-chain')).toBeVisible();

    // ── Reset demo ──
    const resetButton = page.getByRole('button', { name: 'Reset demo' });
    await expect(resetButton).toBeVisible({ timeout: 5_000 });
    await resetButton.click();
    await expect(page).toHaveURL(/.*register/, { timeout: 10_000 });

    // Verify server state is cleared
    const response = await page.request.get(`${BASE_API}/session/state`);
    const state = await response.json();
    expect(state.identity).toBeNull();
    expect(state.credential).toBeNull();
    expect(state.proof).toBeNull();

    // Verify sessionStorage is cleared
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    const keys = await page.evaluate(() => {
      const result: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key?.startsWith('reputrans_')) result.push(key);
      }
      return result;
    });
    expect(keys).toHaveLength(0);

    // Dashboard should show empty state again
    await expect(page.getByText('Start your journey')).toBeVisible({ timeout: 5_000 });
  });
});
