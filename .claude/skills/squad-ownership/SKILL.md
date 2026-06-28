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

## Failure notifications (the "B half")

When CI fails, surface which squad owns each failing test. The data is already there — `allure-results/*-result.json` carries `labels[].name === 'owner'` plus `parameters[].name === 'squadEmail'`. A small post-test job reads those, groups by owner, and posts to GitHub + (optionally) Slack:

1. `scripts/squad-failure-report.ts` — reads one or more allure-results dirs, groups failures by owner, emits Markdown to stdout.
2. CI `failure-report` job runs `if: ${{ failure() }}` (skips on green) and:
   - Pipes the report into `$GITHUB_STEP_SUMMARY` (always — visible on the run page).
   - Posts the same report as a PR comment via `gh pr comment` (only on `pull_request` runs).
   - Posts a Slack message via `secrets.SLACK_WEBHOOK_URL` if the secret is set (opt-in per repo).

Design rules to preserve:

- **Read failures, don't run tests.** This job consumes `allure-results-*` artifacts; it doesn't re-run anything.
- **`failure()` gate, not `always()`.** Downloading artifacts on every green run is wasteful at 1000 tests.
- **Two channels by default**, both zero-config: step summary + PR comment. Slack is the opt-in third for teams that want push notifications.
- **No per-squad routing rules** at small scale. List every squad with failures; the PR author triages.
- **Don't auto-create GitHub issues.** Closed issues reopen on transient flakes — that creates more noise than it cures.
- **One squad's failures stay in one section.** Don't sort by severity — sort alphabetically by squad name so each squad's lead can ⌘F to their section.

## Why not `categories.json` for ownership?

Allure Categories bucket failures by `messageRegex` / `traceRegex` — that's a failure-type axis, not an ownership axis. The built-in Owners view (driven by `allure.owner()`) already does ownership grouping cleanly. Categories DO add value as a perpendicular axis (selector failures vs. timeouts vs. backend errors) — see the `allure-docker-reports` skill.

## Adding a feature or squad

1. (If new squad) Add an entry to `SQUADS` and extend `SquadId`.
2. Add a row to `FEATURE_OWNERSHIP`: feature name → squad id.

That's it. Both POM and BDD flows pick it up on next run, and the failure-report job's grouping picks them up automatically.
