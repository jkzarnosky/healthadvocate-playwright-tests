import { test, expect } from '@playwright/test';
import { TOP_LEVEL_LINKS, MEMBER_LOGIN_HEADER_LINK } from '../support/site-map';
import { headerLink } from '../support/nav-helpers';

test.describe('Header navigation - top-level links', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/site/');
  });

  for (const link of TOP_LEVEL_LINKS) {
    test(`"${link.name}" link is visible and navigates to the correct page`, async ({ page }) => {
      const locator = headerLink(page, link.name);
      await expect(locator).toBeVisible();
      await expect(locator).toHaveAttribute('href', link.href);

      await locator.click();
      await page.waitForLoadState('domcontentloaded');

      await expect(page).toHaveURL(link.href);
      await expect(page).toHaveTitle(new RegExp(link.expectedTitleContains));
    });
  }

  test('"Member Login" in the header points at the members subdomain and reaches a login page', async ({
    page,
  }) => {
    const locator = headerLink(page, MEMBER_LOGIN_HEADER_LINK.name);
    await expect(locator).toBeVisible();
    await expect(locator).toHaveAttribute('href', MEMBER_LOGIN_HEADER_LINK.href);

    await locator.click();
    await page.waitForLoadState('domcontentloaded');

    // members.healthadvocate.com bounces to identity.healthadvocate.com (a
    // separate OIDC login app) - assert on the eventual host + title rather
    // than a single fixed URL, since the redirect chain includes a
    // request-scoped OIDC "state"/nonce query string.
    await expect(page).toHaveURL(/identity\.healthadvocate\.com/);
    await expect(page).toHaveTitle(new RegExp(MEMBER_LOGIN_HEADER_LINK.expectedTitleContains));
  });
});
