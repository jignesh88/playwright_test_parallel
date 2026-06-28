import { test } from './fixtures';
import { tagSuite } from './support/allure';

test.describe('Notification settings', () => {
  tagSuite({ epic: 'Banking', feature: 'Settings', severity: 'normal' });

  test('user can enable SMS and disable marketing, then changes persist', async ({
    freshPage,
    settingsPage,
  }) => {
    void freshPage;
    await settingsPage.goto();
    await settingsPage.setChannel('sms', true);
    await settingsPage.setChannel('marketing', false);
    await settingsPage.save();
    await settingsPage.expectSaved();

    await settingsPage.goto();
    await settingsPage.expectChannel('sms', true);
    await settingsPage.expectChannel('marketing', false);
  });
});
