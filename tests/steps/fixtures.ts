import { test as base, createBdd } from 'playwright-bdd';
import { allure } from 'allure-playwright';
import {
  LoginPage,
  AccountPage,
  AccountsPage,
  TransferPage,
  SettingsPage,
  PaymentsPage,
  LoansPage,
} from '../pages';
import { DEMO_USER, seedFor } from '../support/testData';
import { squadForFeature } from '../support/squads';

type BddPageObjects = {
  loginPage: LoginPage;
  accountPage: AccountPage;
  accountsPage: AccountsPage;
  transferPage: TransferPage;
  settingsPage: SettingsPage;
  paymentsPage: PaymentsPage;
  loansPage: LoansPage;
  signInAsDemo: () => Promise<void>;
  signInAsFreshUser: () => Promise<void>;
};

export const test = base.extend<BddPageObjects>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  accountsPage: async ({ page }, use) => use(new AccountsPage(page)),
  transferPage: async ({ page }, use) => use(new TransferPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
  paymentsPage: async ({ page }, use) => use(new PaymentsPage(page)),
  loansPage: async ({ page }, use) => use(new LoansPage(page)),
  signInAsDemo: async ({ page, loginPage }, use) => {
    await use(async () => {
      await loginPage.goto();
      await loginPage.signIn(DEMO_USER.username, DEMO_USER.password);
      await page.waitForURL(/\/account$/);
    });
  },
  signInAsFreshUser: async ({ page, request }, use, testInfo) => {
    await use(async () => {
      const seed = seedFor(testInfo);
      const res = await request.post('/api/_test/users', { data: seed });
      if (!res.ok()) {
        throw new Error(`POST /api/_test/users failed: ${res.status()} ${await res.text()}`);
      }
      const user = (await res.json()) as { token: string; fullName: string };
      await page.addInitScript(
        ([token, fullName]) => {
          localStorage.setItem('token', token);
          localStorage.setItem('fullName', fullName);
        },
        [user.token, user.fullName]
      );
      await page.goto('/account');
    });
  },
});

export const { Given, When, Then, Before } = createBdd(test);

/**
 * Map Gherkin tags (@epic:X @feature:Y @severity:Z) onto Allure labels so the
 * BDD report tree groups identically to the POM report tree.
 */
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
