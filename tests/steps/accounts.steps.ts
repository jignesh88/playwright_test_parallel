import { When, Then } from './fixtures';
import type { AccountKind } from '../pages/AccountsPage';

When('I visit the accounts page', async ({ accountsPage }) => {
  await accountsPage.goto();
});

When('I open a {string} account named {string}', async ({ accountsPage }, kind: string, name: string) => {
  await accountsPage.openAccount(kind as AccountKind, name);
});

Then('the new-account success message contains {string}', async ({ accountsPage }, name: string) => {
  await accountsPage.expectSuccess(name);
});

Then('the accounts table contains {string}', async ({ accountsPage }, name: string) => {
  await accountsPage.expectAccountListed(name);
});

Then('the new-account error matches {string}', async ({ accountsPage }, pattern: string) => {
  await accountsPage.expectError(new RegExp(pattern, 'i'));
});
