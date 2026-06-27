import { test } from './fixtures';
import { tagSuite } from './support/allure';

test.describe('Accounts', () => {
  tagSuite({ epic: 'Banking', feature: 'Accounts', severity: 'critical' });

  test('user can open a new savings account', async ({ authedPage, accountsPage }) => {
    void authedPage;
    await accountsPage.goto();
    const name = `Vacation ${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    await accountsPage.openAccount('savings', name);
    await accountsPage.expectSuccess(name);
    await accountsPage.expectAccountListed(name);
  });

  test('rejects an account with empty name', async ({ authedPage, accountsPage }) => {
    void authedPage;
    await accountsPage.goto();
    // HTML required attribute blocks submission; submit via empty whitespace.
    await accountsPage.openAccount('checking', '   ');
    await accountsPage.expectError(/name is required/i);
  });
});
