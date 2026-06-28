import { test as base, Page, APIRequestContext } from '@playwright/test';
import {
  LoginPage,
  AccountPage,
  AccountsPage,
  TransferPage,
  SettingsPage,
  PaymentsPage,
  LoansPage,
} from './pages';
import { DEMO_USER, SeedConfig, seedFor } from './support/testData';

export type FreshUser = {
  username: string;
  password: string;
  fullName: string;
  token: string;
  accounts: { id: string; kind: 'checking' | 'savings'; name: string; balance: number }[];
};

async function mintFreshUser(
  request: APIRequestContext,
  body: { username: string; password: string; fullName: string } & SeedConfig
): Promise<FreshUser> {
  const res = await request.post('/api/_test/users', {
    data: { ...body, seedAccounts: body.accounts },
  });
  if (!res.ok()) {
    throw new Error(`POST /api/_test/users failed: ${res.status()} ${await res.text()}`);
  }
  return (await res.json()) as FreshUser;
}

type PageObjects = {
  loginPage: LoginPage;
  accountPage: AccountPage;
  accountsPage: AccountsPage;
  transferPage: TransferPage;
  settingsPage: SettingsPage;
  paymentsPage: PaymentsPage;
  loansPage: LoansPage;
  /**
   * A page authenticated as the shared demo user. Kept for back-compat;
   * prefer `freshPage` for new tests so they get per-test backend isolation.
   */
  authedPage: Page;
  /** Per-test ephemeral user minted via POST /api/_test/users. */
  freshUser: FreshUser;
  /** A page already authenticated as `freshUser` (token primed in localStorage). */
  freshPage: Page;
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
  freshUser: async ({ request }, use, testInfo) => {
    const seed = seedFor(testInfo);
    const user = await mintFreshUser(request, { ...seed });
    await use(user);
  },
  freshPage: async ({ page, freshUser }, use) => {
    await page.addInitScript(
      ([token, fullName]) => {
        localStorage.setItem('token', token);
        localStorage.setItem('fullName', fullName);
      },
      [freshUser.token, freshUser.fullName]
    );
    await page.goto('/account');
    await use(page);
  },
});

export { expect } from '@playwright/test';
