# Decisions Log

Running log of choices made and why. Lightweight — one entry per real decision (a choice between two
or more real alternatives), newest at the top.

---

## 2026-09-15 — Mega-menu clicks: hover the actual target child, not just check its visibility

A GitHub Actions CI run (the PR #1 merge commit) had 2 header mega-menu tests fail after exhausting
both retries, with a `locator.click: Timeout 15000ms exceeded` that didn't reproduce locally. Rather
than assume "CI is just slower" and raise a timeout number, pulled the actual trace/error-context
from that run first. The real cause was a race, not raw slowness:

```
- element is not stable
- <div class="wpb_wrapper">...</div> ... intercepts pointer events
```

`openMegaMenu()`'s wait (`expect(sampleChild).toBeVisible()`) only confirms a non-zero bounding box,
which can be true mid-animation, before the reveal transition has actually settled. Between that
check and the caller's separate `.click()` call, nothing keeps the mouse "in" the menu, so
hoverIntent's own mouse-out timer could start closing it again - the click then lands on whatever
page content is underneath instead of the real link, exactly matching the trace's "wrapper
intercepts pointer events."

**Alternative considered: just raise `actionTimeout`.** Simpler, but wouldn't have actually fixed
it - the failure mode is "the click hits the wrong element," not "the click ran out of time." A
longer timeout just means retrying the same race for longer before giving up.

**Chosen:** `openMegaMenu()` now also calls `.hover()` on the exact child the caller is about to
click (every current caller already passes that specific child as `sampleChildName`, not an
arbitrary "menu is open" probe) instead of only checking its visibility. Playwright's `hover()`
retries until the target is genuinely stable, which absorbs the animation-settling wait for free,
and leaves the mouse resting on the real target - closing the gap where the menu could start
closing again before the caller's immediately-following `.click()` lands.

**Verified against the live CI runner, not just locally** (the race never reproduced locally in the
first place): 4 extra `workflow_dispatch` runs after the fix landed. 3 were clean (56/56 first try).
The 4th still hit the same class of timeout once - one "Solutions" child, first attempt, 19.7s - but
recovered on the very next retry in 4s, versus the original failure mode where retries kept hitting
the identical race and never recovered. Read as: the fix closes the race in the overwhelming
majority of cases and turns the rest into genuinely transient CI slowness that Playwright's normal
retry already covers, not a full, guaranteed elimination - reasonable given it depends on exact
timing on a shared runner. Not chasing this further unless it recurs.

**Unrelated finding from the same verification batch:** running 3 `workflow_dispatch` triggers back
to back made one run's "Publish HTML report to GitHub Pages" step fail outright - `failed to push
some refs` - because two runs' deploys to the shared `gh-pages` branch raced each other. All 56
tests had already passed by that point in the run; the job only shows red because of this unrelated
push conflict. A real gap (concurrent runs deploying to `gh-pages` can race even when their
`destination_dir`s don't overlap), but a self-inflicted one from firing several manual runs at once
to stress-test the fix above - normal solo-project usage doesn't trigger overlapping runs like this.
Logged here rather than fixed silently; worth a `concurrency:` group on the Pages-deploy step if it
ever happens during real usage.

## 2026-09-15 — Homepage locators: `getByRole` + `:visible`, not raw text matching

Building the homepage suite surfaced a bigger version of the header's duplicate-DOM problem: several
"solution tile" links exist as **two or more separate content blocks** on the page itself (not just
a header/sticky-header duplicate), almost certainly a hand-authored desktop/mobile split rather than
one block reflowed by CSS - confirmed by counting real DOM matches (e.g. "Wellness & Coaching"
resolves to 6 total `<a>` elements across header + two content copies).

**Alternative considered: keep the header suite's raw-text + `:visible` CSS approach
(`nav-helpers.ts`'s pattern).** It's what the header suite already used successfully. Rejected for
homepage content specifically because it broke on two edge cases that pattern can't handle: (1) a
tile heading with a literal line break in its markup (`Mental Health<br>& Work/Life (EAP)`), which a
single-space regex never matches but doesn't affect real users at all - the browser's own accessible
name computation already normalizes it; and (2) a tile whose icon-link image has alt text identical
to the heading text, so text-based matching alone can't tell heading and icon apart.

**Chosen:** `getByRole('link', { name, exact: true })` intersected with a `:visible` locator
(`tests/support/locators.ts`), which sidesteps the whitespace problem for free (accessible-name
computation normalizes it) and adds `tileHeadingLink()` (excludes WPBakery's
`vc_single_image-wrapper` icon-image class) for the one case where heading and icon still share an
exact accessible name. `nav-helpers.ts`'s header-specific helpers were left as-is rather than
rewritten to match - they work correctly for the header's own duplication pattern, and the shared
`exactTextRegex` logic was pulled into `locators.ts` so both approaches reuse the same escaping code
without duplicating it.

## 2026-09-15 — Two solution-tile-link tests scaled back from an exact-count assertion

The Mind & Body EAP tile's icon link uses a stale URL (`/site/mind-body-eap`, missing
`/product-index/`) that still works via a 301 - a genuine, useful finding (see testability-notes.md).
The first version of this test generalized it into "assert exactly 2 links share this href" for
every tile, expecting to catch the same class of bug elsewhere. Real DOM counts turned out to be 2,
4, or 6 depending on the tile (the responsive-duplication issue above), so an exact-count assertion
would have been asserting incidental duplication-count trivia, not anything meaningful.

**Chosen:** for the 7 tiles where heading and icon already agree, assert "at least 2 visible links
share this href" (loose, but still catches a link actually going missing) instead of an exact count;
for Mind & Body EAP, keep the specific, real assertion (icon href differs from heading href, and
301-redirects to it) as its own dedicated test rather than folding it into the generic loop.

## 2026-09-15 — Search: structural check only, not a submitted-query test

The header's search `<input>` is present on every page load but renders **off-screen** (a negative Y
coordinate) at the desktop viewport this suite runs at - confirmed by attempting to click it and
getting Playwright's "entirely outside the viewport" error, then reproducing the same box position
via a raw DOM bounding-rect check. A quick manual check at a 375px mobile viewport (hamburger menu
open) didn't turn up an obvious way to reach it either in the time spent looking.

**Alternative considered:** force-interact with the hidden input (Playwright's `{ force: true }`
bypasses actionability/visibility checks) to submit a real query and assert on the results page.
Rejected - that tests something a real user literally cannot do at this viewport, which isn't a
meaningful pass/fail signal either way.

**Chosen:** `homepage-search.spec.ts` asserts the form's structure only (`method="get"`, the
`action` URL, the `s` field name) - real information a future test could build on - and
`testability-notes.md`/`homepage-map.ts` document why an interactive test isn't here yet. A
mobile-viewport interactive search test is a reasonable future addition, not abandoned scope.

## 2026-09-15 — API tests: fixed a wrong assumption from discovery instead of asserting it as fact

`api-notes.md`'s discovery pass assumed `GET .../contact-form-7/v1/contact-forms` was safely
readable because it's *listed* as a public route in the `wp-json` root index. Writing an actual test
against it (still just a `GET`) showed that's wrong: it 403s with `wpcf7_forbidden`. Being listed in
the route index means the route exists, not that it's callable without authentication.

**Chosen:** corrected api-notes.md rather than leaving the wrong assumption on record, and turned
the real behavior into a test (`wp-rest-api.spec.ts`, "endpoints that look public but are not") -
asserting the 403 is itself useful: if this ever starts returning 200, that's a real permissions
change worth noticing, not just a curiosity from one discovery session.

## 2026-09-15 — Publish the HTML report to GitHub Pages instead of zip-only artifacts

JZ asked whether test reports/videos could be viewed directly from the PR instead of downloading a
zip from the Actions artifacts tab.

**Alternative considered: keep `actions/upload-artifact` only (the original setup).** Simplest, no
extra permissions or third-party actions, but the HTML report — which already embeds a video player
per test and a full trace viewer — is only reachable by downloading a zip, extracting it, and opening
`index.html` locally. That's real friction for a reviewer who just wants to glance at what a run
looked like.

**Alternative considered: `actions/upload-pages-artifact` + `actions/deploy-pages` (GitHub's newer,
"Actions" Pages build type).** Cleaner/more current API, but it deploys to a single site per repo —
no built-in way to keep one persistent URL per open PR without hand-rolling path management the
action isn't designed for.

**Chosen: `peaceiris/actions-gh-pages`, deploying to a `gh-pages` branch with a per-PR
`destination_dir` (`reports/pr-<number>`) and `keep_files: true`.** Each PR gets one stable URL that
updates in place on every push (old runs' reports for *other* PRs aren't wiped, since `keep_files`
only protects existing paths outside the current deploy's `destination_dir`). A PR comment (posted by
`peter-evans/create-or-update-comment`, using a comment-tag so reruns edit the same comment instead of
piling up new ones) links straight to it. The Playwright HTML report is fully self-contained static
HTML/JS/data, so it renders correctly from a GitHub Pages subpath with no server-side piece needed —
confirmed by how `playwright show-report` itself just serves the same folder statically.

Raw `test-results/` (videos, traces, `junit.xml`) stays available as a **downloadable** artifact too
— the published HTML report is the primary "look without downloading" path, not a full replacement
for anyone who wants a local trace file open in the standalone Trace Viewer app.

**Fork PRs are skipped** (`report_meta` step's `if` condition): the default `GITHUB_TOKEN` on a
fork's PR run has no write access to push to `gh-pages` or comment on the PR. Not a concern for a
solo project today; documented so it doesn't look like a silent bug if a fork PR ever shows up
without a report comment.

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
