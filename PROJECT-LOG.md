# Project Log — Health Advocate Playwright Tests

One running log, newest entries at the top. Two entry types:
- **`[MILESTONE]`** — a phase of work shipped. Plain language, for anyone reading.
- **`[DECISION]`** — a call that was made and why. More technical, this is your interview material.

A milestone entry can include one or more decisions inline if they happened together — no need to
force them apart.

---

## [2026-09-15] — [MILESTONE] Homepage suite + read-only API suite; repo set to auto-delete merged branches
**Shipped:** Two new suites. `tests/homepage/` covers the homepage's own content: every
call-to-action link, all 8 "solution tile" cards (heading link + icon link each), the footer/legal
links, external links, and the search form. `tests/api/` covers the public WordPress REST API
(root index, page lookups by slug, a documented case where a listed endpoint actually requires
auth) and the Yoast sitemap index - all plain `GET` requests, nothing state-changing, using
Playwright's `request` fixture directly (no browser needed). 56 tests pass end to end against the
live site. Also: the GitHub repo now auto-deletes a branch once its PR merges.

**Decisions made:**
- **[DECISION]** Homepage locators use `getByRole` + `:visible` (`tests/support/locators.ts`)
  rather than the header suite's raw-text-regex approach, after finding the homepage duplicates
  whole content sections (not just the header) and at least one tile's text contains a literal line
  break that only accessible-name computation normalizes correctly. See DECISIONS.md.
- **[DECISION]** The "icon link matches heading link" check uses "at least 2 visible links share
  this href" instead of an exact count, since real duplicate counts vary (2/4/6) across tiles for
  reasons unrelated to the one real bug (Mind & Body EAP's stale icon URL) it's meant to catch. That
  one gets its own specific, exact test instead. See DECISIONS.md.
- **[DECISION]** The search suite checks form structure only, not a submitted query - the search
  box isn't reachable at this project's desktop test viewport (confirmed off-screen, not just
  CSS-hidden). See DECISIONS.md and testability-notes.md.
- **[DECISION]** Corrected a wrong assumption from the original discovery pass rather than testing
  it as fact: `contact-form-7/v1/contact-forms` looked publicly readable (it's listed in the
  `wp-json` root index) but actually 403s - now a real contract test instead of stale documentation.
  See DECISIONS.md.

**Real findings along the way:** a stale, pre-restructure icon-link URL on the Mind & Body EAP tile
(redirects correctly, but doesn't match its own heading link like every other tile does); the
homepage's footer "Member Login" link reaches the same login flow as the header's, just via a
4-hop redirect chain that includes a brief, genuine downgrade to plain HTTP mid-chain (corrected
from an earlier, less complete note that assumed the two links were simply different destinations).

**Next up:** Login is still deferred pending separate research into whether it's safe/possible to
test at all. Accessibility and security testing remain noted follow-ups, not yet started.

---

## [2026-09-15] — [MILESTONE] CI: publish the HTML report to GitHub Pages, link it from the PR
**Shipped:** JZ asked whether test results/videos could be viewed straight from the PR instead of
downloading a zip. The workflow now deploys the Playwright HTML report (embedded video per test +
in-browser trace viewer) to GitHub Pages after every run, and posts/updates a PR comment linking to
it. Each PR gets one stable report URL that updates on every push, instead of piling up separate
downloads. `gh-pages` branch and the repo's Pages setting were created directly via the GitHub API to
get this live without needing a first workflow run.

**Decisions made:**
- **[DECISION]** `peaceiris/actions-gh-pages`, deploying to `gh-pages` with a per-PR
  `destination_dir` and `keep_files: true`, over GitHub's newer Actions-based Pages deploy (single
  site per repo, no natural per-PR path) or leaving it as artifact-only. See DECISIONS.md.
- **[DECISION]** Fork PRs are skipped for the Pages deploy/PR comment (no write access on that
  token) — not a real constraint for a solo project today, documented so it isn't mistaken for a bug
  later.

**Next up:** Confirm the workflow runs clean end to end on the open PR (#1) and that the published
report link actually resolves, then merge it. After that, suite 2 (homepage links/navigation), per
the original ordering.

---

## [2026-09-15] — [MILESTONE] Discovery pass + base repo + first suite: header navigation
**Shipped:** Before writing any test, spent a session manually exploring the live
healthadvocate.com site to understand what makes it easy/hard to automate
([testability-notes.md](docs/discovery/testability-notes.md)), map its structure
([site-map.md](docs/discovery/site-map.md)), and identify what's exposed at the API level
([api-notes.md](docs/discovery/api-notes.md)) - including that the domain spans four separate
origins (marketing site, blog, member portal, and a real OIDC IdentityServer login app) and that the
WordPress REST API is fully public. Then stood up the repo itself: TypeScript + `@playwright/test`,
a GitHub Actions workflow that runs the suite on every push/PR and publishes a JUnit XML report plus
an HTML report with a video of every test, and the first real suite - 21 tests covering every header
link and every Solutions/About Us mega-menu item, verified end to end against the live site (not
just written and assumed to work).

**Decisions made:**
- **[DECISION]** Scoped to passive-only API/network discovery, production-only (no staging exists),
  and login testing explicitly deferred to its own future conversation. See DECISIONS.md.
- **[DECISION]** The header/mega-menu nav structure is hand-maintained data
  (`tests/support/site-map.ts`), not scraped at test time or generated from
  `/site/page-sitemap.xml` (which 504'd twice during discovery). See DECISIONS.md.
- **[DECISION]** All header/mega-menu locators go through shared helpers
  (`tests/support/nav-helpers.ts`) that account for three verified quirks in the live markup:
  duplicate header DOM requiring `:visible` filtering, mega-menu children that are hidden (not
  absent) until a real hover, and "About Us" being an `<a role="button">` with no `href` rather than
  a real `<button>`. See DECISIONS.md and testability-notes.md.
- **[DECISION]** Chromium-only project for now (cross-browser deferred), with video recorded on
  every test (not just failures) and JUnit + HTML reporting. See DECISIONS.md.
- **[DECISION]** Public GitHub repo (`healthadvocate-playwright-tests`), DECISIONS.md/PROJECT-LOG.md
  format borrowed from the WrestlingProject repo, no GitHub Issues/Projects (solo project, no
  backlog to sync).

**Real quirks the suite actually had to handle** (found by running the tests against the live site
and reading *why* they failed, not by guessing): the "Solutions" mega-menu trigger's first click
only opens its submenu and does not navigate - a real second click is required, matching the Max
Mega Menu plugin's default touch/keyboard-friendly behavior; the "Blog" link opens a new browser tab
(`target="_blank"`), which needs `context.waitForEvent('page')` rather than asserting on the
original page's URL; and the homepage has two different "Member Login" links pointing at two
different destinations (the header's goes to the real members subdomain, a second one in the page's
CTA block points at a same-origin `/members` path instead) - flagged as a discrepancy worth asking
the team about rather than assumed to be equivalent.

**Next up:** Suite 2 - exercising the links/navigation on the homepage itself (not just the header).
After that, a read-only API test suite against the public WordPress REST API, and continued research
(outside this repo) into whether login testing is viable at all before any code gets written against
it.

---

<!-- New entries go above this line -->
