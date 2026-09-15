# Testability Notes

Findings from manually exploring healthadvocate.com before writing any automated tests, focused on
what makes the site easy or hard to drive with Playwright. Gathered 2026-09-15 against the live
production site (no staging/sandbox environment exists for this project - see "No staging
environment" below). Each item that shaped an actual decision in the test code links to
[DECISIONS.md](../../DECISIONS.md).

---

## Platform fingerprint

The marketing site (`www.healthadvocate.com/site/...`) is WordPress: theme "Enzio", page builder
WPBakery (`js_composer`), Revolution Slider, the Max Mega Menu plugin for header navigation, WP
Rocket for page/asset caching (served from `/wp-content/cache/min/1/...`), and Yoast SEO. Knowing
this in advance explains most of the quirks below - they're standard behavior for this exact plugin
stack, not bugs specific to this build.

The domain is not a single application. Four separate origins are involved in normal navigation:

| Origin | What it is |
|---|---|
| `www.healthadvocate.com` (paths under `/site/`) | WordPress marketing site |
| `blog.healthadvocate.com` | Separate blog install, opens in a new tab from the header |
| `members.healthadvocate.com` | Member portal entry point - immediately redirects |
| `identity.healthadvocate.com` | A real OIDC/IdentityServer login app (ASP.NET) that `members.healthadvocate.com` redirects to |

Tests that cross an origin boundary need to know that in advance (different title patterns, in
one case a new browser tab, in another a multi-hop redirect) - see `tests/support/site-map.ts`.

## Duplicate header markup

The Max Mega Menu plugin renders the entire header navigation **twice** in the DOM - a default copy
and a sticky-on-scroll clone - with identical text and identical classes (every menu link shares the
single class `mega-menu-link`, so class name can't disambiguate them either). Only one copy has
non-zero layout size at any given time; which one is empty is not fixed by DOM order.

**Consequence:** `page.getByRole('link', { name: 'Careers' })` matches 2 elements and throws in
Playwright's strict mode. Every header locator in this project goes through
`tests/support/nav-helpers.ts`, which filters to `:visible` first.

## Mega-menu submenu items are hidden, not absent

Solutions' and About Us's dropdown children exist in the DOM on page load - they're not injected on
hover - but are visually hidden (zero size) until the parent is hovered, via the `hoverIntent`
jQuery plugin. A plain `.click()` on a child link fails Playwright's actionability check immediately
after page load, because the element starts out with zero size.

**Fix used:** `openMegaMenu()` in `nav-helpers.ts` hovers the trigger and waits for a known child to
become visible before interacting with anything inside the menu.

## First click on a mega-menu parent-with-children only opens it

"Solutions" is unusual: it's both a real link (`href="/site/product-index"`) *and* a mega-menu
trigger with 8 children. Verified empirically (clicked twice, watched the URL): the **first** click
only opens the submenu and does not navigate; the page URL is unchanged and the trigger's
`aria-expanded` flips to `true`. A **second** click (with the menu already open) actually follows the
link. This matches the Max Mega Menu plugin's own default "first click opens, for touch/keyboard
users" behavior for any top-level item that has children.

"About Us" doesn't hit this at all, because it has no `href` to navigate to in the first place (see
next item).

**Test coverage:** `header-dropdowns.spec.ts` clicks "Solutions" twice, asserting the intermediate
(menu-open, URL-unchanged) state explicitly rather than treating it as a fluke.

## "About Us" is an `<a role="button">`, not a real `<button>`

`document.querySelector` shows the "About Us" trigger is `<a class="mega-menu-link" role="button"
tabindex="0">` with **no `href` attribute at all** - a real anchor tag, ARIA-relabeled as a button,
with no target to navigate to. Playwright's accessibility-based locators (`getByRole('button', ...)`)
resolve this correctly because they read the computed ARIA role; a plain CSS tag selector like
`header button` matches nothing, because the tag is literally `<a>`.

**Fix used:** `headerButton()` in `nav-helpers.ts` uses `getByRole('button', ...)` intersected with a
`:visible` locator (`Locator.and()`), not a CSS tag selector.

This is also a real, if minor, accessibility gap worth naming for a report to the team: a control
exposed to assistive tech as a button has no click target of its own - a screen reader or keyboard
user has no way to reach "About Us" content except by tabbing into its children.

## The "Blog" link opens a new tab

`About Us > Blog` carries `target="_blank"`. A test that clicks it and then asserts on `page.url()`
will time out, because `page` never navigates - a new tab does. Confirmed by reading the raw HTML
(`<a target="_blank" ... href="https://blog.healthadvocate.com/">Blog</a>`) rather than guessing from
the timeout. Handled with `context.waitForEvent('page')` around the click.

## Two "Member Login" links, same destination, very different paths

The homepage has two separate "Member Login" links. They *do* end up in the same place, but it's
worth knowing why they look different before writing a test against either:

- The **header** nav link goes straight to `https://members.healthadvocate.com/`, which redirects
  (2 hops) through the OIDC login flow to `identity.healthadvocate.com`.
- The **footer**/CTA-block link points at `https://www.healthadvocate.com/members` (same-origin,
  no `/site/` prefix) - which then chains through **four** redirects before landing on the same
  member portal: `.../members` (no slash) → `http://www.healthadvocate.com/members/` (a genuine,
  if momentary, **downgrade to plain HTTP** mid-chain) → `https://www.healthadvocate.com/members/`
  → `https://members.healthadvocate.com` → `https://members.healthadvocate.com/ha/`, which then
  itself does a client-side (JS) redirect into the same `identity.healthadvocate.com` OIDC flow the
  header link reaches directly.

Confirmed by following the whole chain with plain `fetch(..., { redirect: 'manual' })` calls, not
guessed from a timeout. Worth flagging to the team less as "these are different destinations" (they
aren't) and more as "one of these two working links takes a needlessly long path through a stale
`/members` redirect, including a real - if brief - unencrypted HTTP hop." Both links are covered in
this project's test suites: the header instance in `header-links.spec.ts`, the footer instance in
`homepage-links.spec.ts` (which asserts the eventual destination, not the intermediate hops, since
Playwright's navigation follows the whole chain automatically).

## The homepage duplicates whole content sections, not just the header

The header's duplicate-DOM issue (see above) turned out not to be a header-only quirk. Several
homepage "solution tile" headings/links exist **twice** in the real page content itself (not
counting the header's own copies) - confirmed by counting DOM matches for exact link text: e.g.
"Wellness & Coaching" resolves to 6 total `<a>` elements (2 in the header's default/sticky copies,
2 in one on-page content block, 2 in a second on-page content block with separate WPBakery
CSS-hash IDs). Only one of the on-page copies is genuinely visible at a normal desktop viewport;
the rest have a zero-size bounding box, almost certainly a responsive desktop/mobile split
authored as two separate blocks rather than one block reflowed with CSS.

**Consequence:** a locator built from raw text content and a naive `:visible` CSS filter can still
return zero matches or throw a strict-mode "N elements" error, depending on timing and which
duplicate happens to be visible. This project's homepage suite uses `getByRole('link', { name,
exact: true })` intersected with `:visible` (`tests/support/locators.ts`'s `tileLink()`) instead of
raw text matching - `getByRole`'s accessible-name computation also normalizes internal whitespace,
which fixed a second, unrelated issue: at least one tile's heading text has a literal line break in
the markup (`Mental Health<br>& Work/Life (EAP)`), which a naive single-space regex never matches
but accessible-name computation handles correctly.

## A stale-but-working icon link

Every homepage "solution tile" renders a heading link and a separate icon/figure link. On 7 of 8
tiles both point at the identical URL. The 8th - Mind & Body EAP - has an icon link pointing at
`/site/mind-body-eap` instead of the heading's `/site/product-index/mind-body-eap`: a stale,
pre-site-restructure URL. It isn't dead (confirmed: `301`s to the correct page), but it's a real,
verified inconsistency worth flagging to the team rather than silently working around - see
`tests/support/homepage-map.ts` and the dedicated test in `homepage-links.spec.ts`.

## The search box isn't reachable at a desktop viewport

The header's search `<input>` is present in the DOM on every page load, but at this project's
desktop test viewport it renders **off-screen** (a negative Y coordinate, not just `width:0` or
`opacity:0`) - confirmed by attempting to click it and getting Playwright's "entirely outside the
viewport" error. Switching to a mobile viewport (375px) and opening the hamburger menu is the only
path that visually exposes it; even then, the toggle didn't reveal an obviously interactive search
field in a quick manual check. Rather than force an interaction the real UI doesn't actually offer
at desktop width, `homepage-search.spec.ts` only checks the form's structure (`method="get"`,
`action`, the `s` field name) - real, useful information for a future mobile-viewport interactive
search test, without pretending a desktop click-and-type flow exists when it doesn't.

## No staging environment

There is no sandbox/staging site for this project to point at - every test run exercises the real
production site. That constrains what's reasonable to automate at all:

- No test ever submits the homepage's live lead-generation form ("HOW CAN WE HELP YOU?") or the
  Contact page's form - a real submission would create a real sales lead in HealthAdvocate's CRM.
  Form-*presence* and field-validation-UI checks are fair game later; submission is not, unless a
  disposable/marked test-data convention is agreed with the team first.
- No load, stress, or high-frequency test runs - CI runs the suite at a normal, low-frequency cadence
  (see [DECISIONS.md](../../DECISIONS.md)), not on a tight loop.
- Login/authenticated-flow testing is explicitly out of scope for this pass; viability (whether a
  safe test account or environment exists) needs its own conversation with the team before any code
  is written against it.

## Third-party embeds add real load/flakiness risk

- A NICE inContact live-chat widget loads as a sandboxed `<iframe>` and uses IndexedDB
  (`pageViewsDB`) for its own analytics; Chrome logs a console warning that its sandbox
  (`allow-scripts allow-same-origin` together) can be escaped - a third-party concern, not something
  this site controls, but worth knowing it's there if a test ever seems to hang waiting for network
  idle (the widget keeps its own background requests going).
- A Pardot (Salesforce marketing) form is iframe-embedded on at least one page
  (`2027brokerstrategy`), discovered via the WP REST API content dump - another third-party iframe
  boundary to expect on marketing/landing pages generally.

## Cookie banner has no granular consent choice

The homepage's cookie notice offers only a single "x" dismiss control - no "accept"/"decline"
distinction to choose the more privacy-preserving option between. Dismissing is a one-way
acknowledgement, persisted client-side via `jquery.cookie.js`. It didn't block any element clicked in
this project's first suite, but a future suite touching lower-viewport content on a fresh session
should dismiss it in a `beforeEach` rather than assume it's absent.

## `/site/page-sitemap.xml` is unreliable

Yoast's sitemap index (`/site/sitemap.xml` -> `/site/sitemap_index.xml`) loads fine and lists 8
sub-sitemaps, but `/site/page-sitemap.xml` - the one that would actually enumerate every WordPress
page - returned `504 Gateway Time-out` on both attempts made during discovery. Not something this
project can fix; documented so nothing here is built to depend on that URL as a live source of
truth. `tests/support/site-map.ts` is hand-maintained for exactly this reason (see
[DECISIONS.md](../../DECISIONS.md)).

## robots.txt hints at a legacy platform sharing the domain

`robots.txt` disallows a long list of `.aspx` paths and folders (`/member/`, `/members/`,
`/wellness/`, `/Careers.aspx`, `/ClearSiteCache.aspx`, etc.) that don't correspond to anything in the
current WordPress site map. That, plus the fact that `members.healthadvocate.com` redirects into a
distinct ASP.NET IdentityServer app, suggests an older ASP.NET-based platform still exists
alongside the WordPress marketing site (possibly retired, possibly still serving the paths robots.txt
is trying to keep search engines away from). Out of scope to investigate further under a
passive-discovery pass, but useful context for anyone surprised to find non-WordPress URLs on this
domain later.

## Off-site links a nav suite should treat as out of scope

- Careers > "See Open Positions" leaves the domain entirely, to
  `languageline.wd5.myworkdayjobs.com` (Workday ATS) - incidentally confirms a corporate
  relationship with LanguageLine Solutions.
- The footer's "Global Ethics Hotline" goes to `tp.integrityline.com`, a third-party ethics-reporting
  vendor.

Both are legitimate destinations to assert *exist and resolve*, but not sites to test beyond that -
they belong to other companies.
