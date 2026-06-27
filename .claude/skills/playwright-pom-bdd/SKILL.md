---
name: playwright-pom-bdd
description: Bootstrap a Playwright test framework with the Page Object Model + fixtures pattern and a playwright-bdd layer that reuses the same page objects. Use when adding Playwright to a new repo, or when refactoring a flat spec layout into something scalable.
---

# Playwright POM + BDD framework

This skill encodes the conventions used in the `playwright_test_parallel` repo. Apply it whenever you bootstrap, refactor, or extend a Playwright suite.

## Non-negotiable design rules

1. **Selectors live ONLY in page objects.** Specs and BDD steps must never reference `data-testid`, `getByRole`, `locator(...)`, etc. directly. If you find yourself reaching into the DOM from a spec, add a method to the page object.
2. **One page object per screen.** Single Responsibility — `LoginPage`, `AccountsPage`, etc. No base class until two real subclasses need to share behavior.
3. **Fixtures inject page objects.** Specs never construct `new LoginPage(page)` — they receive `loginPage` from `tests/fixtures.ts`.
4. **Auth is centralized.** Provide an `authedPage` fixture that signs in a known seed user once per test. Tests that need an authenticated session take `authedPage`, not the login flow.
5. **Shared test data lives in `tests/support/testData.ts`.** Demo credentials, seed account names, magic strings — one file, exported as `const`.
6. **YAGNI.** No generic `BasePage`, no `WaitHelper`, no `ApiClient` wrapper until two callers actually need it. Three similar lines beats a premature abstraction.

## Directory layout

```
tests/
  pages/              one file per screen, e.g. LoginPage.ts, AccountsPage.ts
    index.ts          barrel export
  fixtures.ts         Playwright test.extend() with page-object fixtures + authedPage
  support/
    testData.ts       seed users, account names, etc.
    allure.ts         optional: tagSuite() helper (see allure-docker-reports skill)
  steps/              BDD step definitions (only if BDD layer is used)
    fixtures.ts       BDD test.extend() that reuses the SAME page objects + createBdd()
    *.steps.ts        one file per domain
  *.spec.ts           plain Playwright specs, one per feature
features/             Gherkin .feature files (only if BDD layer is used)
playwright.config.ts        plain suite
playwright.bdd.config.ts    BDD suite (separate config, separate result dir)
```

## Page object template

```ts
// tests/pages/LoginPage.ts
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async signIn(username: string, password: string) {
    await this.page.getByTestId('username').fill(username);
    await this.page.getByTestId('password').fill(password);
    await this.page.getByTestId('login-submit').click();
  }

  async expectError(pattern: RegExp) {
    await expect(this.page.getByTestId('login-error')).toContainText(pattern);
  }
}
```

Keep methods focused: one action or one assertion per method. Compose them in specs.

## Fixtures template

```ts
// tests/fixtures.ts
import { test as base, Page } from '@playwright/test';
import { LoginPage, AccountPage /*, ... */ } from './pages';
import { DEMO_USER } from './support/testData';

type PageObjects = {
  loginPage: LoginPage;
  accountPage: AccountPage;
  // ...
  authedPage: Page;
};

export const test = base.extend<PageObjects>({
  loginPage:   async ({ page }, use) => use(new LoginPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  // ...
  authedPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(DEMO_USER.username, DEMO_USER.password);
    await page.waitForURL(/\/account$/);
    await use(page);
  },
});

export { expect } from '@playwright/test';
```

## Spec template

```ts
// tests/loans.spec.ts
import { test, expect } from './fixtures';

test.describe('Loans', () => {
  test('small loan is auto-approved', async ({ authedPage, loansPage }) => {
    void authedPage;                     // ensures sign-in fixture runs
    await loansPage.goto();
    await loansPage.apply({ amount: 2_000, termMonths: 24, purpose: 'New bike' });
    await loansPage.expectSuccess('approved');
  });
});
```

Rules:
- Pull `authedPage` (or whatever auth fixture) **and** the page objects you need.
- `void authedPage;` makes the linter happy when you only need the side effect of authing.
- Tests assert intent ("loan is approved"), not mechanics ("text contains X").

## BDD layer (optional but recommended once you have ≥3 features)

