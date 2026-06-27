import { Page, expect } from '@playwright/test';

export type LoanTerm = 12 | 24 | 36 | 48 | 60;
export type LoanStatus = 'submitted' | 'under_review' | 'approved' | 'rejected';

export class LoansPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/loans');
  }

  async apply(opts: { amount: number; termMonths: LoanTerm; purpose: string }) {
    await this.page.getByTestId('loan-amount').fill(String(opts.amount));
    await this.page.getByTestId('loan-term').selectOption(String(opts.termMonths));
    await this.page.getByTestId('loan-purpose').fill(opts.purpose);
    await this.page.getByTestId('loan-submit').click();
  }

  async expectSuccess(status?: LoanStatus) {
    const success = this.page.getByTestId('loan-success');
    await expect(success).toBeVisible();
    if (status) await expect(success).toContainText(status);
  }

  async expectError(pattern: RegExp) {
    await expect(this.page.getByTestId('loan-error')).toContainText(pattern);
  }

  async getLatestStatus(): Promise<LoanStatus> {
    const firstStatusCell = this.page.locator('[data-testid^="loan-status-"]').first();
    const text = (await firstStatusCell.textContent())?.trim();
    return text as LoanStatus;
  }

  async expectStatusFor(loanId: string, status: LoanStatus) {
    await expect(this.page.getByTestId(`loan-status-${loanId}`)).toHaveText(status);
  }
}
