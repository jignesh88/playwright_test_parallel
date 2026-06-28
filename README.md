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
- A `tests/fixtures.ts` extends Playwright's `test` with page-object fixtures + an `authedPage` fixture that signs in the demo user once per test.
- Shared test data (demo credentials, seed account names) lives in `tests/support/testData.ts`.
- Specs reference page objects, never `data-testid` directly.

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

`.github/workflows/playwright.yml` runs three independent test matrices in parallel, then builds a single Allure report image from their combined results:

| Job             | Project    | Shards | Web server | Suite size today | Notes                                                  |
|-----------------|------------|--------|------------|------------------|--------------------------------------------------------|
| `app-test`      | `app`      | 4      | Yes        | ~15 tests        | Playwright `webServer` starts backend + frontend       |
| `bdd-test`      | (BDD)      | 2      | Yes        | ~15 scenarios    | Runs `bddgen` before `playwright test`                 |
| `external-test` | `external` | 10     | No         | 1000 tests       | `SKIP_WEB_SERVER=1`; the Wikipedia validation runs     |

Each matrix uploads `allure-results-<suite>-shard-N` artifacts. The `report-image` job depends on all three, merges every shard's results into `allure-results{,-bdd,-external}/`, stages them, and builds the Docker image (uploaded as `allure-report-image` tarball, 7-day retention). Allure trend history persists across runs via `actions/cache` on `docker/history/`.

Shared setup (Node, deps, browser cache) lives in a composite action at [`.github/actions/setup-playwright/`](.github/actions/setup-playwright/action.yml) so each matrix job stays under 20 lines.

To run the image locally from the CI artifact:

```bash
docker load -i allure-report-image.tar
docker run --rm -p 8081:80 retailflow/allure-report:local
```

**Tuning shard counts**: increase per-suite shard count when one suite's wall-clock exceeds ~10 min. Playwright shards by test file count, so very long files balance poorly — split them or bump shard count.

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
