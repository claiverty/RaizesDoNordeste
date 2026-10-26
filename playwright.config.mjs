import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  workers: process.env.CI ? 2 : 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium-mobile', use: { ...devices['Pixel 7'], viewport: { width: 360, height: 800 } } },
  ],
  webServer: {
    command: 'node server.mjs',
    url: 'http://127.0.0.1:4173/api/v1/health',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    env: { HOST: '127.0.0.1', PORT: '4173', NODE_ENV: 'test' },
  },
});
