import { defineConfig, devices } from '@playwright/test';
import { defineBddProject } from 'playwright-bdd';

const bddProject = defineBddProject({
  name: 'bdd',
  features: 'features/**/*.feature',
  steps: 'tests/steps/**/*.ts',
  outputDir: 'tests/.features-gen',
});

export default defineConfig({
  fullyParallel: true,
  workers: process.env.CI ? 4 : 4,
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'playwright-report-bdd' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results-bdd',
        detail: true,
        suiteTitle: false,
        environmentInfo: {
          node: process.version,
          os: process.platform,
          ci: process.env.CI ? 'true' : 'false',
          framework: 'playwright-bdd',
        },
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:5273',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      ...bddProject,
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
