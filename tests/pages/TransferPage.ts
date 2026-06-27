import { Page, expect } from '@playwright/test';

async function selectByPrefix(page: Page, testId: string, prefix: string) {
  const select = page.getByTestId(testId);
  // The select is populated asynchronously after the accounts API resolves;
  // wait for at least one option before reading labels.
  await expect(select.locator('option').first()).toBeAttached();
  const labels = await select.locator('option').allTextContents();
  const match = labels.find((l) => l.startsWith(prefix));
  if (!match) throw new Error(`No option starting with "${prefix}" in ${testId}. Got: ${labels.join(' | ')}`);
  await select.selectOption({ label: match });
}

export class TransferPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto('/transfer');
  }

  async transfer(opts: { fromName: string; toName: string; amount: number; memo?: string }) {
    await selectByPrefix(this.page, 'transfer-from', opts.fromName);
    await selectByPrefix(this.page, 'transfer-to', opts.toName);
    await this.page.getByTestId('transfer-amount').fill(String(opts.amount));
    if (opts.memo) await this.page.getByTestId('transfer-memo').fill(opts.memo);
    await this.page.getByTestId('transfer-submit').click();
  }

  async expectSuccess(pattern: RegExp) {
    await expect(this.page.getByTestId('transfer-success')).toContainText(pattern);
  }

  async expectError(pattern: RegExp) {
    await expect(this.page.getByTestId('transfer-error')).toContainText(pattern);
  }
}
