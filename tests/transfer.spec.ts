import { test } from './fixtures';
import { SEED_ACCOUNTS } from './support/testData';
import { tagSuite } from './support/allure';

test.describe('Transfers', () => {
  tagSuite({ epic: 'Banking', feature: 'Transfers', severity: 'critical' });

  test('transfers funds between two accounts', async ({ authedPage, transferPage }) => {
    void authedPage;
    await transferPage.goto();
    await transferPage.transfer({
      fromName: SEED_ACCOUNTS.savings,
      toName: SEED_ACCOUNTS.checking,
      amount: 100,
      memo: 'Top-up',
    });
    await transferPage.expectSuccess(/transferred \$100\.00/i);
  });

  test('rejects transfer to the same account', async ({ authedPage, transferPage }) => {
    void authedPage;
    await transferPage.goto();
    await transferPage.transfer({
      fromName: SEED_ACCOUNTS.checking,
      toName: SEED_ACCOUNTS.checking,
      amount: 50,
    });
    await transferPage.expectError(/must differ/i);
  });

  test('rejects transfer exceeding balance', async ({ authedPage, transferPage }) => {
    void authedPage;
    await transferPage.goto();
    await transferPage.transfer({
      fromName: SEED_ACCOUNTS.checking,
      toName: SEED_ACCOUNTS.savings,
      amount: 9_999_999,
    });
    await transferPage.expectError(/insufficient funds/i);
  });
});
