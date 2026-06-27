import { When, Then } from './fixtures';
import type { NotificationChannel } from '../pages/SettingsPage';

When('I visit the settings page', async ({ settingsPage }) => {
  await settingsPage.goto();
});

When('I enable the {string} channel', async ({ settingsPage }, channel: string) => {
  await settingsPage.setChannel(channel as NotificationChannel, true);
});

When('I disable the {string} channel', async ({ settingsPage }, channel: string) => {
  await settingsPage.setChannel(channel as NotificationChannel, false);
});

When('I save settings', async ({ settingsPage }) => {
  await settingsPage.save();
});

Then('settings are saved', async ({ settingsPage }) => {
  await settingsPage.expectSaved();
});

Then('the {string} channel is enabled', async ({ settingsPage }, channel: string) => {
  await settingsPage.expectChannel(channel as NotificationChannel, true);
});

Then('the {string} channel is disabled', async ({ settingsPage }, channel: string) => {
  await settingsPage.expectChannel(channel as NotificationChannel, false);
});
