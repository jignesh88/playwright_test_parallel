# RetailFlow Bank — Sample App + Playwright Test Framework

A small banking demo (Node.js/Express API, React/Vite SPA) paired with a layered Playwright test framework: page objects, Gherkin/BDD on the same objects, and Allure reporting served from a Docker container.

## Layout

```
backend/     Express + JWT API (port 4100)
frontend/    React + Vite SPA  (port 5273)
tests/       Specs, page objects, fixtures, BDD steps
  ├─ pages/    Page Objects (selectors live ONLY here)
  ├─ steps/    playwright-bdd step definitions (reuse pages/)
  ├─ support/  Shared helpers (test data, Allure labels)
  └─ *.spec.ts Plain Playwright specs
features/    Gherkin .feature files
docker/      Allure-report Docker image + scripts
```

## Install

```bash
npm run install:all
npx playwright install chromium
```

## Run the app locally

```bash
npm run dev:backend   # in one terminal — http://localhost:4100
npm run dev:frontend  # in another — http://localhost:5273
```

Log in with `demo` / `password123`. The seed user has two accounts (`Everyday Checking`, `Rainy Day Savings`).

### Features

| Feature       | Route          | Notes                                                |
|---------------|----------------|------------------------------------------------------|
| Login         | `/login`       | JWT-based                                            |
| Account       | `/account`     | Total balance across accounts                        |
| Accounts      | `/accounts`    | Open new checking/savings accounts                   |
| Transactions  | `/transactions`| Credit/debit per account                             |
| Transfer      | `/transfer`    | Move funds between accounts                          |
| Payments      | `/payments`    | Pay bills via ACH / Card / Wire                      |
| Loans         | `/loans`       | Apply for a loan (auto-decisioned by amount tier)    |
| Settings      | `/settings`    | Notification channels (email / SMS / marketing)      |

Storage is in-memory; data resets on backend restart.

## Test framework

Two suites share the same page objects. The Playwright config auto-starts the backend/frontend if they're not already running.

### Plain Playwright (POM + fixtures)

```bash
npm test                # app suite (excludes the external search spec)
npm run test:headed     # headed mode
npm run test:external   # the 1000-test Wikipedia spec (separate project)
npm run test:all        # both projects
```

Design rules:
- One **page object** per screen under `tests/pages/`. Selectors (`data-testid`) live **only** here.
- A `tests/fixtures.ts` extends Playwright's `test` with page-object fixtures + two auth fixtures:
  - `authedPage` — signs in as the shared `demo` user. Kept for back-compat.
  - `freshPage` / `freshUser` — mints an ephemeral user per test via `POST /api/_test/users`. **Use this for new tests.**
- Shared test data (demo credentials, seed account names) lives in `tests/support/testData.ts`.
- Specs reference page objects, never `data-testid` directly.

### Per-test backend isolation

The in-memory backend is shared across all workers, so two tests using the same user can step on each other (settings race, balance drain). The `freshPage` / `freshUser` fixtures eliminate this: each test gets its own user with seeded checking + savings accounts.

```ts
test('user can enable SMS and persist it', async ({ freshPage, settingsPage }) => {
  void freshPage;        // logged in as a fresh user; localStorage primed
  await settingsPage.goto();
  // ...
});
```

Mechanics:
- `seedFor(testInfo)` hashes the test's title path to a stable-but-unique username, so retries reuse the same user (cleaner Allure history) while parallel tests never collide.
- `POST /api/_test/users` is only mounted when `NODE_ENV !== 'production'`.
- BDD scenarios opt in with `Given I am signed in as a fresh user` (the existing `Given I am signed in as the demo user` step is unchanged).

Migration of remaining specs from `authedPage` → `freshPage` is incremental — change one spec at a time when its flakiness earns the swap.

### Test data factories

At 1000 tests the same three callsites with `Date.now()` / `Math.random()` literals turn into 30 — every domain field change touches every spec. `tests/support/factories.ts` provides one factory per input-shaped entity, with sensible happy-path defaults and partial overrides:

```ts
import { makeLoan, makeAccountName, makePayment } from './support/factories';

test('small loan is auto-approved', async ({ authedPage, loansPage }, testInfo) => {
  void authedPage;
  await loansPage.goto();
  await loansPage.apply(makeLoan(testInfo, { amount: 2_000 }));
  await loansPage.expectSuccess('approved');
});

test('user can open a savings account', async ({ authedPage, accountsPage }, testInfo) => {
  void authedPage;
  await accountsPage.goto();
  const name = makeAccountName(testInfo, 'savings');
  await accountsPage.openAccount('savings', name);
  await accountsPage.expectAccountListed(name);
});
```

