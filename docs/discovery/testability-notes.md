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

## Two different "Member Login" destinations on the same page

The homepage has two separate "Member Login" links that are easy to assume are the same thing:

- The header nav link goes to `https://members.healthadvocate.com/` (the real subdomain, which then
  redirects through the OIDC login flow to `identity.healthadvocate.com`).
- A second "Member Login" link, in the page's lower CTA/footer block, points at
  `https://www.healthadvocate.com/members` - a same-origin relative path, not the members subdomain.

Worth flagging to the team as a possible inconsistency (unclear if `/members` is an intentional
alias/redirect or a stale link) rather than assuming it's equivalent. This project's header-link
test only covers the header instance; the footer instance is a candidate for its own test once its
intended behavior is confirmed.

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
