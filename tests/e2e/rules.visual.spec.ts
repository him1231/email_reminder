import { test, expect } from '@playwright/test';

test.describe('Visual: rules list & editor', () => {
  test('rules list shows loading card and editor opens', async ({ page }) => {
    await page.goto('/?forceLoading=1');
    await expect(page.locator('[data-testid="rules-list-loading"]')).toBeVisible();
    await expect(page.locator('[data-testid="rules-placeholder"]')).toBeVisible();

    await expect(page.locator('[data-testid="rule-editor-form"]')).toHaveCount(0);
    await page.click('[data-testid="add-rule-btn"]');
    await page.waitForSelector('[data-testid="rule-editor-form"]');
    await expect(page.locator('[data-testid="rule-editor-form"]')).toBeVisible();
    await expect(page.locator('[data-testid="rule-editor-form"]')).toHaveScreenshot('rules-editor-open.png', { maxDiffPixelRatio: 0.002 });
  });
});
