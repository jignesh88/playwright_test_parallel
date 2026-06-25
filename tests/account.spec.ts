import { test, expect } from '@playwright/test';
import { loginAs } from './helpers';

test.describe('Account page', () => {
  test('shows current balance for logged-in user', async ({ page }) => {
    await loginAs(page);
    await page.getByTestId('nav-account').click();
    await expect(page.getByTestId('account-username')).toHaveText('demo');
    const balanceText = await page.getByTestId('account-balance').textContent();
    expect(balanceText).toMatch(/^\$\d+\.\d{2}$/);
  });
});
