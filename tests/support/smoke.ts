import { test } from '@playwright/test';
import { allure } from 'allure-playwright';

/**
 * Mark every test in the current FILE as `@smoke`.
 *
 * - Enables video capture (`video: 'retain-on-failure'`) for this file's tests
 *   so the highest-value flows leave a screen recording on failure. All other
 *   specs default to no video; traces still cover them.
 * - Pushes a `@smoke` Allure tag + Playwright annotation so smoke tests are
 *   filterable from the report and the CLI.
 *
 * Call at FILE TOP, BEFORE any `test.describe()` — Playwright requires the
 * video override at module/file scope because it spawns a new worker.
 *
 *   import { markSmoke } from './support/smoke';
 *   markSmoke();
 *
 *   test.describe('Login', () => {
 *     tagSuite({ epic: 'Banking', feature: 'Authentication', severity: 'blocker' });
 *     // tests...
 *   });
 */
export function markSmoke() {
  test.use({ video: 'retain-on-failure' });

  test.beforeEach(async () => {
    await allure.tag('smoke');
    test.info().annotations.push({ type: 'smoke' });
  });
}
