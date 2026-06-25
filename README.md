# RetailFlow Bank — Sample App + Playwright Suite

Minimal banking demo: Node.js/TypeScript (Express) API, React (Vite) frontend, Playwright tests including an external Google search validation.

## Layout

```
backend/    Express + JWT API (port 4100)
frontend/   React + Vite SPA (port 5273)
tests/      Playwright tests
```

## Install

```bash
npm run install:all
npx playwright install chromium
```

## Run locally

```bash
npm run dev:backend   # in one terminal
npm run dev:frontend  # in another
```


Open http://localhost:5273 and log in with `demo` / `password123`.

## Run Playwright tests

The Playwright config auto-starts both servers if not already running.

```bash
npm test                # headless
npm run test:headed     # see the browser
npm run test:report     # open the HTML report
```

## Test suites

- `tests/login.spec.ts` — valid + invalid login flow
- `tests/account.spec.ts` — account page renders balance
- `tests/transactions.spec.ts` — credit, debit, insufficient-funds error
- `tests/google-search.spec.ts` — searches Google for "playwright end to end testing", validates a `playwright.dev` link appears (skips on Google CAPTCHA), with DuckDuckGo fallback

## Notes

- In-memory storage in the backend: balances reset on backend restart.
- Google may throw a consent dialog or unusual-traffic page; the test handles consent and skips on CAPTCHA. The DuckDuckGo fallback verifies the same intent more reliably.
