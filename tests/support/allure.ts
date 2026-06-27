import { allure } from 'allure-playwright';
import { test } from '@playwright/test';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

/**
 * Tag every test in the current describe block. Call inside a `describe`
 * (not inside a test) — the labels are applied via beforeEach so they
 * attach to each test result.
 */
export function tagSuite(opts: { epic?: string; feature?: string; severity?: Severity }) {
  test.beforeEach(async () => {
    if (opts.epic) await allure.epic(opts.epic);
    if (opts.feature) await allure.feature(opts.feature);
    if (opts.severity) await allure.severity(opts.severity);
  });
}
