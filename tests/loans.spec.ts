import { test, expect } from './fixtures';
import { tagSuite } from './support/allure';
import { makeLoan } from './support/factories';

test.describe('Loans', () => {
  tagSuite({ epic: 'Banking', feature: 'Loans', severity: 'normal' });

  test('small loan is auto-approved', async ({ authedPage, loansPage }, testInfo) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply(makeLoan(testInfo, { amount: 2_000 }));
    await loansPage.expectSuccess('approved');
    expect(await loansPage.getLatestStatus()).toBe('approved');
  });

  test('medium loan goes to manual review', async ({ authedPage, loansPage }, testInfo) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply(makeLoan(testInfo, { amount: 25_000, termMonths: 60 }));
    await loansPage.expectSuccess('under_review');
  });

  test('very large loan is rejected', async ({ authedPage, loansPage }, testInfo) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply(makeLoan(testInfo, { amount: 200_000, termMonths: 60 }));
    await loansPage.expectSuccess('rejected');
  });

  test('rejects loans below minimum amount', async ({ authedPage, loansPage }, testInfo) => {
    void authedPage;
    await loansPage.goto();
    await loansPage.apply(makeLoan(testInfo, { amount: 100, termMonths: 12 }));
    await loansPage.expectError(/at least 500/i);
  });
});
