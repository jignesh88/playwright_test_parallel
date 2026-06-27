import { expect } from '@playwright/test';
import { Given, When, Then } from './fixtures';

Given('I am on the login page', async ({ loginPage }) => {
  await loginPage.goto();
});

Given('I am signed in as the demo user', async ({ signInAsDemo }) => {
  await signInAsDemo();
});

When('I sign in as {string} with password {string}', async ({ loginPage }, username: string, password: string) => {
  await loginPage.signIn(username, password);
});

Then('I see a login error matching {string}', async ({ loginPage }, pattern: string) => {
  await loginPage.expectError(new RegExp(pattern, 'i'));
});

Then('I land on the account page for {string}', async ({ page, accountPage }, fullName: string) => {
  await expect(page).toHaveURL(/\/account$/);
  await accountPage.expectLoaded(fullName);
});
