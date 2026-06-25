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
- `tests/google-search.spec.ts` — external search validation via Wikipedia (10 parallel runs)

## Notes

- In-memory storage in the backend: balances reset on backend restart.
