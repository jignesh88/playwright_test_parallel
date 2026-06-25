import { test, expect } from '@playwright/test';

test.describe.configure({ mode: 'parallel' });

test.describe('External search validation', () => {
  test.use({
    baseURL: undefined,
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'en-US',
  });

  for (let i = 1; i <= 10; i++) {
    test(`Wikipedia confirms Playwright is an automation framework [run ${i}]`, async ({ page }) => {
      await page.goto('https://en.wikipedia.org/wiki/Playwright_(software)', {
        waitUntil: 'domcontentloaded',
      });
      await expect(page.locator('#firstHeading')).toContainText(/playwright/i);
      const intro = await page.locator('#mw-content-text p').first().innerText();
      expect(intro.toLowerCase()).toMatch(/test|automation|browser/);
    });
  }
});
