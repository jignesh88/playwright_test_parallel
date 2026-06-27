import { Page, expect } from '@playwright/test';

export type AccountKind = 'checking' | 'savings';

export class AccountsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/accounts');
  }

  async openAccount(kind: AccountKind, name: string) {
    await this.page.getByTestId('new-account-kind').selectOption(kind);
    await this.page.getByTestId('new-account-name').fill(name);
    await this.page.getByTestId('new-account-submit').click();
  }

  async expectSuccess(name: string) {
    await expect(this.page.getByTestId('new-account-success')).toContainText(name);
  }

  async expectError(pattern: RegExp) {
    await expect(this.page.getByTestId('new-account-error')).toContainText(pattern);
  }

  async expectAccountListed(name: string) {
    await expect(this.page.getByTestId('accounts-table')).toContainText(name);
  }

  async countAccounts(): Promise<number> {
    return this.page.locator('[data-testid^="account-row-"]').count();
  }
}
