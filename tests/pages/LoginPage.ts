import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async signIn(username: string, password: string) {
    await this.page.getByTestId('username').fill(username);
    await this.page.getByTestId('password').fill(password);
    await this.page.getByTestId('login-submit').click();
  }

  async expectError(pattern: RegExp) {
    await expect(this.page.getByTestId('login-error')).toContainText(pattern);
  }
}
