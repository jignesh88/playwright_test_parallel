---
name: allure-docker-reports
description: Wire Allure reporting into a Playwright project, ship per-suite reports in a Docker/nginx container with a 7-day rolling history, and integrate with GitHub Actions CI. Use when adding Allure to a repo, or when an existing project needs Docker-served reports with trend persistence.
---

# Allure + Docker + CI reporting

This skill encodes the reporting pipeline from `playwright_test_parallel`. Apply it after the `playwright-pom-bdd` skill is in place (you need `tests/`, `features/`, `playwright.config.ts`, and `playwright.bdd.config.ts`).

## Architecture

```
allure-results/           ← app suite (Playwright reporter output)
allure-results-bdd/       ← BDD suite
docker/
  staging/<suite>/        ← per-build staging, populated by stage-results.sh
  history/<suite>/        ← persisted Allure history (7-day rolling)
  allure-report.Dockerfile  multi-stage: generate HTML + serve via nginx
  nginx.conf              routes /reports/<suite>/ → /usr/share/nginx/html/reports/<suite>/
  landing.html            tiny index linking each suite
  generate-reports.sh     runs allure generate per subdir of /results
  stage-results.sh        host-side: copy results in + inject prior history
  extract-history.sh      post-build: pull fresh history out of the image
docker-compose.yml        local service on host port 8081
```

## Step 1 — install + reporter wiring

```bash
npm i -D allure-playwright allure-commandline rimraf
```

Add Allure to **both** Playwright configs. Critical points:
- **Separate result dirs per suite** so reports don't collide.
- Keep `trace`, `screenshot`, `video` on `retain-on-failure` — Allure auto-attaches them.

```ts
// playwright.config.ts
reporter: [
  ['list'],
  ['html', { open: 'never' }],
  ['allure-playwright', {
    resultsDir: 'allure-results',
    detail: true,
    suiteTitle: false,
    environmentInfo: {
      node: process.version,
      os: process.platform,
      ci: process.env.CI ? 'true' : 'false',
    },
  }],
],
use: {
  // ...
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
},
```

```ts
// playwright.bdd.config.ts
reporter: [
  ['list'],
  ['html', { open: 'never', outputFolder: 'playwright-report-bdd' }],
  ['allure-playwright', {
    resultsDir: 'allure-results-bdd',
    detail: true,
    suiteTitle: false,
    environmentInfo: {
      node: process.version,
      os: process.platform,
      ci: process.env.CI ? 'true' : 'false',
      framework: 'playwright-bdd',
    },
  }],
],
```

## Step 2 — label helper

```ts
// tests/support/allure.ts
import { allure } from 'allure-playwright';
import { test } from '@playwright/test';

export type Severity = 'blocker' | 'critical' | 'normal' | 'minor' | 'trivial';

export function tagSuite(opts: { epic?: string; feature?: string; severity?: Severity }) {
  test.beforeEach(async () => {
    if (opts.epic) await allure.epic(opts.epic);
    if (opts.feature) await allure.feature(opts.feature);
    if (opts.severity) await allure.severity(opts.severity);
  });
}
```

Each spec calls it once inside its `describe`:

```ts
test.describe('Loans', () => {
  tagSuite({ epic: 'Banking', feature: 'Loans', severity: 'normal' });
  // ...
});
```

For BDD, parse Gherkin tags inside the `Before` hook in `tests/steps/fixtures.ts`:

```ts
Before(async ({ $tags }) => {
  for (const tag of $tags) {
    const [, kind, value] = /^@(epic|feature|severity|story):(.+)$/.exec(tag) ?? [];
    if (!kind || !value) continue;
    if (kind === 'epic') await allure.epic(value);
    else if (kind === 'feature') await allure.feature(value);
    else if (kind === 'story') await allure.story(value);
    else if (kind === 'severity') await allure.severity(value);
  }
});
```

Tag each feature file:

```gherkin
@epic:Banking @feature:Loans @severity:normal
Feature: Loan applications
  ...
```

## Step 3 — npm scripts

```json
{
  "scripts": {
    "pretest": "rimraf allure-results",
    "pretest:bdd": "rimraf allure-results-bdd",
    "allure:generate": "allure generate allure-results --clean -o allure-report",
    "allure:open": "allure open allure-report",
    "allure:serve": "allure serve allure-results",
    "allure:bdd:generate": "allure generate allure-results-bdd --clean -o allure-report-bdd",
    "allure:bdd:open": "allure open allure-report-bdd",
    "allure:bdd:serve": "allure serve allure-results-bdd"
  }
}
```

## Step 4 — Docker image

Multi-stage: Temurin JRE + Allure CLI generates HTML; nginx serves it.

