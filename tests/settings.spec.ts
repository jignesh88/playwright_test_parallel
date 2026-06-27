import { test } from './fixtures';
import { tagSuite } from './support/allure';

// Settings live as a single object per user in the in-memory backend;
// parallel writes from other tests would clobber the assertions below.
test.describe.configure({ mode: 'serial' });

test.describe('Notification settings', () => {
  tagSuite({ epic: 'Banking', feature: 'Settings', severity: 'normal' });

  test('user can enable SMS and disable marketing, then changes persist', async ({
    authedPage,
    settingsPage,
  }) => {
    void authedPage;
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
