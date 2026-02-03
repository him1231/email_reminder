import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 800 },
    baseURL: 'http://localhost:5173',
    actionTimeout: 5000,
    navigationTimeout: 15_000,
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } }
  ]
});
