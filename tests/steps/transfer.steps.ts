import { When, Then } from './fixtures';

When('I visit the transfer page', async ({ transferPage }) => {
  await transferPage.goto();
});

When(
  'I transfer {float} from {string} to {string} with memo {string}',
  async ({ transferPage }, amount: number, fromName: string, toName: string, memo: string) => {
    await transferPage.transfer({ fromName, toName, amount, memo });
  }
);

When(
  'I transfer {float} from {string} to {string}',
  async ({ transferPage }, amount: number, fromName: string, toName: string) => {
    await transferPage.transfer({ fromName, toName, amount });
  }
);

Then('the transfer success message matches {string}', async ({ transferPage }, pattern: string) => {
  await transferPage.expectSuccess(new RegExp(pattern, 'i'));
});

Then('the transfer error matches {string}', async ({ transferPage }, pattern: string) => {
  await transferPage.expectError(new RegExp(pattern, 'i'));
});
