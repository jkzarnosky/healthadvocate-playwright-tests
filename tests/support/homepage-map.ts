/**
 * Homepage-specific content links: CTAs, "solution tile" cards, and footer/legal
 * links. Captured 2026-09-15 the same way as site-map.ts - see
 * docs/discovery/site-map.md ("Homepage in-page content links") for how this was
 * gathered and docs/discovery/testability-notes.md for the caveats referenced
 * below. Header nav itself lives in site-map.ts; this file only covers links
 * that live in the homepage's own content.
 */

export interface ContentLink {
  name: string;
  href: string;
  expectedTitleContains: string;
  opensInNewTab?: boolean;
}

export const CTA_LINKS: ContentLink[] = [
  {
    name: 'Request a demo',
    href: 'https://www.healthadvocate.com/site/demorequest',
    expectedTitleContains: 'Demo',
  },
  {
    name: 'Explore solutions',
    href: 'https://www.healthadvocate.com/site/product-index',
    expectedTitleContains: 'Health Advocate',
  },
  {
    name: 'Learn more',
    href: 'https://www.healthadvocate.com/site/data-analytics',
    expectedTitleContains: 'Data',
  },
];

/**
 * Each "solution tile" on the homepage renders as a heading link plus a
 * separate icon/figure link. On every tile except Mind & Body EAP, both point
 * at the exact same URL. Mind & Body EAP's icon instead uses a stale,
 * pre-restructure URL that happens to 301-redirect to the same place - see
 * testability-notes.md ("A stale-but-working icon link"). iconHref is only
 * set when it genuinely differs from headingHref.
 */
export interface SolutionTile {
  name: string;
  headingHref: string;
  iconHref?: string;
  expectedTitleContains: string;
}

export const SOLUTION_TILES: SolutionTile[] = [
  {
    name: 'Generations',
    headingHref: 'https://www.healthadvocate.com/site/product-index/caregiver-support',
    expectedTitleContains: 'Caregiver Support',
  },
  {
    name: 'Population Health',
    headingHref: 'https://www.healthadvocate.com/site/product-index/population-health',
    expectedTitleContains: 'Population Health',
  },
  {
    name: 'Mind & Body EAP',
    headingHref: 'https://www.healthadvocate.com/site/product-index/mind-body-eap',
    iconHref: 'https://www.healthadvocate.com/site/mind-body-eap',
    expectedTitleContains: 'Mind Body EAP',
  },
  {
    name: 'Health Advocacy & Navigation',
    headingHref: 'https://www.healthadvocate.com/site/product-index/health-navigation',
    expectedTitleContains: 'Health Advocacy',
  },
  {
    name: 'Mental Health & Work/Life (EAP)',
    headingHref: 'https://www.healthadvocate.com/site/product-index/emotional-health',
    expectedTitleContains: 'Mental Health',
  },
  {
    name: 'Clinical Care Management',
    headingHref: 'https://www.healthadvocate.com/site/product-index/clinical-care',
    expectedTitleContains: 'Clinical Care Management',
  },
  {
    name: 'Wellness & Coaching',
    headingHref: 'https://www.healthadvocate.com/site/product-index/well-being',
    expectedTitleContains: 'Wellness',
  },
  {
    name: 'Health Screenings & Vaccinations',
    headingHref: 'https://www.healthadvocate.com/site/product-index/health-screenings',
    expectedTitleContains: 'Health Screenings',
  },
];

/**
 * The homepage's "Member Login" link (in the lower CTA/footer block) is a
 * different DOM element from the header's, and reaches the login flow via a
 * much longer redirect chain - see testability-notes.md ("Two Member Login
 * links, same destination, very different paths"). Both are expected to land
 * on the same identity.healthadvocate.com login page.
 */
export const FOOTER_MEMBER_LOGIN: ContentLink = {
  name: 'Member Login',
  href: 'https://www.healthadvocate.com/members',
  expectedTitleContains: 'Log In',
  opensInNewTab: true,
};

export const FOOTER_LEGAL_LINKS: ContentLink[] = [
  {
    name: 'Health Advocate Privacy Statement',
    href: 'https://www.healthadvocate.com/site/privacy',
    expectedTitleContains: 'Legal',
    opensInNewTab: true,
  },
  {
    name: 'Terms of Use',
    href: 'https://www.healthadvocate.com/site/terms',
    expectedTitleContains: 'Terms of Use',
    opensInNewTab: true,
  },
];

/** External - out of scope to test beyond "does it point somewhere sane."
 * `name` is the link's accessible name (from its icon's alt text - these are
 * image-only links, no visible text) used to locate it; it's not always the
 * current brand name (Twitter's icon alt text still says "Twitter", not
 * "X" - a minor, real content-staleness note, not a test bug). */
export const EXTERNAL_FOOTER_LINKS: { name: string; hrefIncludes: string }[] = [
  { name: 'Global Ethics Hotline', hrefIncludes: 'tp.integrityline.com' },
  { name: 'Facebook', hrefIncludes: 'facebook.com/healthadvocateinc' },
  { name: 'Twitter', hrefIncludes: 'twitter.com/healthadvocate' },
  { name: 'LinkedIn', hrefIncludes: 'linkedin.com/company/health-advocate' },
];

export const BLOG_BADGE_LINK: ContentLink = {
  name: 'Award-winning healthcare blog',
  href: 'https://blog.healthadvocate.com/',
  expectedTitleContains: 'Health Advocate',
  opensInNewTab: true,
};

/**
 * The homepage search box is a plain GET form (?s=query) - safe to actually
 * submit, unlike the lead-gen contact form (see testability-notes.md, "No
 * staging environment") - and WordPress titles the results page "You
 * searched for <query>". Not currently used by a test: the box isn't
 * reachable at the desktop viewport this suite runs at (see
 * testability-notes.md, "The search box isn't reachable at a desktop
 * viewport") - kept here as the reference for a future mobile-viewport
 * search test.
 */
export const SEARCH = {
  query: 'wellness',
  expectedTitleContains: 'You searched for wellness',
};
