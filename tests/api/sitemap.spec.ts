import { test, expect } from '@playwright/test';

/**
 * Only the Yoast sitemap *index* is tested here. `/site/page-sitemap.xml` -
 * the one sub-sitemap that would actually enumerate marketing pages - is
 * known to be unreliable (504 Gateway Time-out, reproduced twice during
 * discovery; see docs/discovery/testability-notes.md). Asserting on it here
 * would make this suite flaky for a reason that has nothing to do with this
 * project's own code, so it's deliberately left out - a fact worth knowing
 * on its own, not something to silently work around.
 */
test.describe('Yoast XML sitemap', () => {
  test('the sitemap index responds and lists the expected 8 sub-sitemaps', async ({ request }) => {
    const res = await request.get('https://www.healthadvocate.com/site/sitemap_index.xml');
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('xml');

    const body = await res.text();
    const expectedSitemaps = [
      'post-sitemap.xml',
      'page-sitemap.xml',
      'attachment-sitemap.xml',
      'testimonials-sitemap.xml',
      'category-sitemap.xml',
      'post_tag-sitemap.xml',
      'testimonial_cat-sitemap.xml',
      'author-sitemap.xml',
    ];
    for (const sitemap of expectedSitemaps) {
      expect(body, `expected ${sitemap} listed in the index`).toContain(sitemap);
    }
  });
});
