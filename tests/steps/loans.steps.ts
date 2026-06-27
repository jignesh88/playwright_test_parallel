import { When, Then } from './fixtures';
import type { LoanTerm, LoanStatus } from '../pages/LoansPage';

When('I visit the loans page', async ({ loansPage }) => {
  await loansPage.goto();
});

When(
  'I apply for a loan of {float} over {int} months for {string}',
  async ({ loansPage }, amount: number, termMonths: number, purpose: string) => {
    await loansPage.apply({ amount, termMonths: termMonths as LoanTerm, purpose });
  }
);

Then('the loan application is {string}', async ({ loansPage }, status: string) => {
  await loansPage.expectSuccess(status as LoanStatus);
});

Then('the loan error matches {string}', async ({ loansPage }, pattern: string) => {
  await loansPage.expectError(new RegExp(pattern, 'i'));
});
