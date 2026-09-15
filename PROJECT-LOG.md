# Project Log — Health Advocate Playwright Tests

One running log, newest entries at the top. Two entry types:
- **`[MILESTONE]`** — a phase of work shipped. Plain language, for anyone reading.
- **`[DECISION]`** — a call that was made and why. More technical, this is your interview material.

A milestone entry can include one or more decisions inline if they happened together — no need to
force them apart.

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
