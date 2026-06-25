import { expect, Page } from '@playwright/test';

export async function loginAs(page: Page, username = 'demo', password = 'password123') {
  await page.goto('/login');
  await page.getByTestId('username').fill(username);
  await page.getByTestId('password').fill(password);
  await page.getByTestId('login-submit').click();
  await expect(page).toHaveURL(/\/account$/);
}

export async function readBalance(page: Page): Promise<number> {
  const text = (await page.getByTestId('account-balance').textContent()) ?? '';
  return Number(text.replace(/[^0-9.\-]/g, ''));
}
