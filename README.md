# Health Advocate Playwright Tests

An automated end-to-end test suite for [healthadvocate.com](https://www.healthadvocate.com),
built with [Playwright](https://playwright.dev) and TypeScript.

**Context:** this is a personal project built as part of an interview process with Health Advocate,
demonstrating a real test-automation approach against their live public site - not an internal or
company-sanctioned test suite. See [DECISIONS.md](DECISIONS.md) for why the project is scoped the
way it is (passive-only API discovery, production-only target, no login automation yet).

## What's here

- `docs/discovery/` - notes from manually exploring the site before writing any test: what makes it
  easy/hard to automate ([testability-notes.md](docs/discovery/testability-notes.md)), the page/nav
  structure being tested against ([site-map.md](docs/discovery/site-map.md)), and what's publicly
  reachable at the API level ([api-notes.md](docs/discovery/api-notes.md)).
- `tests/navigation/` - the first suite: does every header link and mega-menu item go where it's
  supposed to, and does the resulting page load.
- `tests/support/` - shared locator helpers and the hand-maintained site map the nav suites are
  generated from.
- `.github/workflows/playwright.yml` - CI: runs the suite on every push/PR, publishes a JUnit XML
  report and an HTML report (with a video of every test, pass or fail) as downloadable workflow
  artifacts.
- `DECISIONS.md` / `PROJECT-LOG.md` - a running log of real decisions and what shipped, in the same
  format used on [the WrestlingProject repo](https://github.com/jkzarnosky) this pattern is borrowed
  from - written for a reader who wasn't in the room, since that's the point of an interview
  portfolio piece.

## Getting started

```bash
npm install
npx playwright install --with-deps chromium
npm test
```

Other scripts:

```bash
npm run test:headed   # run with a visible browser window
npm run test:ui       # Playwright's interactive UI mode
npm run report        # open the last local HTML report
npm run typecheck     # tsc --noEmit
```

Test results (JUnit XML, HTML report, videos, traces) are written to `test-results/` and
`playwright-report/` - both gitignored, both produced fresh on every run.

## Scope right now

1. **Header navigation** (`tests/navigation/`) - shipped. Every top-level header link and every
   mega-menu dropdown item, verified against the real site.
2. Homepage in-page links/navigation - planned next.
3. API tests (read-only, against the public WordPress REST API - see api-notes.md) and,
   contingent on separate research into whether it's safe/possible, login - planned after that.
4. Accessibility and security testing - noted as follow-up considerations, not yet started.

No test in this repo submits a form, logs in, or sends any state-changing request - see
testability-notes.md ("No staging environment") for why.
