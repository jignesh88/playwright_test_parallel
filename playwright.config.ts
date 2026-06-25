import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  workers: process.env.CI ? 10 : 10,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5273',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.SKIP_WEB_SERVER
    ? undefined
    : [
        {
          command: 'npm --prefix backend run dev',
          port: 4100,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
        {
          command: 'npm --prefix frontend run dev',
          port: 5273,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      ],
});