Rules:
- Factories return INPUT shapes ready for page-object methods (`LoansPage.apply`, etc.). They mirror PO method signatures.
- Uniqueness comes from a seeded RNG keyed off `testInfo.titlePath`. Same test path → same generated values across runs (retries reuse them; parallel tests across files never collide).
- One function per entity, no `Factory<T>` abstraction, no fluent builders. `makeLoan(testInfo, { amount: 200_000 })` reads better than `loanBuilder.withAmount(...).build()`.
- Migration is opt-in — existing inline literals keep working.

### BDD (playwright-bdd)

```bash
npm run test:bdd            # generates specs from features/ then runs them
npm run test:bdd:report     # open the HTML report
```

- `.feature` files in `features/` use Gherkin with `Scenario Outline` for data-driven cases.
- Step definitions in `tests/steps/*.steps.ts` **reuse the same page objects** as the POM suite — no duplicated selectors.
- Feature-level tags (`@epic:Banking @feature:Transfers @severity:critical`) flow through a `Before` hook into Allure labels.

## Allure reporting

`allure-playwright` writes to separate result dirs per suite (`allure-results/` for the app suite, `allure-results-bdd/` for BDD).

### Local

```bash
# After running tests:
npm run allure:serve       # app suite — opens browser
npm run allure:bdd:serve   # BDD suite

# Or generate the static HTML and open it:
npm run allure:generate && npm run allure:open
```

The Allure report tree is grouped by `epic / feature / severity`. POM specs use the `tagSuite()` helper (`tests/support/allure.ts`); BDD scenarios get the same labels from Gherkin tags.

### Squad ownership

Every test carries the squad that owns its feature. `tests/support/squads.ts` is the single source of truth:

```ts
SQUADS = {
  identity: { name: 'Identity Squad', email: 'identity@retailflow.example' },
  money:    { name: 'Money Movement', email: 'money@retailflow.example' },
  lending:  { name: 'Lending Squad',  email: 'lending@retailflow.example' },
  platform: { name: 'Platform Squad', email: 'platform@retailflow.example' },
};

FEATURE_OWNERSHIP = {
  Authentication: 'identity',
  Accounts:       'money',
  Transfers:      'money',
  Payments:       'money',
  Settings:       'platform',
  Loans:          'lending',
};
```

`tagSuite()` (POM) and the BDD `Before()` hook look up the squad from the feature name and auto-attach:

| Attached value                                  | Where it shows up                               |
|-------------------------------------------------|-------------------------------------------------|
| `allure.owner = <Squad name>`                   | Allure **Owners** view groups tests per squad   |
| `allure.tag('squad:<id>')`                      | Filterable from the Allure UI                   |
| `allure.parameter('squadEmail', ...)`           | Visible on the test detail page                 |
| Playwright annotation `{ type: 'squad', ... }`  | Playwright HTML report + `TestCase.annotations` |

**Adding a feature**: add one row to `FEATURE_OWNERSHIP` (and a squad to `SQUADS` if needed). No spec edits required — the feature name already passed to `tagSuite()` / `@feature:<Name>` flows ownership through.

### Docker-served reports (per-suite, with 7-day trends)

A multi-stage image generates per-suite Allure HTML and serves it via nginx at `/reports/{app,bdd,external}`.

```bash
# Generate fresh test results first:
npm test
npm run test:bdd

# Build and serve the report container:
npm run report:docker:build   # stage results → docker compose build → extract history
npm run report:docker:up      # serves on http://localhost:8081
npm run report:docker:down
```

Open http://localhost:8081 to see the landing page; each suite is at `/reports/<suite>/`. Override the host port with `ALLURE_REPORT_PORT=8082 npm run report:docker:up`.

#### 7-day rolling history

Each build inherits the trend from the previous build:

1. `docker/stage-results.sh` prunes `docker/history/` of anything older than `ALLURE_HISTORY_RETENTION_DAYS` (default `7`), then injects the surviving `history/` into the staged results.
2. `allure generate` produces a report with the trend baked in.
3. `docker/extract-history.sh` pulls the freshly-generated `history/` back out into `docker/history/` for the next run.

In CI, an `actions/cache` entry with a date-keyed `restore-keys` pattern carries `docker/history/` across pipeline runs.

## Scripts reference

```
# App
npm run install:all
npm run dev:backend / dev:frontend
npm run build:frontend

# Tests
npm test                 # app suite, default 10 workers
npm run test:headed
npm run test:external    # external search suite (1000 tests)
npm run test:all         # both projects
npm run test:bdd         # generate + run BDD
npm run test:report
npm run test:bdd:report

# Allure (local)
npm run allure:serve / :open / :generate
npm run allure:bdd:serve / :bdd:open / :bdd:generate

# Allure in Docker
npm run report:docker:stage   # copy allure-results-* into docker/staging/
npm run report:docker:build   # stage → build → extract history
npm run report:docker:up
npm run report:docker:down
npm run report:docker:logs
```

