import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/.features-gen/**', '**/steps/**', '**/pages/**', '**/support/**'],
  fullyParallel: true,
  workers: process.env.CI ? 10 : 10,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        detail: true,
        suiteTitle: false,
        environmentInfo: {
          node: process.version,
          os: process.platform,
          ci: process.env.CI ? 'true' : 'false',
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:5273',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Video defaults OFF. Opt in per spec with markSmoke() (tests/support/smoke.ts)
    // — traces give equivalent forensic detail at a fraction of the size.
    video: 'off',
  },
  projects: [
    {
      name: 'app',
      testIgnore: [
        '**/google-search.spec.ts',
        '**/.features-gen/**',
        '**/steps/**',
        '**/pages/**',
        '**/support/**',
      ],
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'external',
      testMatch: ['**/google-search.spec.ts'],
      use: { ...devices['Desktop Chrome'] },
    },
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
