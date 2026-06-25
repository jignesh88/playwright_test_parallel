import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('rejects bad credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('username').fill('demo');
    await page.getByTestId('password').fill('wrong-password');
    await page.getByTestId('login-submit').click();
    await expect(page.getByTestId('login-error')).toContainText(/invalid/i);
  });

  test('logs in with valid credentials and lands on account page', async ({ page }) => {
    await page.goto('/login');
    await page.getByTestId('username').fill('demo');
    await page.getByTestId('password').fill('password123');
    await page.getByTestId('login-submit').click();
    await expect(page).toHaveURL(/\/account$/);
    await expect(page.getByTestId('account-name')).toHaveText('Demo User');
    await expect(page.getByTestId('account-balance')).toBeVisible();
  });
});
