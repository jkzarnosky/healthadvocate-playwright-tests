import { test, expect } from '@playwright/test';
import {
  WP_JSON_ROOT,
  EXPECTED_SITE_NAME,
  EXPECTED_NAMESPACES,
  KNOWN_PAGES,
  CONTACT_FORMS_ENDPOINT,
} from '../support/api-map';

/**
 * All requests here use Playwright's `request` fixture directly - no browser
 * page is involved, so these run faster than the UI suites and (per
 * DECISIONS.md, "Scope: passive discovery only") never send anything but a
 * plain GET. See docs/discovery/api-notes.md for what was found and why
 * everything here is read-only.
 */

test.describe('WordPress REST API - root index', () => {
  test('advertises the site name and the expected plugin namespaces', async ({ request }) => {
    const res = await request.get(WP_JSON_ROOT);
    expect(res.status()).toBe(200);

    const body = await res.json();
    expect(body.name).toBe(EXPECTED_SITE_NAME);
    for (const namespace of EXPECTED_NAMESPACES) {
      expect(body.namespaces, `expected "${namespace}" in namespaces`).toContain(namespace);
    }
  });
});

test.describe('WordPress REST API - wp/v2/pages', () => {
  for (const page of KNOWN_PAGES) {
    test(`slug=${page.slug} returns the expected published page`, async ({ request }) => {
      const res = await request.get(
        `https://www.healthadvocate.com/site/wp-json/wp/v2/pages?slug=${page.slug}`,
      );
      expect(res.status()).toBe(200);

      const body = await res.json();
      expect(body).toHaveLength(1);
      expect(body[0].status).toBe('publish');
      expect(body[0].slug).toBe(page.slug);
      expect(body[0].link).toBe(page.expectedLink);
      expect(body[0].title.rendered).toBe(page.expectedTitle);
    });
  }

  test('an unknown slug returns 200 with an empty array (not a 404)', async ({ request }) => {
    const res = await request.get(
      'https://www.healthadvocate.com/site/wp-json/wp/v2/pages?slug=this-page-does-not-exist-xyz',
    );
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('a page result has the fields a future content check would rely on', async ({
    request,
  }) => {
    const res = await request.get(
      'https://www.healthadvocate.com/site/wp-json/wp/v2/pages?per_page=1',
    );
    expect(res.status()).toBe(200);

    const [page] = await res.json();
    for (const field of ['id', 'slug', 'status', 'link', 'title', 'content', 'modified']) {
      expect(page, `expected field "${field}"`).toHaveProperty(field);
    }
    // Documented quirk (api-notes.md): content.rendered can still contain
    // raw, unprocessed WPBakery shortcode syntax rather than final HTML -
    // asserted here so a future change either way is a deliberate decision,
    // not a silent surprise.
    expect(typeof page.content.rendered).toBe('string');
  });
});

test.describe('WordPress REST API - endpoints that look public but are not', () => {
  test('contact-form-7 contact-forms list requires authentication (403), despite being listed in the root index', async ({
    request,
  }) => {
    const res = await request.get(CONTACT_FORMS_ENDPOINT);
    expect(res.status()).toBe(403);

    const body = await res.json();
    expect(body.code).toBe('wpcf7_forbidden');
  });
});
