# Site Map

Compiled 2026-09-15 from the live header/footer navigation, Yoast's XML sitemap index, and
`robots.txt`. This is the map the test suites are built against; see
[testability-notes.md](testability-notes.md) for why it's hand-maintained rather than generated from
`/site/page-sitemap.xml`.

## Origins involved

| Origin | Role |
|---|---|
| `www.healthadvocate.com` | WordPress marketing site (all real content lives under `/site/...`; the bare domain root reverse-proxies into the same install rather than 30x-redirecting) |
| `blog.healthadvocate.com` | Separate blog install, linked from the header, opens in a new tab |
| `members.healthadvocate.com` | Member portal entry point; immediately bounces into `identity.healthadvocate.com`'s OIDC login flow |
| `identity.healthadvocate.com` | Login app (ASP.NET IdentityServer) behind the member portal |
| `languageline.wd5.myworkdayjobs.com` | External Workday ATS, linked from Careers |
| `tp.integrityline.com` | External ethics-hotline vendor, linked from the footer |

## Header navigation (primary nav, present on every page)

```
Home                    -> /site/
Solutions               -> /site/product-index         (also a mega-menu trigger, see caveat)
  Health Advocacy & Navigation  -> /site/product-index/health-navigation
  Clinical Care Management      -> /site/product-index/clinical-care
  Mental Health & Work/Life     -> /site/product-index/emotional-health
  Wellness & Coaching           -> /site/product-index/well-being
  Health Screenings & Vaccinations -> /site/product-index/health-screenings
  Generations | Caregiver Support  -> /site/product-index/caregiver-support
  Mind & Body EAP                  -> /site/product-index/mind-body-eap
  Population Health                -> /site/product-index/population-health
About Us                -> (no href - dropdown only, see caveat)
  Our Team               -> /site/our-team
  News & Resources       -> /site/press
  Languages              -> /site/languages
  Blog                   -> https://blog.healthadvocate.com/   (opens new tab)
Consultants              -> /site/partners
Careers                  -> /site/careers
Contact                  -> /site/contact
Member Login             -> https://members.healthadvocate.com/  (-> identity.healthadvocate.com)
[search box, top right]
```

Encoded as data in [`tests/support/site-map.ts`](../../tests/support/site-map.ts), which the
navigation suites iterate over.

## Footer / page-level links (homepage)

```
Contact Us               -> /site/contact                (duplicate of header "Contact")
Member Login             -> /members  [new tab]  (4-hop redirect to the same identity.healthadvocate.com
                                                    login the header reaches directly - see caveat)
Health Advocate Privacy Statement -> /site/privacy  [new tab]
Global Ethics Hotline    -> https://tp.integrityline.com/   (external)  [new tab]
Terms of Use             -> /site/terms  [new tab]
```

Address shown: 721 Arbor Way, Suite 150, Blue Bell, PA 19422.

## Homepage in-page content links (not header/footer)

```
"Request a demo"      -> /site/demorequest
"Explore solutions"   -> /site/product-index
"Learn more" (Data & Analytics section) -> /site/data-analytics
"Award-winning healthcare blog" (badge, page bottom) -> https://blog.healthadvocate.com/  [new tab]
[Facebook, Twitter/X, LinkedIn icon links - external, not deep-tested]
```

Two rows of "solution tiles" (a heading link and a matching icon/figure link for each) repeat the
same 8 Solutions destinations already listed under the header nav, **with one exception**: the
Mind & Body EAP tile's icon links to `/site/mind-body-eap` (missing the `/product-index/` segment
the heading link and the other 7 tiles all have) - a stale pre-restructure URL. It isn't a dead
link (confirmed: `301`s to the correct `/site/product-index/mind-body-eap`), but it's the one tile
where heading and icon don't point at an identical URL. See testability-notes.md and
`tests/support/homepage-map.ts`.

## Other known top-level pages (from Yoast's sitemap / discovery, not linked from nav or homepage)

- `/site/2027brokerstrategy` (a landing page found via the WP REST API's `wp/v2/pages` listing;
  contains an embedded Pardot form - likely one of many gated/campaign landing pages not linked from
  primary nav or the homepage)

## Yoast XML sitemap index (`/site/sitemap.xml` -> `/site/sitemap_index.xml`)

8 sub-sitemaps are listed: `post-sitemap.xml`, `page-sitemap.xml` (currently 504ing - see
testability-notes.md), `attachment-sitemap.xml`, `testimonials-sitemap.xml`, `category-sitemap.xml`,
`post_tag-sitemap.xml`, `testimonial_cat-sitemap.xml`, `author-sitemap.xml`. Only
`page-sitemap.xml` would enumerate the marketing pages themselves; the rest are blog-post,
media-attachment, and taxonomy sitemaps of lower interest for UI navigation testing.

## `robots.txt` (legacy paths, not part of the current site map)

Disallows a long list of `.aspx` pages and folders that don't correspond to anything reachable from
the current WordPress nav (`/member/`, `/members/`, `/wellness/`, `/Careers.aspx`,
`/company_overview.aspx`, etc. - see testability-notes.md for what this implies about a legacy
platform on the same domain). Listed here for completeness, not as test targets: `allow: /site/` is
the only allow rule; everything else is either disallowed or simply unlisted.

## Suggested next pages to map (not yet covered)

- `/site/contact` and `/site/product-index/*` sub-pages' own in-page structure (forms, embedded
  widgets) - relevant once a suite goes beyond "does the link work" into "does the resulting page's
  content render correctly."