Install: `npm i -D playwright-bdd`.

```ts
// tests/steps/fixtures.ts
import { test as base, createBdd } from 'playwright-bdd';
import { LoginPage, /* ... */ } from '../pages';
import { DEMO_USER } from '../support/testData';

export const test = base.extend<{
  loginPage: LoginPage;
  // ... same page-object fixtures as plain fixtures.ts
  signInAsDemo: () => Promise<void>;
}>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  // ...
  signInAsDemo: async ({ page, loginPage }, use) => {
    await use(async () => {
      await loginPage.goto();
      await loginPage.signIn(DEMO_USER.username, DEMO_USER.password);
      await page.waitForURL(/\/account$/);
    });
  },
});

export const { Given, When, Then, Before } = createBdd(test);
```

```ts
// tests/steps/login.steps.ts
import { Given, When, Then } from './fixtures';

Given('I am signed in as the demo user', async ({ signInAsDemo }) => {
  await signInAsDemo();
});

When('I sign in as {string} with password {string}', async ({ loginPage }, u, p) => {
  await loginPage.signIn(u, p);
});

Then('I see a login error matching {string}', async ({ loginPage }, pattern: string) => {
  await loginPage.expectError(new RegExp(pattern, 'i'));
});
```

```gherkin
# features/login.feature
Feature: Login
  Scenario: Reject invalid credentials
    Given I am on the login page
    When I sign in as "demo" with password "wrong-password"
    Then I see a login error matching "invalid"
```

**Critical**: BDD steps reuse the *same* page objects. No duplicated selectors across POM and BDD.

## Two Playwright configs

```ts
// playwright.config.ts (plain suite)
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testIgnore: ['**/.features-gen/**', '**/steps/**', '**/pages/**', '**/support/**'],
  fullyParallel: true,
  workers: process.env.CI ? 10 : 10,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:5273',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [{ name: 'app', use: { ...devices['Desktop Chrome'] } }],
});
```

```ts
// playwright.bdd.config.ts
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
  workers: 4,
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report-bdd' }]],
  use: {
    baseURL: 'http://localhost:5273',
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [{ ...bddProject, use: { ...devices['Desktop Chrome'] } }],
});
```

Keep them separate — the BDD generator wants its own `testDir` and the configs diverge over time anyway.

## npm scripts

```json
{
  "scripts": {
    "test": "playwright test",
    "test:headed": "playwright test --headed",
    "test:report": "playwright show-report",
    "test:bdd": "bddgen --config=playwright.bdd.config.ts test && playwright test --config=playwright.bdd.config.ts",
    "test:bdd:report": "playwright show-report playwright-report-bdd"
  }
}
```

Add `pretest` / `pretest:bdd` hooks if you adopt Allure (`rimraf allure-results`).

## Parallelism + test isolation gotchas

- Default to `fullyParallel: true` with high worker count. **Only** mark a `describe` as `mode: 'serial'` when it mutates global state shared with other tests (e.g. notification settings on a single shared user).
- If multiple specs hit a shared in-memory backend, expect flakiness in any test that asserts on a balance/counter. Either use unique resources per test (e.g. fresh account name with a timestamp) or serialize.
- Wait for async UI population before reading dropdowns:
  ```ts
  await expect(page.getByTestId('transfer-from').locator('option').first()).toBeAttached();
  ```

## .gitignore additions

```
playwright-report/
playwright-report-bdd/
test-results/
tests/.features-gen/
.last-run.json
```

## When to use which fixture

- Plain Playwright spec authoring → import from `./fixtures`.
- BDD step definition authoring → import from `./steps/fixtures`.
- Never cross-import (a step file should not pull `tests/fixtures.ts`).

## Adding a new feature — checklist

1. New page object in `tests/pages/<Name>Page.ts`, exported from `tests/pages/index.ts`.
2. New fixture entry in `tests/fixtures.ts` (and `tests/steps/fixtures.ts` if BDD).
3. New `tests/<name>.spec.ts` driving it via fixtures.
4. (Optional) `features/<name>.feature` + `tests/steps/<name>.steps.ts` reusing the page object.
5. (Optional) Add ownership — see the `squad-ownership` skill.

That's it — five steps, no framework edits.
