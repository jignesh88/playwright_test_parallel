import { test, expect } from '@playwright/test';
import { loginAs, readBalance } from './helpers';

test.describe('Transactions', () => {
  test('credit increases balance', async ({ page }) => {
    await loginAs(page);
    const before = await readBalance(page);

    await page.getByTestId('nav-transactions').click();
    await page.getByTestId('tx-type').selectOption('credit');
    await page.getByTestId('tx-amount').fill('250.50');
    await page.getByTestId('tx-description').fill('Salary');
    await page.getByTestId('tx-submit').click();

    await expect(page.getByTestId('tx-success')).toContainText('New balance');

    await page.getByTestId('nav-account').click();
    const after = await readBalance(page);
    expect(after - before).toBeCloseTo(250.5, 2);
  });

  test('debit decreases balance and shows up in history', async ({ page }) => {
    await loginAs(page);
    const before = await readBalance(page);

    await page.getByTestId('nav-transactions').click();
    await page.getByTestId('tx-type').selectOption('debit');
    await page.getByTestId('tx-amount').fill('40');
    await page.getByTestId('tx-description').fill('Groceries');
    await page.getByTestId('tx-submit').click();
    await expect(page.getByTestId('tx-success')).toBeVisible();

    const rows = page.getByTestId('tx-table').locator('tbody tr');
    await expect(rows.first()).toContainText('Groceries');
    await expect(rows.first()).toContainText('-$40.00');

    await page.getByTestId('nav-account').click();
    const after = await readBalance(page);
    expect(before - after).toBeCloseTo(40, 2);
  });

  test('debit exceeding balance shows error', async ({ page }) => {
    await loginAs(page);
    await page.getByTestId('nav-transactions').click();
    await page.getByTestId('tx-type').selectOption('debit');
    await page.getByTestId('tx-amount').fill('999999999');
    await page.getByTestId('tx-description').fill('Overdraw');
    await page.getByTestId('tx-submit').click();
    await expect(page.getByTestId('tx-error')).toContainText(/insufficient/i);
  });
});
