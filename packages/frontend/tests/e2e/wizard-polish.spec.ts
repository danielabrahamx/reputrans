/**
 * Stream A: Wizard Polish — Playwright E2E Tests
 *
 * Tests the new UI features: master key display, editable stats, share/dashboard buttons.
 * Prerequisites: API (3001), Anvil (8545), Frontend (3000) all running.
 */
import { test, expect } from '@playwright/test';

// Reset API session state before each test
test.beforeEach(async ({ request }) => {
  await request.post('http://localhost:3001/admin/reset');
});

test.describe('Stream A: Wizard Polish', () => {

  test('Step 1: master key is displayed after registration', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Identity Registered')).toBeVisible({ timeout: 30_000 });
    // Master key card should appear
    await expect(page.getByText('Your Master Key')).toBeVisible({ timeout: 5_000 });
    // Should show a hex string in the mono break-all div
    const keyEl = page.locator('.font-mono.break-all').first();
    await expect(keyEl).toBeVisible();
    const keyText = await keyEl.textContent();
    expect(keyText).toMatch(/^0x[0-9a-fA-F]{10,}$/);
  });

  test('Step 1: copy button gates Next button', async ({ page }) => {
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Your Master Key')).toBeVisible({ timeout: 30_000 });

    // Copy button should be present
    await expect(page.getByRole('button', { name: 'Copy Key' })).toBeVisible();

    // Next link should NOT be visible yet (gated behind keySaved)
    await expect(page.getByRole('link', { name: 'Next: Connect Platform' })).not.toBeVisible();

    // Should show the hint text
    await expect(page.getByText('Copy your key above to continue')).toBeVisible();

    // Click copy → Next appears
    // Grant clipboard permission
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy Key' }).click();
    await expect(page.getByRole('link', { name: 'Next: Connect Platform' })).toBeVisible({ timeout: 3_000 });
  });

  test('Step 2: rating and trip count inputs are present with defaults', async ({ page }) => {
    // Complete Step 1 first
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Your Master Key')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Copy Key' }).click();
    await page.getByRole('link', { name: 'Next: Connect Platform' }).click();

    // Wait for connect page to load platform data
    await expect(page).toHaveURL('/connect');
    await expect(page.getByText('4.8').first()).toBeVisible({ timeout: 10_000 });

    // Rating input should be present with default 4.8
    const ratingInput = page.locator('input[type="number"]').first();
    await expect(ratingInput).toBeVisible();
    await expect(ratingInput).toHaveValue('4.8');

    // Trip count input should be present with default 1547
    const tripInput = page.locator('input[type="number"]').nth(1);
    await expect(tripInput).toBeVisible();
    await expect(tripInput).toHaveValue('1547');
  });

  test('Step 2: custom values are accepted', async ({ page }) => {
    // Complete Step 1 first
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Your Master Key')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Copy Key' }).click();
    await page.getByRole('link', { name: 'Next: Connect Platform' }).click();

    await expect(page).toHaveURL('/connect');
    await expect(page.getByText('4.8').first()).toBeVisible({ timeout: 10_000 });

    // Change rating to 4.2 and trips to 800
    const ratingInput = page.locator('input[type="number"]').first();
    await ratingInput.fill('4.2');
    const tripInput = page.locator('input[type="number"]').nth(1);
    await tripInput.fill('800');

    // Values should persist in inputs
    await expect(ratingInput).toHaveValue('4.2');
    await expect(tripInput).toHaveValue('800');
  });

  test('Step 5: verify page shows Share and Dashboard buttons', async ({ page }) => {
    // Run full flow
    await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

    // Step 1 — Register
    await page.goto('/register');
    await page.getByRole('button', { name: 'Register' }).click();
    await expect(page.getByText('Your Master Key')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('button', { name: 'Copy Key' }).click();
    await page.getByRole('link', { name: 'Next: Connect Platform' }).click();

    // Step 2 — Connect
    await expect(page).toHaveURL('/connect');
    await expect(page.getByText('4.8').first()).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Next: Certify This Data' }).click();

    // Step 3 — Credential
    await expect(page).toHaveURL('/credential');
    // Wait for button to be ready, then click with response listener
    const certBtn = page.getByRole('button', { name: 'Request Certification' });
    await expect(certBtn).toBeVisible({ timeout: 5_000 });
    await expect(certBtn).toBeEnabled();
    await Promise.all([
      page.waitForResponse(resp => resp.url().includes('/credential/issue'), { timeout: 30_000 }),
      certBtn.click(),
    ]);
    await expect(page.getByText('Credential Issued')).toBeVisible({ timeout: 30_000 });
    await page.getByRole('link', { name: 'Next: Generate Zero-Knowledge Proof' }).click();

    // Step 4 — Prove
    await expect(page).toHaveURL('/prove');
    await page.getByRole('button', { name: 'Generate Proof' }).click();
    await expect(page.getByText('Proof Generated')).toBeVisible({ timeout: 120_000 });
    await page.getByRole('link', { name: 'Next: Verify On-Chain' }).click();

    // Step 5 — Verify
    await expect(page).toHaveURL('/verify');
    await page.getByRole('button', { name: 'Verify on Base Sepolia' }).click();
    await expect(page.locator('span').filter({ hasText: 'Verified' })).toBeVisible({ timeout: 30_000 });

    // New buttons should be visible
    await expect(page.getByRole('button', { name: 'Share Your Proof' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('link', { name: /Go to Dashboard/ })).toBeVisible({ timeout: 5_000 });
  });
});
