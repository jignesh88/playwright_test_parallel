import { Page, expect } from '@playwright/test';

export class AccountPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/account');
  }

  async expectLoaded(fullName: string) {
    await expect(this.page.getByTestId('account-name')).toHaveText(fullName);
    await expect(this.page.getByTestId('account-balance')).toBeVisible();
  }

  async getTotalBalance(): Promise<number> {
    const text = await this.page.getByTestId('account-balance').textContent();
    return Number((text ?? '').replace(/[^0-9.\-]/g, ''));
  }
}
