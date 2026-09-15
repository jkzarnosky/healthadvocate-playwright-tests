# Decisions Log

Running log of choices made and why. Lightweight — one entry per real decision (a choice between two
or more real alternatives), newest at the top.

---

## 2026-09-15 — Scope: passive discovery only, production-only target, no login yet

Three related decisions made before any code was written, in response to clarifying questions since
this project tests a real third-party company's live site as part of an interview process.

**API/network discovery is passive-only for now.** Tests read what a normal browser visit already
reveals (rendered pages, XHR/fetch calls, publicly documented endpoints like `/wp-json/`) and use
plain `GET` requests only to confirm what discovery found. Alternative considered: also issue direct
`GET`s to discovered endpoints as part of the suite itself, right away. Deferred, not rejected —
kept as an option for a later pass once the passive-only suite has proven out, per the explicit
"depends how far we get" framing. No `POST`/`PUT`/`PATCH`/`DELETE` is in scope either way.

**Every test runs against production - there is no staging/sandbox environment for this project.**
Alternative (asking HealthAdvocate for a sandbox/test environment) isn't available since this is a
personal project, not an engagement with the company. Consequence: no test submits the live
lead-gen/contact forms (would create a real CRM lead), and CI runs on normal push/PR cadence rather
than a tight loop, to keep the site's real footprint from this project low. See
testability-notes.md ("No staging environment").

**Login/authenticated-member-flow testing is out of scope for this pass.** Whether there's a safe way
to test login on the live site (a disposable test account, etc.) needs its own investigation before
any code gets written against it — explicitly deferred to a separate conversation, not skipped by
oversight. Passive discovery already surfaced real signal for when that conversation happens (see
api-notes.md's OIDC-scope findings) without attempting any actual authentication.

## 2026-09-15 — Site map is hand-maintained data, not scraped at test time

`tests/support/site-map.ts` is a plain TypeScript file listing every header link/dropdown item and
its expected destination, written by hand from manual discovery.

**Alternative considered:** derive the nav structure dynamically at test time (crawl the page,
extract every header `<a>`) instead of hardcoding it. Rejected for this first suite: a
self-discovering crawler can't assert "this specific link should exist and go here" — it can only
assert "whatever links exist right now don't 404," which is a weaker, different test. It would also
still need the same hand-written expected-title/expected-origin metadata this file already carries
for verification, so the dynamic version isn't actually simpler.

**Alternative considered:** generate it from `/site/page-sitemap.xml`. Rejected — that endpoint
returned `504 Gateway Time-out` twice during discovery and can't be depended on as a live source of
truth (see testability-notes.md). A hand-maintained file is a known, accepted maintenance cost:
update it when the live header actually changes, same as any other test fixture.

## 2026-09-15 — Header/mega-menu locators go through shared helpers, not inline `getByRole`

`tests/support/nav-helpers.ts` centralizes how header links and the "About Us" trigger are located,
rather than each spec calling `page.getByRole(...)` directly.

**Why:** three real, verified quirks in the live markup would otherwise need to be worked around
independently in every spec file: duplicate header DOM (needs `:visible` filtering), mega-menu
children hidden until a real hover (needs an explicit hover-and-wait step), and "About Us" being an
`<a role="button">` with no `href` rather than a real `<button>` (needs a role-based, not tag-based,
locator). See testability-notes.md for how each was confirmed. Centralizing means a future spec
just calls `headerLink(page, 'Careers')` and gets all three fixes for free, instead of a new author
rediscovering the same three issues from scratch.

## 2026-09-15 — Chromium-only for now, JUnit + HTML + video(on) reporting

`playwright.config.ts` runs a single `chromium` project, with `reporter: [list, junit, html]` and
`video: 'on'` (every test, not just failures).

**Alternative considered:** a full Chromium/Firefox/WebKit matrix from the start. Deferred, not
rejected — cross-browser coverage is real value for a production site, but doubles or triples CI
time and video-artifact size for a first suite that's still establishing whether the locator
strategy is even stable. Revisit once the navigation suite is proven out across a few real runs.

**Video on every test, not just failures:** direct ask for this project (a recording of the
happy-path run is itself part of what gets presented), not the more common "retain-on-failure"
default. Traded off against artifact size - acceptable for a header-navigation suite (21 short
tests); worth revisiting if a much larger suite later makes the video artifact unreasonably large.

## 2026-09-15 — Public GitHub repo, no GitHub Issues/Projects

Repo created as `jkzarnosky/healthadvocate-playwright-tests`, public, with CI wired to GitHub
Actions from the start. Decisions log (this file) and PROJECT-LOG.md follow the same format used on
the WrestlingProject repo, minus that project's GitHub Issues/Milestones/stacked-PR machinery —
explicitly not needed here (solo project, no backlog to sync against issues).

**Why public:** makes it trivial to share a link with the hiring team, same reasoning as
WrestlingProject's own public-portfolio decision.
