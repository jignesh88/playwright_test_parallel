import { test, expect } from './fixtures';
import { tagSuite } from './support/allure';

test.describe('Loans', () => {
  tagSuite({ epic: 'Banking', feature: 'Loans', severity: 'normal' });

  test('small loan is auto-approved', async ({ authedPage, loansPage }) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply({ amount: 2_000, termMonths: 24, purpose: 'New bike' });
    await loansPage.expectSuccess('approved');
    expect(await loansPage.getLatestStatus()).toBe('approved');
  });

  test('medium loan goes to manual review', async ({ authedPage, loansPage }) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply({ amount: 25_000, termMonths: 60, purpose: 'Car' });
    await loansPage.expectSuccess('under_review');
  });

  test('very large loan is rejected', async ({ authedPage, loansPage }) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply({ amount: 200_000, termMonths: 60, purpose: 'House' });
    await loansPage.expectSuccess('rejected');
  });

  test('rejects loans below minimum amount', async ({ authedPage, loansPage }) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply({ amount: 100, termMonths: 12, purpose: 'Too small' });
    await loansPage.expectError(/at least 500/i);
  });
});
