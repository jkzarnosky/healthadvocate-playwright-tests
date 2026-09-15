import { test, expect } from '@playwright/test';

/**
 * The header search box exists in the DOM on every page load but is
 * positioned off-screen (not just visually hidden) at the desktop viewport
 * this project's suite runs at - it never becomes reachable without first
 * triggering the mobile hamburger menu. See testability-notes.md ("The
 * search box isn't reachable at a desktop viewport"). This checks the form
 * itself is configured the way a real search actually needs (a safe, GET-
 * based WordPress search - see docs/discovery/api-notes.md) rather than
 * simulating a UI interaction that isn't genuinely available here. A mobile-
 * viewport interactive search test is a reasonable future addition.
 */
test.describe('Homepage - search form (structural)', () => {
  test('the search form is a GET request to the expected endpoint with an "s" field', async ({
    page,
  }) => {
    await page.goto('/site/');

    const searchInput = page.locator('input[placeholder="Search..."]');
    await expect(searchInput).toHaveCount(1);
    await expect(searchInput).toHaveAttribute('name', 's');

    const form = page.locator('form').filter({ has: searchInput });
    await expect(form).toHaveAttribute('method', /get/i);
    await expect(form).toHaveAttribute('action', 'https://www.healthadvocate.com/site/');
  });
});
