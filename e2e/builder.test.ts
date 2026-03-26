import { test, expect } from '@playwright/test';

test('landing page is accessible', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toBeVisible();
});

test('unauthenticated user visiting /builder is redirected', async ({ page }) => {
  await page.goto('/builder');
  // Should redirect to / since no auth cookie
  await expect(page).toHaveURL('/');
});
