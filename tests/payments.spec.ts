import { test } from './fixtures';
import { tagSuite } from './support/allure';

test.describe('Payments', () => {
  tagSuite({ epic: 'Banking', feature: 'Payments', severity: 'critical' });

  test('user pays a bill via ACH', async ({ authedPage, paymentsPage }) => {
    void authedPage;
    await paymentsPage.goto();
    await paymentsPage.payBill({ payee: 'City Power', amount: 42.5, paymentType: 'ach' });
    await paymentsPage.expectSuccess();
  });

  test('user can pay via card', async ({ authedPage, paymentsPage }) => {
    void authedPage;
    await paymentsPage.goto();
    await paymentsPage.payBill({ payee: 'Telco', amount: 19.99, paymentType: 'card' });
    await paymentsPage.expectSuccess();
  });

  test('rejects payments larger than the account balance', async ({
    authedPage,
    paymentsPage,
  }) => {
    void authedPage;
    await paymentsPage.goto();
    await paymentsPage.payBill({ payee: 'Mega Corp', amount: 9_999_999, paymentType: 'wire' });
    await paymentsPage.expectError(/insufficient funds/i);
  });
});
