import { test, expect } from '@playwright/test';

test('console smoke — no runtime errors on key pages', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || /uncaught|error|exception|syntax/i.test(text)) {
      errors.push(`${type}: ${text}`);
    }
    // still log all console messages for debugging
    console.log(`console.${type}: ${text}`);
  });

  // check root
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'test-results/root.png', fullPage: true });

  // check forced-loading UI (deterministic)
  await page.goto('/?forceLoading=1');
  await page.waitForSelector('[data-testid="staff-list-loading"]', { timeout: 5000 });
  await page.screenshot({ path: 'test-results/loading-staff.png', fullPage: true });

  await page.goto('/templates?forceLoading=1');
  await page.waitForSelector('[data-testid="templates-list-loading"]', { timeout: 5000 });
  await page.screenshot({ path: 'test-results/loading-templates.png', fullPage: true });

  if (errors.length) {
    console.error('Console errors were detected:\n' + errors.join('\n'));
  }

  expect(errors, `No console errors expected — found ${errors.length}`).toEqual([]);
});
