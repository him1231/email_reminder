import { test, expect } from '@playwright/test';

test.describe('Visual: list loading states', () => {
  test('staff list shows skeleton while loading', async ({ page }) => {
    await page.goto('/?forceLoading=1');
    const placeholder = page.locator('[data-testid="staff-placeholder-1"]');
    await expect(page.locator('[data-testid="staff-list-loading"]')).toBeVisible();
    await expect(placeholder).toBeVisible();
    await expect(page.locator('[data-testid="staff-list-loading"]')).toHaveScreenshot('staff-list-loading.png', { maxDiffPixelRatio: 0.002 });
  });

  test('templates list shows loading card', async ({ page }) => {
    await page.goto('/?forceLoading=1');
    const tpl = page.locator('[data-testid="templates-placeholder"]');
    await expect(page.locator('[data-testid="templates-list-loading"]')).toBeVisible();
    await expect(tpl).toBeVisible();
    await expect(page.locator('[data-testid="templates-list-loading"]')).toHaveScreenshot('templates-list-loading.png', { maxDiffPixelRatio: 0.002 });

    // Preview is hidden by default; open editor to show preview and capture that visual as well
    await expect(page.locator('[data-testid="template-editor-form"]')).toHaveCount(0);
    await page.click('[data-testid="add-template-btn"]');
    await page.waitForSelector('[data-testid="template-editor-form"]');
    await expect(page.locator('[data-testid="template-editor-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-editor-form"]')).toHaveScreenshot('templates-editor-open.png', { maxDiffPixelRatio: 0.002 });
  });
});
