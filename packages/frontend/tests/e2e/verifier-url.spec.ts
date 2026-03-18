/**
 * REPUTRANS — Verifier URL E2E Tests
 * Tests the /shared-proof read-only verifier page.
 *
 * Prerequisites: API (3001), Anvil (8545), Frontend (3000) all running.
 */
import { test, expect } from '@playwright/test';

test.describe('Verifier URL (/shared-proof)', () => {
  test('missing params shows invalid-url state', async ({ page }) => {
    await page.goto('/shared-proof');
    await expect(page.getByText('Invalid proof URL')).toBeVisible({ timeout: 10_000 });
  });

  test('page shows REPUTRANS logo and Verifier View badge', async ({ page }) => {
    await page.goto('/shared-proof');
    await expect(page.getByText('REPUTRANS').first()).toBeVisible();
    await expect(page.getByText('Verifier View')).toBeVisible();
  });

  test('shows "Proof Invalid" on bad proof data', async ({ page }) => {
    await page.goto('/shared-proof?proof=deadbeef&inputs=%5B%220x1%22%5D');
    await expect(page.getByText('Proof Invalid')).toBeVisible({ timeout: 60_000 });
  });

  test('missing only inputs param shows invalid-url state', async ({ page }) => {
    await page.goto('/shared-proof?proof=abc');
    await expect(page.getByText('Invalid proof URL')).toBeVisible({ timeout: 10_000 });
  });

  test('missing only proof param shows invalid-url state', async ({ page }) => {
    await page.goto('/shared-proof?inputs=%5B%5D');
    await expect(page.getByText('Invalid proof URL')).toBeVisible({ timeout: 10_000 });
  });
});
