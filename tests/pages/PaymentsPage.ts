import { Page, expect } from '@playwright/test';

export type PaymentType = 'ach' | 'card' | 'wire';

export class PaymentsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/payments');
  }

  async payBill(opts: { payee: string; amount: number; paymentType: PaymentType }) {
    await this.page.getByTestId('payment-payee').fill(opts.payee);
    await this.page.getByTestId('payment-amount').fill(String(opts.amount));
    await this.page.getByTestId('payment-type').selectOption(opts.paymentType);
    await this.page.getByTestId('payment-submit').click();
  }

  async expectSuccess(pattern: RegExp = /payment sent/i) {
    await expect(this.page.getByTestId('payment-success')).toContainText(pattern);
  }

  async expectError(pattern: RegExp) {
    await expect(this.page.getByTestId('payment-error')).toContainText(pattern);
  }
}
