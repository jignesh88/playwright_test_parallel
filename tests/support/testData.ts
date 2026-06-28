import type { TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';

export const DEMO_USER = {
  username: 'demo',
  password: 'password123',
  fullName: 'Demo User',
} as const;

export const SEED_ACCOUNTS = {
  checking: 'Everyday Checking',
  savings: 'Rainy Day Savings',
} as const;

export type SeedAccountKind = 'checking' | 'savings';

export type SeedConfig = {
  /** Defaults to ['checking', 'savings']. */
  accounts?: SeedAccountKind[];
};

/**
 * Derive a stable-but-unique identity for a test. Hashing the full title path
 * means retries reuse the same username (cleaner Allure history) while parallel
 * tests across files never collide.
 */
export function seedFor(testInfo: TestInfo): {
  username: string;
  password: string;
  fullName: string;
} {
  const id = createHash('sha1')
    .update(testInfo.titlePath.join(' > '))
    .digest('hex')
    .slice(0, 10);
  return {
    username: `test-${id}`,
    password: `pw-${id}`,
    fullName: `Test User ${id}`,
  };
}
