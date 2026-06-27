import { test as base, Page } from '@playwright/test';
import {
  LoginPage,
  AccountPage,
  AccountsPage,
  TransferPage,
  SettingsPage,
  PaymentsPage,
  LoansPage,
} from './pages';
import { DEMO_USER } from './support/testData';

type PageObjects = {
  loginPage: LoginPage;
  accountPage: AccountPage;
  accountsPage: AccountsPage;
  transferPage: TransferPage;
  settingsPage: SettingsPage;
  paymentsPage: PaymentsPage;
  loansPage: LoansPage;
  /** A page that has already been authenticated as the demo user. */
  authedPage: Page;
};

export const test = base.extend<PageObjects>({
  loginPage: async ({ page }, use) => use(new LoginPage(page)),
  accountPage: async ({ page }, use) => use(new AccountPage(page)),
  accountsPage: async ({ page }, use) => use(new AccountsPage(page)),
  transferPage: async ({ page }, use) => use(new TransferPage(page)),
  settingsPage: async ({ page }, use) => use(new SettingsPage(page)),
  paymentsPage: async ({ page }, use) => use(new PaymentsPage(page)),
  loansPage: async ({ page }, use) => use(new LoansPage(page)),
  authedPage: async ({ page }, use) => {
    const login = new LoginPage(page);
    await login.goto();
    await login.signIn(DEMO_USER.username, DEMO_USER.password);
    await page.waitForURL(/\/account$/);
    await use(page);
  },
});

export { expect } from '@playwright/test';
