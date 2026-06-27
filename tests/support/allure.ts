import { allure } from 'allure-playwright';
import { test } from '@playwright/test';
import { squadForFeature } from './squads';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

/**
 * Tag every test in the current describe block. Call inside a `describe`
 * (not inside a test) — labels are applied via beforeEach so they attach
 * to each test result.
 *
 * When the feature has an entry in FEATURE_OWNERSHIP, ownership metadata
 * is added automatically:
 *   - Allure `owner` label   = squad name (Allure UI groups tests by owner)
 *   - Allure `tag`           = `squad:<id>` (filterable from the Allure UI)
 *   - Allure `parameter`     = squadEmail (shown on the test detail page)
 *   - Playwright annotation  = { type: 'squad', description: <id> }
 *                              (visible in the HTML reporter and TestCase API)
 */
export function tagSuite(opts: { epic?: string; feature?: string; severity?: Severity }) {
  test.beforeEach(async () => {
    if (opts.epic) await allure.epic(opts.epic);
    if (opts.feature) await allure.feature(opts.feature);
    if (opts.severity) await allure.severity(opts.severity);

    const squad = squadForFeature(opts.feature);
    if (squad) {
      await allure.owner(squad.name);
      await allure.tag(`squad:${squad.id}`);
      await allure.parameter('squadEmail', squad.email);
      test.info().annotations.push({ type: 'squad', description: squad.id });
    }
  });
}
