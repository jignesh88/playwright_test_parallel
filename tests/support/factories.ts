import type { TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import type { LoanTerm } from '../pages/LoansPage';
import type { PaymentType } from '../pages/PaymentsPage';
import type { AccountKind } from '../pages/AccountsPage';

/**
 * Test data factories.
 *
 * Each factory returns an INPUT shape ready for a page object method
 * (LoansPage.apply, PaymentsPage.payBill, etc.). Defaults are happy-path
 * values; pass overrides as a Partial to customize edge-case specs.
 *
 * Uniqueness is derived from the test's titlePath via a small seeded RNG,
 * so retries reuse the same values (cleaner Allure history) while parallel
 * tests across files never collide on names.
 */

type Rng = () => number;

/**
 * Tiny seeded RNG (mulberry32). Deterministic, stateful — sequential calls
 * advance the seed, so two `makeLoan()` calls in the same test produce
 * distinct values, while the SAME callsite across retries reuses values.
 */
function rngFor(testInfo: TestInfo): Rng {
  const digest = createHash('sha1').update(testInfo.titlePath.join(' > ')).digest();
  let state =
    ((digest[0] << 24) | (digest[1] << 16) | (digest[2] << 8) | digest[3]) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(rng: Rng, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

// -------- Account names --------

const ACCOUNT_NICKNAMES = {
  checking: ['Everyday', 'Bills', 'Spending', 'Household'],
  savings: ['Vacation', 'Rainy Day', 'Holiday', 'Emergency'],
} as const;

export function makeAccountName(
  testInfo: TestInfo,
  kind: AccountKind = 'savings'
): string {
  const rng = rngFor(testInfo);
  const base = pickFrom(rng, ACCOUNT_NICKNAMES[kind]);
  // Short suffix from the same RNG so retries reuse the same name.
  const suffix = Math.floor(rng() * 100_000).toString(36);
  return `${base} ${suffix}`;
}

// -------- Loans --------

export type LoanInput = {
  amount: number;
  termMonths: LoanTerm;
  purpose: string;
};

const LOAN_PURPOSES = ['New bike', 'Car', 'House', 'Tuition', 'Renovation'];

export function makeLoan(
  testInfo: TestInfo,
  overrides: Partial<LoanInput> = {}
): LoanInput {
  const rng = rngFor(testInfo);
  return {
    amount: 2_000,
    termMonths: 24,
    purpose: pickFrom(rng, LOAN_PURPOSES),
    ...overrides,
  };
}

// -------- Payments --------

export type PaymentInput = {
  payee: string;
  amount: number;
  paymentType: PaymentType;
};

const PAYEES = ['City Power', 'Telco', 'Streaming Co', 'Water Authority'];

export function makePayment(
  testInfo: TestInfo,
  overrides: Partial<PaymentInput> = {}
): PaymentInput {
  const rng = rngFor(testInfo);
  return {
    payee: pickFrom(rng, PAYEES),
    amount: Number((10 + rng() * 90).toFixed(2)),
    paymentType: 'ach',
    ...overrides,
  };
}

// -------- Transfers --------

export function makeTransferAmount(testInfo: TestInfo, max = 200): number {
  const rng = rngFor(testInfo);
  return Number((10 + rng() * (max - 10)).toFixed(2));
}
