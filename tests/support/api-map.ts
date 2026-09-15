/**
 * Known, verified behavior of the public WordPress REST API - see
 * docs/discovery/api-notes.md for how this was discovered and the scope
 * boundary (GET-only, nothing state-changing, nothing authenticated).
 * Re-verified directly (via curl-equivalent fetch calls) before writing
 * assertions against it, not assumed from the discovery notes alone -
 * one assumption from discovery (that contact-form-7's contact-forms list
 * endpoint was publicly readable because it's *listed* in the root index)
 * turned out to be wrong: it actually 403s. See the note on
 * CONTACT_FORMS_ENDPOINT below.
 */

export const WP_JSON_ROOT = 'https://www.healthadvocate.com/site/wp-json/';

export const EXPECTED_SITE_NAME = 'Health Advocate';

/** A representative sample of namespaces every response from WP_JSON_ROOT
 * should advertise - not the full list (see api-notes.md), just enough to
 * catch a real regression (e.g. a plugin being removed) without the test
 * being an exact, brittle copy of the entire namespaces array. */
export const EXPECTED_NAMESPACES = ['wp/v2', 'contact-form-7/v1', 'yoast/v1', 'oembed/1.0'];

export interface KnownPage {
  slug: string;
  expectedTitle: string;
  expectedLink: string;
}

export const KNOWN_PAGES: KnownPage[] = [
  {
    slug: 'careers',
    expectedTitle: 'Careers',
    expectedLink: 'https://www.healthadvocate.com/site/careers',
  },
  {
    slug: 'contact',
    expectedTitle: 'Contact',
    expectedLink: 'https://www.healthadvocate.com/site/contact',
  },
];

/**
 * `GET /wp-json/contact-form-7/v1/contact-forms` is listed as a public route
 * in the wp-json root index's `namespaces`/`routes` metadata, which is what
 * api-notes.md's discovery pass assumed meant it was safely readable. Calling
 * it (still just a GET - no state changed) showed that assumption was wrong:
 * it actually returns 403 with `wpcf7_forbidden`. Being listed in the route
 * index means the route exists, not that it's open - a real, useful
 * distinction, tested here as a contract check (if this ever starts
 * returning 200, that's a meaningful permissions change worth knowing about).
 */
export const CONTACT_FORMS_ENDPOINT =
  'https://www.healthadvocate.com/site/wp-json/contact-form-7/v1/contact-forms';
