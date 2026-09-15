# API Discovery Notes

Scope for this pass, per project decision: **passive discovery only** - reading what's publicly
reachable by requesting URLs a normal visitor's browser would request, with plain `GET`s used only to
confirm what discovery turned up. No authentication was attempted, no state-changing request
(`POST`/`PUT`/`PATCH`/`DELETE`) was sent anywhere, and no credentials were entered. See
[DECISIONS.md](../../DECISIONS.md) for the "passive discovery for now" call and what would change if
a later pass expands into direct `GET`-only API tests.

## The WordPress REST API is fully public

`https://www.healthadvocate.com/site/wp-json/` returns a complete, unauthenticated API index. It
advertises these namespaces:

```
oembed/1.0, contact-form-7/v1, jetpack/v4 (+ /stats-app, /explat), redirection/v1, sliderrevolution,
yoast/v1, wpcom/v2, wpcom/v3, monsterinsights/v1, wp-rocket/v1, jetpack-boost/v1, my-jetpack/v1,
google-site-kit/v1, regenerate-thumbnails/v1, wp/v2, wp-site-health/v1, wp-block-editor/v1,
wp-abilities/v1
```

Most of these are the standard REST surface every plugin in the stack auto-registers (Jetpack, WP
Rocket, Yoast, MonsterInsights, Google Site Kit) and aren't interesting to test directly. Two are:

### `wp/v2` - real content, confirmed readable

`GET /site/wp-json/wp/v2/pages?per_page=5` returns full page objects (id, slug, title, full
`content.rendered` HTML, dates, status) with no authentication - this is standard, intentional
WordPress behavior for published content, not a misconfiguration. Confirmed with a real request
during discovery.

**A real quirk found in the response:** `content.rendered` for at least one page
(`2027brokerstrategy`) still contains **unprocessed WPBakery/VC shortcode syntax**
(`[vc_row ...][vc_column ...]...[/vc_row]`) mixed in with real HTML, rather than the fully rendered
page-builder output a browser sees. Anything that consumes this API expecting clean HTML (e.g., a
future content-diffing test) needs to account for that - the REST content field is not equivalent to
what's rendered client-side.

Candidate for a future safe-`GET` API suite: fetch a known page by slug
(`wp/v2/pages?slug=careers`) and assert its title/slug/status match what the UI shows, as a
cheap cross-check that doesn't require rendering a browser at all.

### `contact-form-7/v1` - form *structure* is public, submission was not tested

`GET /site/wp-json/contact-form-7/v1/contact-forms` is listed as a public `GET` endpoint (alongside a
`POST` for actual submission). Discovery did not call it - listing contact-form metadata is
low-risk and a reasonable future `GET`-only check (e.g., "the contact form's expected fields haven't
silently changed"), but this project draws the line at read-only for now, and submission is
explicitly out of scope regardless (see testability-notes.md, "No staging environment").

## No root `sitemap.xml`; Yoast sitemap lives under `/site/`

`GET /sitemap.xml` at the domain root is a 404. The real one is
`GET /site/sitemap.xml` (redirects to `/site/sitemap_index.xml`) - see site-map.md for its contents
and the known `page-sitemap.xml` reliability issue.

## The member login flow reveals a real backend API surface (observed, not probed)

Simply loading the public "Member Login" page (no credentials entered) shows enough to map the
architecture behind it. `members.healthadvocate.com` redirects to `identity.healthadvocate.com`,
whose login page's own `ReturnUrl` query string is an OIDC authorization request naming these scopes:

```
openid profile HealthAdvocateApi WellnessApi MemberSiteApi AdviceApi CrmApi AmpApi
MedicalProviderApi IdentityServerApi offline_access
```

This confirms a real OAuth2/OIDC-fronted microservice architecture (`client_id=Mep`,
`x-client-SKU=ID_NET9_0`, i.e. a .NET 9 IdentityServer deployment) with at least 7 named backend
APIs behind it. Nothing about their actual request/response shape was observed - this came entirely
from the public authorization-request URL, not from any authenticated call. Whether and how any of
these are safe to test is exactly the "viability of testing login" question the team is researching
separately before this project goes further in that direction; this note exists so that research
starts from real names instead of guessing.

## Third-party integrations observed on public pages

- **NICE inContact** (`niceincontact.com`) - live chat widget + its own visitor-analytics API calls
  (`web-analytics`, `getVisitLocation`). Third-party, not HealthAdvocate's own API surface.
- **Pardot** (`pardot.healthadvocate.com`, Salesforce's marketing platform) - at least one landing
  page embeds a Pardot form via iframe. Also third-party/vendor-owned.

Both are out of scope to test directly (they belong to other companies), but worth knowing they're
there so a network-log assertion in a future test doesn't mistake their traffic for the site's own.

## What passive discovery deliberately did not do

- No login attempted, with real or fake credentials.
- No `POST`/`PUT`/`PATCH`/`DELETE` sent to any endpoint, including the publicly-listed
  `contact-form-7/v1/contact-forms` submission endpoint.
- No enumeration/fuzzing of `wp/v2` collections beyond one small, clearly-scoped `GET` to confirm the
  API responds (`?per_page=5`).
- No attempt to call any of the OIDC-scoped APIs (`HealthAdvocateApi`, `CrmApi`, etc.) - their
  existence was read from a public URL's query string, not from any authenticated probing.
