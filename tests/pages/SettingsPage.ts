import { Page, expect } from '@playwright/test';

export type NotificationChannel = 'email' | 'sms' | 'marketing';

const TEST_IDS: Record<NotificationChannel, string> = {
  email: 'settings-email',
  sms: 'settings-sms',
  marketing: 'settings-marketing',
};

export class SettingsPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/settings');
  }

  async setChannel(channel: NotificationChannel, enabled: boolean) {
    const checkbox = this.page.getByTestId(TEST_IDS[channel]);
    if (enabled) await checkbox.check();
    else await checkbox.uncheck();
  }

  async save() {
    await this.page.getByTestId('settings-submit').click();
  }

  async expectSaved() {
    await expect(this.page.getByTestId('settings-success')).toBeVisible();
  }

  async expectChannel(channel: NotificationChannel, enabled: boolean) {
    const checkbox = this.page.getByTestId(TEST_IDS[channel]);
    if (enabled) await expect(checkbox).toBeChecked();
    else await expect(checkbox).not.toBeChecked();
  }
}