## CI

<<<<<<< HEAD
`.github/workflows/playwright.yml`:
- Test matrix runs the `external` project across 10 shards, uploading per-shard `allure-results-external-shard-N` artifacts.
- A downstream `report-image` job merges shards, stages results, builds the Allure-report Docker image, and **pushes it to GHCR** (GitHub Container Registry).
- Allure trend history persists across pipeline runs via `actions/cache` on `docker/history/`.
=======
`.github/workflows/playwright.yml` runs three independent test matrices in parallel, then builds a single Allure report image from their combined results:

| Job             | Project    | Shards | Web server | Suite size today | Notes                                                  |
|-----------------|------------|--------|------------|------------------|--------------------------------------------------------|
| `app-test`      | `app`      | 4      | Yes        | ~15 tests        | Playwright `webServer` starts backend + frontend       |
| `bdd-test`      | (BDD)      | 2      | Yes        | ~15 scenarios    | Runs `bddgen` before `playwright test`                 |
| `external-test` | `external` | 10     | No         | 1000 tests       | `SKIP_WEB_SERVER=1`; the Wikipedia validation runs     |

Each matrix uploads `allure-results-<suite>-shard-N` artifacts. The `report-image` job depends on all three, merges every shard's results into `allure-results{,-bdd,-external}/`, stages them, and builds the Docker image (uploaded as `allure-report-image` tarball, 7-day retention). Allure trend history persists across runs via `actions/cache` on `docker/history/`.

Shared setup (Node, deps, browser cache) lives in a composite action at [`.github/actions/setup-playwright/`](.github/actions/setup-playwright/action.yml) so each matrix job stays under 20 lines.
>>>>>>> origin/main

### Pulling the report image from GHCR

Every CI run pushes an immutable SHA-tagged image. Builds on `main` also move the `:latest` tag.

```bash
# Latest image from the main branch:
docker pull ghcr.io/jignesh88/playwright_test_parallel/allure-report:latest
docker run --rm -p 8081:80 ghcr.io/jignesh88/playwright_test_parallel/allure-report:latest

# Or pin to a specific commit:
docker pull ghcr.io/jignesh88/playwright_test_parallel/allure-report:sha-<short>
```

<<<<<<< HEAD
First-time pull from a private repo requires `docker login ghcr.io` with a PAT that has `read:packages` scope (or `gh auth token` piped to `docker login`). To make the package public, go to the package's GitHub page → Package settings → Change visibility — this is a one-time per-repo step.

Each successful CI run's job summary prints the exact `docker pull` command for that build.
=======
**Tuning shard counts**: increase per-suite shard count when one suite's wall-clock exceeds ~10 min. Playwright shards by test file count, so very long files balance poorly — split them or bump shard count.
>>>>>>> origin/main

## Claude skills

Reusable project-scoped skills live under `.claude/skills/`. Each one is a markdown file the Claude Code harness loads when you invoke it; together they encode the conventions in this repo so you can replicate them in other projects.

| Skill | What it covers |
|-------|----------------|
| [`playwright-pom-bdd`](.claude/skills/playwright-pom-bdd/SKILL.md) | Framework bootstrap: directory layout, page objects, fixtures, BDD layer reusing the same objects, two-config pattern, parallelism gotchas. |
| [`allure-docker-reports`](.claude/skills/allure-docker-reports/SKILL.md) | Allure reporter wiring, multi-stage Docker image, nginx config, staging/extract scripts, 7-day rolling history, GitHub Actions matrix + cache. |
| [`squad-ownership`](.claude/skills/squad-ownership/SKILL.md) | Single `SQUADS` table, `tagSuite()`/BDD `Before()` mapping, Allure owner/tag/parameter, "add a feature = one row" workflow. |

Invoke with `/playwright-pom-bdd`, `/allure-docker-reports`, `/squad-ownership` from any session opened in this repo. To use in another repo, copy the relevant `.claude/skills/<name>/` directory across.

## Design principles

- **SRP** — one page object per screen, one step file per domain.
- **DRY** — selectors centralized in page objects; auth centralized in `authedPage`; demo data in one file.
- **YAGNI** — no base classes, no generic "framework" helpers added without two real callers needing them.
- BDD and POM share the same object graph; adding a new feature is one page object, one fixture entry, one spec, and (optionally) one feature file with reused steps.
