import { When, Then } from './fixtures';
import type { PaymentType } from '../pages/PaymentsPage';

When('I visit the payments page', async ({ paymentsPage }) => {
  await paymentsPage.goto();
});

When(
  'I pay {string} {float} via {string}',
  async ({ paymentsPage }, payee: string, amount: number, paymentType: string) => {
    await paymentsPage.payBill({ payee, amount, paymentType: paymentType as PaymentType });
  }
);

Then('the payment is successful', async ({ paymentsPage }) => {
  await paymentsPage.expectSuccess();
});

Then('the payment error matches {string}', async ({ paymentsPage }, pattern: string) => {
  await paymentsPage.expectError(new RegExp(pattern, 'i'));
});