```dockerfile
# docker/allure-report.Dockerfile
FROM eclipse-temurin:21-jre-alpine AS builder

ARG ALLURE_VERSION=2.34.1
RUN apk add --no-cache curl tar bash \
 && curl -fsSL -o /tmp/allure.tgz \
      "https://github.com/allure-framework/allure2/releases/download/${ALLURE_VERSION}/allure-${ALLURE_VERSION}.tgz" \
 && mkdir -p /opt && tar -xzf /tmp/allure.tgz -C /opt \
 && ln -s "/opt/allure-${ALLURE_VERSION}/bin/allure" /usr/local/bin/allure \
 && rm /tmp/allure.tgz

WORKDIR /work
COPY docker/staging/ /results/
COPY docker/generate-reports.sh /usr/local/bin/generate-reports.sh
RUN chmod +x /usr/local/bin/generate-reports.sh \
 && /usr/local/bin/generate-reports.sh /results /report

FROM nginx:1.27-alpine AS runtime
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY docker/landing.html /usr/share/nginx/html/index.html
COPY --from=builder /report /usr/share/nginx/html/reports
EXPOSE 80
```

```nginx
# docker/nginx.conf
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    location = / { try_files /index.html =404; }
    location /reports/ {
        index index.html;
        try_files $uri $uri/ $uri/index.html =404;
        add_header Cache-Control "no-cache, must-revalidate";
    }
}
```

```bash
# docker/generate-reports.sh — runs INSIDE the image
#!/usr/bin/env bash
set -euo pipefail
RESULTS_ROOT="${1:?}"; REPORT_ROOT="${2:?}"
mkdir -p "$REPORT_ROOT"
shopt -s nullglob
for results_dir in "$RESULTS_ROOT"/*/; do
  name="$(basename "$results_dir")"
  if [ -z "$(find "$results_dir" -maxdepth 1 -name '*-result.json' -print -quit)" ]; then
    echo "skip: $name"; continue
  fi
  echo "generating: $name"
  allure generate "$results_dir" --clean -o "$REPORT_ROOT/$name"
done
```

## Step 5 — staging + history scripts (the heart of the 7-day rolling window)

```bash
# docker/stage-results.sh — runs ON HOST before docker build
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STAGING="$ROOT/docker/staging"
HISTORY="$ROOT/docker/history"
RETENTION_DAYS="${ALLURE_HISTORY_RETENTION_DAYS:-7}"

rm -rf "$STAGING"
mkdir -p "$STAGING/app" "$STAGING/bdd"
mkdir -p "$HISTORY/app" "$HISTORY/bdd"

prune_history() {
  local dir="$HISTORY/$1"
  [ -d "$dir" ] || return 0
  find "$dir" -type f -mtime "+${RETENTION_DAYS}" -delete 2>/dev/null || true
  find "$dir" -type d -empty -delete 2>/dev/null || true
  mkdir -p "$dir"
}

stage() {
  local src="$1" dest="$2"
  prune_history "$dest"
  if [ -d "$ROOT/$src" ] && [ -n "$(ls -A "$ROOT/$src" 2>/dev/null || true)" ]; then
    cp -R "$ROOT/$src/." "$STAGING/$dest/"
  fi
  if [ -n "$(ls -A "$HISTORY/$dest" 2>/dev/null || true)" ]; then
    mkdir -p "$STAGING/$dest/history"
    cp -R "$HISTORY/$dest/." "$STAGING/$dest/history/"
  fi
}

stage allure-results     app
stage allure-results-bdd bdd
```

```bash
# docker/extract-history.sh — runs ON HOST after docker build
#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HISTORY="$ROOT/docker/history"
IMAGE="${ALLURE_REPORT_IMAGE:-retailflow/allure-report:local}"

mkdir -p "$HISTORY/app" "$HISTORY/bdd"
cid="$(docker create "$IMAGE")"
trap 'docker rm -f "$cid" >/dev/null 2>&1 || true' EXIT

for suite in app bdd; do
  src="/usr/share/nginx/html/reports/$suite/history"
  tmp="$(mktemp -d)"
  if docker cp "$cid:$src/." "$tmp/" 2>/dev/null; then
    rm -rf "$HISTORY/$suite" && mkdir -p "$HISTORY/$suite"
    cp -R "$tmp/." "$HISTORY/$suite/"
    find "$HISTORY/$suite" -type f -exec touch {} +
  fi
  rm -rf "$tmp"
done
```

How retention works:
- `stage-results.sh` runs `find docker/history -mtime +7 -delete` on every build. Anything older than `ALLURE_HISTORY_RETENTION_DAYS` (default 7) is dropped.
- Surviving history files get injected into the staged results so `allure generate` baked the trend into the new report.
- `extract-history.sh` pulls the fresh history out of the built image and `touch`es every file so the prune window restarts.

