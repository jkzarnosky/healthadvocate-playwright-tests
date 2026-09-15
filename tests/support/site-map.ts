/**
 * Known structure of the primary header navigation, captured by manual discovery
 * on 2026-09-15 (see docs/discovery/site-map.md for how this was gathered and
 * docs/discovery/testability-notes.md for the caveats referenced below).
 *
 * This is hand-maintained, not scraped at test time: the site has no reliable
 * machine-readable nav source (the WP REST API exposes page content but not menu
 * structure, and /site/page-sitemap.xml was flaky in discovery — see testability
 * notes). Update this file when the live header changes.
 */

export interface NavLink {
  /** Accessible name of the link, as rendered in the header. */
  name: string;
  /** Absolute URL the link points to. */
  href: string;
  /** Substring expected in the resulting page's <title> once navigation completes. */
  expectedTitleContains: string;
  /** Same origin as www.healthadvocate.com? Cross-origin destinations (blog, member
   * portal) get lighter verification since they're a different application/team. */
  sameOrigin: boolean;
  /** True if the link carries target="_blank" (opens in a new tab). Currently only
   * the About Us > Blog link. See testability-notes.md ("Blog link opens a new tab"). */
  opensInNewTab?: boolean;
}

export interface NavParent {
  /** Accessible name of the top-level trigger (link or button). */
  name: string;
  /** True if the trigger itself navigates (Solutions); false if it's JS-only (About Us). */
  isLink: boolean;
  href?: string;
  children: NavLink[];
}

export const TOP_LEVEL_LINKS: NavLink[] = [
  {
    name: 'Home',
    href: 'https://www.healthadvocate.com/site/',
    expectedTitleContains: 'Health Advocate',
    sameOrigin: true,
  },
  {
    name: 'Consultants',
    href: 'https://www.healthadvocate.com/site/partners',
    expectedTitleContains: 'Partnership',
    sameOrigin: true,
  },
  {
    name: 'Careers',
    href: 'https://www.healthadvocate.com/site/careers',
    expectedTitleContains: 'Careers',
    sameOrigin: true,
  },
  {
    name: 'Contact',
    href: 'https://www.healthadvocate.com/site/contact',
    expectedTitleContains: 'Contact',
    sameOrigin: true,
  },
];

/**
 * Member Login is intentionally excluded from TOP_LEVEL_LINKS and covered in its
 * own spec: it crosses two origin hops in production (healthadvocate.com ->
 * members.healthadvocate.com -> identity.healthadvocate.com) and the header
 * itself contains a second "Member Login" link (in the footer CTA block) that
 * points at a different, same-origin path (/members) instead of the members
 * subdomain. See testability-notes.md "Two different Member Login destinations".
 */
export const MEMBER_LOGIN_HEADER_LINK: NavLink = {
  name: 'Member Login',
  href: 'https://members.healthadvocate.com/',
  expectedTitleContains: 'Log In',
  sameOrigin: false,
};

export const SOLUTIONS_MENU: NavParent = {
  name: 'Solutions',
  isLink: true,
  href: 'https://www.healthadvocate.com/site/product-index',
  children: [
    {
      name: 'Health Advocacy & Navigation',
      href: 'https://www.healthadvocate.com/site/product-index/health-navigation',
      expectedTitleContains: 'Health Advocacy',
      sameOrigin: true,
    },
    {
      name: 'Clinical Care Management',
      href: 'https://www.healthadvocate.com/site/product-index/clinical-care',
      expectedTitleContains: 'Clinical Care Management',
      sameOrigin: true,
    },
    {
      name: 'Mental Health & Work/Life',
      href: 'https://www.healthadvocate.com/site/product-index/emotional-health',
      expectedTitleContains: 'Mental Health',
      sameOrigin: true,
    },
    {
      name: 'Wellness & Coaching',
      href: 'https://www.healthadvocate.com/site/product-index/well-being',
      expectedTitleContains: 'Wellness',
      sameOrigin: true,
    },
    {
      name: 'Health Screenings & Vaccinations',
      href: 'https://www.healthadvocate.com/site/product-index/health-screenings',
      expectedTitleContains: 'Health Screenings',
      sameOrigin: true,
    },
    {
      name: 'Generations | Caregiver Support',
      href: 'https://www.healthadvocate.com/site/product-index/caregiver-support',
      expectedTitleContains: 'Caregiver Support',
      sameOrigin: true,
    },
    {
      name: 'Mind & Body EAP',
      href: 'https://www.healthadvocate.com/site/product-index/mind-body-eap',
      expectedTitleContains: 'Mind Body EAP',
      sameOrigin: true,
    },
    {
      name: 'Population Health',
      href: 'https://www.healthadvocate.com/site/product-index/population-health',
      expectedTitleContains: 'Population Health',
      sameOrigin: true,
    },
  ],
};

export const ABOUT_US_MENU: NavParent = {
  name: 'About Us',
  isLink: false,
  children: [
    {
      name: 'Our Team',
      href: 'https://www.healthadvocate.com/site/our-team',
      expectedTitleContains: 'Our Team',
      sameOrigin: true,
    },
    {
      name: 'News & Resources',
      href: 'https://www.healthadvocate.com/site/press',
      expectedTitleContains: 'News',
      sameOrigin: true,
    },
    {
      name: 'Languages',
      href: 'https://www.healthadvocate.com/site/languages',
      expectedTitleContains: 'Languages',
      sameOrigin: true,
    },
    {
      name: 'Blog',
      href: 'https://blog.healthadvocate.com/',
      expectedTitleContains: 'Health Advocate',
      sameOrigin: false,
      opensInNewTab: true,
    },
  ],
};
