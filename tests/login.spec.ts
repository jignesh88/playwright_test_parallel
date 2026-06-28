import { test, expect } from './fixtures';
import { DEMO_USER } from './support/testData';
import { tagSuite } from './support/allure';
import { markSmoke } from './support/smoke';

markSmoke();

test.describe('Login', () => {
  tagSuite({ epic: 'Banking', feature: 'Authentication', severity: 'blocker' });

  test('rejects bad credentials', async ({ loginPage }) => {
    await loginPage.goto();
    await loginPage.signIn(DEMO_USER.username, 'wrong-password');
    await loginPage.expectError(/invalid/i);
  });

  test('logs in with valid credentials and lands on account page', async ({
    loginPage,
    accountPage,
    page,
  }) => {
    await loginPage.goto();
    await loginPage.signIn(DEMO_USER.username, DEMO_USER.password);
    await expect(page).toHaveURL(/\/account$/);
    await accountPage.expectLoaded(DEMO_USER.fullName);
  });
});