Tune retention with `ALLURE_HISTORY_RETENTION_DAYS=14 npm run report:docker:build`.

## Step 6 — compose

```yaml
# docker-compose.yml
services:
  allure-report:
    build:
      context: .
      dockerfile: docker/allure-report.Dockerfile
    image: retailflow/allure-report:local
    container_name: retailflow-allure-report
    ports:
      - "${ALLURE_REPORT_PORT:-8081}:80"
    restart: unless-stopped
```

```jsonc
// package.json — add these scripts
{
  "scripts": {
    "report:docker:stage": "bash docker/stage-results.sh",
    "report:docker:build": "npm run report:docker:stage && docker compose build allure-report && bash docker/extract-history.sh",
    "report:docker:up": "docker compose up -d allure-report",
    "report:docker:down": "docker compose down",
    "report:docker:logs": "docker compose logs -f allure-report"
  }
}
```

```
# .dockerignore — keep build context tiny
**
!docker/
!docker/staging/
```

```
# .gitignore additions
allure-results/
allure-results-bdd/
allure-report/
allure-report-bdd/
docker/staging/
docker/history/
```

## Step 7 — GitHub Actions

Two jobs: a test matrix that uploads per-shard `allure-results-*-shard-N` artifacts, and a `report-image` job that merges them, builds the image, and exports it as a tarball.

```yaml
# .github/workflows/playwright.yml — relevant pieces
jobs:
  test:
    strategy:
      matrix:
        shard: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    steps:
      # ... install, cache browsers, run tests ...
      - name: Upload allure-results
        if: ${{ !cancelled() }}
        uses: actions/upload-artifact@v4
        with:
          name: allure-results-app-shard-${{ matrix.shard }}
          path: allure-results/
          retention-days: 7
          if-no-files-found: ignore

  report-image:
    needs: test
    if: ${{ !cancelled() }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with: { path: artifacts/, pattern: allure-results-* }

      - name: Compute history cache date
        id: hist
        run: echo "date=$(date -u +%Y-%m-%d)" >> "$GITHUB_OUTPUT"

      - name: Restore Allure history (7-day rolling window)
        uses: actions/cache@v4
        with:
          path: docker/history
          key: allure-history-${{ steps.hist.outputs.date }}
          restore-keys: |
            allure-history-

      - name: Merge shards
        run: |
          set -euo pipefail
          mkdir -p allure-results allure-results-bdd
          shopt -s nullglob
          for dir in artifacts/allure-results-app-shard-*; do cp -R "$dir"/. allure-results/; done
          for dir in artifacts/allure-results-bdd-shard-*; do cp -R "$dir"/. allure-results-bdd/; done

      - run: bash docker/stage-results.sh
      - uses: docker/setup-buildx-action@v3
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: docker/allure-report.Dockerfile
          tags: retailflow/allure-report:local
          load: true
          push: false
      - run: docker save retailflow/allure-report:local -o /tmp/allure-report-image.tar
      - env: { ALLURE_REPORT_IMAGE: retailflow/allure-report:local }
        run: bash docker/extract-history.sh
      - uses: actions/upload-artifact@v4
        with:
          name: allure-report-image
          path: /tmp/allure-report-image.tar
          retention-days: 7
```

The date-keyed `actions/cache` with `restore-keys: allure-history-` is what carries trend data across pipeline runs. Combined with the `find -mtime +7` prune inside `stage-results.sh`, the trend stays within a 7-day rolling window even if the cache survives longer.

## Consuming the CI artifact locally

```bash
docker load -i allure-report-image.tar
docker run --rm -p 8081:80 retailflow/allure-report:local
# open http://localhost:8081
```

## Common pitfalls

- **`COPY docker/staging/` fails because the dir is missing.** Always run `bash docker/stage-results.sh` first — the script creates all subdirs even if a suite has no results.
- **`allure-playwright` install pulls a newer `@playwright/test`.** Run `npx playwright install chromium` once after upgrading.
- **Reports look "frozen" after deploy.** That's by design — this image is a static snapshot. Rebuild + redeploy per CI run.
- **History never grows past 1 entry.** Check `extract-history.sh` ran successfully. Without it, every build starts cold.
- **Categories panel is empty.** That's expected unless you ship a `categories.json`. The built-in Owners view (driven by `allure.owner()`) is usually the better axis — see the `squad-ownership` skill.

## Adding ownership labels

See the `squad-ownership` skill. It plugs into `tagSuite()` and the BDD `Before()` hook so every test carries the squad responsible for its feature.
