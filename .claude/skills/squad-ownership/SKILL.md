---
name: squad-ownership
description: Attach squad ownership (team name + email) to every Playwright test so Allure groups failures by responsible team. Use when adding ownership/accountability to a test suite, or when failures need to route to specific squads.
---

# Squad ownership for tests

This skill adds team ownership to every test in a Playwright + Allure suite. It expects the `playwright-pom-bdd` and `allure-docker-reports` skills to already be applied (you need `tests/support/allure.ts` with `tagSuite()` and a BDD `Before()` hook in `tests/steps/fixtures.ts`).

## Why a single ownership table

Drift kills team-routed reporting. If ownership is duplicated across spec files, CI config, on-call rotations, and a Slack channel mapping, it'll be inconsistent within a quarter. This skill insists on:

- **One TypeScript constant** as the source of truth (`tests/support/squads.ts`).
- All consumers — POM `tagSuite()`, BDD `Before()` hook, future notification scripts — look up squads by feature name from that one table.
- Adding a feature = one row. No spec edits, no config edits.

## The squads table

```ts
// tests/support/squads.ts
export type SquadId = 'identity' | 'money' | 'lending' | 'platform';

export type Squad = {
  id: SquadId;
  name: string;
  email: string;
};

export const SQUADS: Record<SquadId, Squad> = {
  identity: { id: 'identity', name: 'Identity Squad', email: 'identity@retailflow.example' },
  money:    { id: 'money',    name: 'Money Movement', email: 'money@retailflow.example' },
  lending:  { id: 'lending',  name: 'Lending Squad',  email: 'lending@retailflow.example' },
  platform: { id: 'platform', name: 'Platform Squad', email: 'platform@retailflow.example' },
};

export const FEATURE_OWNERSHIP: Record<string, SquadId> = {
  Authentication: 'identity',
  Accounts:       'money',
  Transfers:      'money',
  Payments:       'money',
  Settings:       'platform',
  Loans:          'lending',
};

export function squadForFeature(feature: string | undefined): Squad | undefined {
  if (!feature) return undefined;
  const id = FEATURE_OWNERSHIP[feature];
  return id ? SQUADS[id] : undefined;
}
```

Adjust `SquadId`, `SQUADS`, and `FEATURE_OWNERSHIP` to the target repo's teams. **Feature names must match exactly** the `feature` value passed to `tagSuite()` and the `@feature:<Name>` Gherkin tag.

## What gets attached to every test

When a test's feature has an entry in `FEATURE_OWNERSHIP`, this metadata flows in automatically:

| Attached value                                  | Visible where                                    |
|-------------------------------------------------|--------------------------------------------------|
| `allure.owner(<squad name>)`                    | Allure **Owners** view groups tests by squad     |
| `allure.tag('squad:<id>')`                      | Filterable from the Allure UI                    |
| `allure.parameter('squadEmail', <email>)`       | Rendered on the test detail page                 |
| Playwright annotation `{ type: 'squad', ... }`  | Playwright HTML reporter + `TestCase.annotations` |

## Wiring POM (`tagSuite`)

Extend `tests/support/allure.ts`:

```ts
import { allure } from 'allure-playwright';
import { test } from '@playwright/test';
import { squadForFeature } from './squads';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

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
```

Each spec calls it once inside its `describe` (no change to existing spec code if the feature name in `tagSuite()` already matches `FEATURE_OWNERSHIP`):

```ts
test.describe('Loans', () => {
  tagSuite({ epic: 'Banking', feature: 'Loans', severity: 'normal' });
  // ...
});
```

## Wiring BDD (Gherkin)

Extend the `Before()` hook in `tests/steps/fixtures.ts` to look up the squad after parsing `@feature:<Name>`:

```ts
import { allure } from 'allure-playwright';
import { squadForFeature } from '../support/squads';

Before(async ({ $tags, $testInfo }) => {
  let featureName: string | undefined;
  for (const tag of $tags) {
    const [, kind, value] = /^@(epic|feature|severity|story):(.+)$/.exec(tag) ?? [];
    if (!kind || !value) continue;
    if (kind === 'epic') await allure.epic(value);
    else if (kind === 'feature') { await allure.feature(value); featureName = value; }
    else if (kind === 'story') await allure.story(value);
    else if (kind === 'severity') await allure.severity(value);
  }

  const squad = squadForFeature(featureName);
  if (squad) {
    await allure.owner(squad.name);
    await allure.tag(`squad:${squad.id}`);
    await allure.parameter('squadEmail', squad.email);
    $testInfo.annotations.push({ type: 'squad', description: squad.id });
  }
});
```

Feature files keep their existing tag block:

```gherkin
@epic:Banking @feature:Loans @severity:normal
Feature: Loan applications
  ...
```

## Verifying

Run the suite, then inspect a result JSON:

```bash
node -e "
const fs = require('fs');
const f = fs.readdirSync('allure-results').find(n => n.endsWith('-result.json'));
const j = JSON.parse(fs.readFileSync('allure-results/'+f,'utf8'));
console.log('owner:', j.labels.find(l => l.name==='owner')?.value);
console.log('squad-tag:', j.labels.filter(l => l.name==='tag').map(l => l.value));
console.log('squadEmail:', j.parameters?.find(p => p.name==='squadEmail')?.value);
"
```

Then `npm run allure:serve` — the Owners view lists every squad with its tests under it, and clicking into a test shows the squad email on the detail page.

## Why not `categories.json`?

Allure Categories bucket failures by `messageRegex` / `traceRegex` — that's a failure-type axis, not an ownership axis. The built-in Owners view (driven by `allure.owner()`) already does ownership grouping cleanly. Only add a `categories.json` when you want to bucket *failures by kind* (timeouts vs. selector errors) *within* each squad — that's a real second axis, not a duplicate.

## Adding a feature or squad

1. (If new squad) Add an entry to `SQUADS` and extend `SquadId`.
2. Add a row to `FEATURE_OWNERSHIP`: feature name → squad id.

That's it. Both POM and BDD flows pick it up on next run.

## Not in scope here

- Routing failure notifications to squad emails. That's a separate concern (CI step that reads `allure-results/*-result.json`, groups failures by `owner` label, sends mail/Slack/issues). The data is in the result JSONs — the notification skill, when added, will read it from there.
