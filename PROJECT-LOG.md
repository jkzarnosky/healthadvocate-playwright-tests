# Project Log — Health Advocate Playwright Tests

One running log, newest entries at the top. Two entry types:
- **`[MILESTONE]`** — a phase of work shipped. Plain language, for anyone reading.
- **`[DECISION]`** — a call that was made and why. More technical, this is your interview material.

A milestone entry can include one or more decisions inline if they happened together — no need to
force them apart.

---

## [2026-09-16] — [MILESTONE] Stopped gh-pages report directories from growing forever
**Shipped:** JZ asked for a cleanup of the accumulated report videos - checking first confirmed
`reports/main` had grown on every single push (458 → 755 files across 5 deploys, zero ever
removed), since the Pages-deploy action overlays fresh files without clearing old ones and every
run's video/trace files have unique, never-colliding names. Two fixes: the deploy step now clears
its own destination path before redeploying (so a run replaces itself instead of piling up), and a
new job deletes a PR's report directory entirely once that PR closes. Also did a one-time manual
purge of what had already piled up - all 5 merged PRs' report directories removed, `reports/main`
reset to just the current run's files. A first version of the redeploy step raced with
`peaceiris/actions-gh-pages`'s own push to the same branch (caught by a real CI run, fixed in a
follow-up by hand-rolling the whole deploy as one sequence instead of two coordinating steps).

**Decisions made:**
- **[DECISION]** Clear-then-redeploy via a throwaway `git worktree`, not `keep_files: false` - that
  flag wipes the *entire* `gh-pages` branch on every deploy, which would delete every other open
  PR's still-live report, not just the stale content in the path actually being redeployed. See
  DECISIONS.md.
- **[DECISION]** The one-time manual purge went straight to `gh-pages`, not through a PR - that
  branch holds only generated artifacts and isn't covered by the "PRs for everything" policy, which
  is specifically about `main`.

**Next up:** Login remains deferred pending separate research; accessibility/security testing are
still noted follow-ups.

---

## [2026-09-16] — [MILESTONE] Fixed a third mega-menu interception case (a neighboring closed item)
**Shipped:** JZ noticed 2 flaky tests in a normal (not stress-tested) CI run's published report and
asked for them fixed rather than left to Playwright's retry safety net. The real trace showed a
third, distinct cause from the two already fixed: a different, closed top-level menu item's own
`<li>` occasionally intercepting a click meant for a sibling's child link - likely the real mouse's
travel path grazing a neighboring item near a menu boundary. Fixed by switching the mega-menu
child-link tests from a real mouse click to `locator.dispatchEvent('click')` once the target is
already confirmed visible/stable, which invokes the click handler directly instead of hit-testing at
pixel coordinates - sidesteps this whole class of "something else is on top of the target" problem
without weakening the tests that genuinely need real click/hover mechanics (kept as-is).

**Decisions made:**
- **[DECISION]** `dispatchEvent('click')` for leaf-link mega-menu clicks specifically, not a
  broader change - these children have no click-interception JS of their own, unlike the
  "Solutions" trigger (still needs a real click to exercise its actual first-click-opens-menu
  behavior) and "About Us" (still needs a real check that it has no href). See DECISIONS.md.

**Next up:** Merged before this branch was updated with the gh-pages cleanup work above - both are
shipped now.

---

## [2026-09-15] — [MILESTONE] CI-timeout investigation closed out: 9 stress-test runs, verdict logged
**Shipped:** No new code - closing out the CI-flakiness investigation from the two entries below with
the full verification record, since JZ specifically flagged this troubleshooting process as worth
documenting as clearly as the fixes themselves. Across both stress-test batches (9 `gh
workflow_dispatch` runs total, each watched to completion and any failure re-read from its actual
trace/log rather than taken at face value): every individually-triggered run was clean; the only
run with real test failures was also the most heavily concurrent one (4 simultaneous full suites at
once, self-inflicted by the verification method), and its failure pattern didn't match either
previously-diagnosed race.

**Decisions made:**
- **[DECISION]** Stopped the investigation here rather than add further defensive complexity to
  chase a failure mode that only appeared under artificially heavy concurrent load real usage
  (one PR, one run) doesn't produce. See DECISIONS.md for the full tally and reasoning.

**Next up:** Homepage/API suites and both CI-reliability fixes are shipped and merged. Login remains
deferred pending separate research; accessibility/security testing are still noted follow-ups.

---

## [2026-09-15] — [MILESTONE] Found and fixed a second CI interference source: the hero carousel
**Shipped:** Stress-testing the mega-menu fix (previous entry) with extra manual CI runs surfaced a
different real failure: Revolution Slider, the homepage's auto-rotating hero carousel, can spawn an
element mid-transition that intercepts clicks meant for the header - confirmed by an actual trace,
not assumed. Unlike the mega-menu race, this recurs for as long as a test is on the page, so waiting
it out isn't reliable. Fixed with a shared test fixture (`tests/support/fixtures.ts`) that every
spec now imports from, injecting CSS to disable pointer events on the slider's wrapper elements.

**Decisions made:**
- **[DECISION]** CSS injection via a shared fixture, not a per-test wait/retry - the interference is
  periodic and ongoing, not a one-time animation with a stable end-state to wait for. See
  DECISIONS.md.

**Next up:** Homepage/API suites, the mega-menu fix, and this fix are all shipped and going through
PR review. Login remains deferred pending separate research; accessibility/security testing are
still noted follow-ups.

---

## [2026-09-15] — [MILESTONE] Fixed a real CI-only mega-menu race; main now requires PRs
**Shipped:** A CI run had flagged 2 header mega-menu tests failing after exhausting all retries - a
race, not a flaky timeout, confirmed by reading the actual trace rather than guessing. Fixed by
having the shared `openMegaMenu()` helper hover the exact link it's about to click (not just check
its visibility) before returning, so the mouse never leaves the menu in the gap before the click.
Verified against the live CI runner itself (where the race actually reproduced) with 4 extra manual
runs: 3 clean, 1 that hit the same class of timeout once but recovered on the very next retry in 4s
instead of exhausting all retries like before. Also: JZ asked for every change to `main` to go
through a PR from now on - real GitHub branch protection is now enabled (PR + passing CI required,
no direct or force pushes, enforced even for the repo owner), and CLAUDE.md's git-workflow section
was rewritten to match instead of its previous (accurate at the time, now stale) "commit directly to
main" guidance.

**Decisions made:**
- **[DECISION]** Fixed the actual race (hover the real target, not a separate "sample" element)
  instead of just raising `actionTimeout` - the failure mode was "the click hits the wrong element,"
  which a longer timeout wouldn't have fixed, just delayed hitting the same race. See DECISIONS.md.
- **[DECISION]** Real branch protection (GitHub API), not just a CLAUDE.md instruction to follow -
  makes "no direct pushes" enforced rather than a convention that could be forgotten.

**Also found (unrelated, from the verification batch):** firing several `workflow_dispatch` runs
back to back made one run's GitHub Pages deploy step fail on a git push conflict - two runs' deploys
to the shared `gh-pages` branch raced each other. All 56 tests had already passed in that run; only
the deploy step failed. Self-inflicted by the verification method (real solo-project usage doesn't
trigger overlapping runs), not fixed yet - noted in DECISIONS.md as a real gap worth a
`concurrency:` group if it ever happens during normal usage.

**Next up:** Homepage/API suites and this fix are all shipped; login is still deferred pending
separate research, and accessibility/security testing remain noted follow-ups.

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
