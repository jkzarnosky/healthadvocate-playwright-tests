import { test, expect } from '../support/fixtures';
import {
  CTA_LINKS,
  SOLUTION_TILES,
  FOOTER_MEMBER_LOGIN,
  FOOTER_LEGAL_LINKS,
  EXTERNAL_FOOTER_LINKS,
  BLOG_BADGE_LINK,
} from '../support/homepage-map';
import { tileLink, tileHeadingLink, visibleLinksWithHref, footerLink } from '../support/locators';

test.describe('Homepage - call-to-action links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/site/');
  });

  for (const link of CTA_LINKS) {
    test(`"${link.name}" navigates to the correct page`, async ({ page }) => {
      const locator = tileLink(page, link.name);
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveAttribute('href', link.href);

      await locator.click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(link.href);
      await expect(page).toHaveTitle(new RegExp(link.expectedTitleContains));
    });
  }
});

test.describe('Homepage - solution tiles', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/site/');
  });

  for (const tile of SOLUTION_TILES) {
    test(`"${tile.name}" heading link navigates to the correct page`, async ({ page }) => {
      const locator = tileHeadingLink(page, tile.name);
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveAttribute('href', tile.headingHref);

      await locator.click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(tile.headingHref);
      await expect(page).toHaveTitle(new RegExp(tile.expectedTitleContains));
    });

    if (tile.iconHref) {
      // Mind & Body EAP only: its icon link uses a stale, pre-restructure URL
      // that still works via a 301 redirect - see homepage-map.ts and
      // testability-notes.md. Verified separately from the heading link
      // above, since the two now point at different (if equivalent) URLs.
      test(`"${tile.name}" icon link uses a different (but redirecting) URL than the heading`, async ({
        page,
      }) => {
        await expect(visibleLinksWithHref(page, tile.iconHref!)).toHaveCount(1);

        await page.goto(tile.iconHref!);
        await page.waitForLoadState('domcontentloaded');
        await expect(page).toHaveURL(tile.headingHref);
        await expect(page).toHaveTitle(new RegExp(tile.expectedTitleContains));
      });
    } else {
      test(`"${tile.name}" icon link points at the same URL as the heading`, async ({ page }) => {
        // The heading link found above, plus its accompanying icon/figure
        // link, both visible and pointing at the same href - not asserting
        // an exact count beyond "at least these two", since the site
        // duplicates whole content sections for responsive breakpoints and
        // exactly how many hidden duplicates share this href isn't the
        // point of this test (see testability-notes.md).
        const count = await visibleLinksWithHref(page, tile.headingHref).count();
        expect(count).toBeGreaterThanOrEqual(2);
      });
    }
  }
});

test.describe('Homepage - footer / legal links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/site/');
  });

  test('"Member Login" (footer) opens a new tab and reaches the same login page as the header link', async ({
    page,
    context,
  }) => {
    const locator = footerLink(page, FOOTER_MEMBER_LOGIN.name);
    await locator.scrollIntoViewIfNeeded();
    await expect(locator).toHaveAttribute('href', FOOTER_MEMBER_LOGIN.href);

    const [popup] = await Promise.all([context.waitForEvent('page'), locator.click()]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(/identity\.healthadvocate\.com/, { timeout: 30_000 });
    await expect(popup).toHaveTitle(new RegExp(FOOTER_MEMBER_LOGIN.expectedTitleContains));
    await popup.close();
  });

  for (const link of FOOTER_LEGAL_LINKS) {
    test(`"${link.name}" opens a new tab with the correct page`, async ({ page, context }) => {
      const locator = footerLink(page, link.name);
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveAttribute('href', link.href);

      const [popup] = await Promise.all([context.waitForEvent('page'), locator.click()]);
      await popup.waitForLoadState('domcontentloaded');
      await expect(popup).toHaveURL(link.href);
      await expect(popup).toHaveTitle(new RegExp(link.expectedTitleContains));
      await popup.close();
    });
  }

  for (const link of EXTERNAL_FOOTER_LINKS) {
    test(`"${link.name}" link points at the expected external site (not navigated)`, async ({
      page,
    }) => {
      const locator = footerLink(page, link.name);
      await locator.scrollIntoViewIfNeeded();
      await expect(locator).toHaveAttribute('href', new RegExp(link.hrefIncludes.replace(/\./g, '\\.')));
    });
  }

  test(`"${BLOG_BADGE_LINK.name}" badge opens the blog in a new tab`, async ({ page, context }) => {
    const locator = footerLink(page, BLOG_BADGE_LINK.name);
    await locator.scrollIntoViewIfNeeded();
    await expect(locator).toHaveAttribute('href', BLOG_BADGE_LINK.href);

    const [popup] = await Promise.all([context.waitForEvent('page'), locator.click()]);
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup).toHaveURL(new RegExp(new URL(BLOG_BADGE_LINK.href).host.replace(/\./g, '\\.')));
    await popup.close();
  });
});
