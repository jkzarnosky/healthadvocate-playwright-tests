import { test, expect } from '../support/fixtures';
import { SOLUTIONS_MENU, ABOUT_US_MENU, NavParent } from '../support/site-map';
import { headerLink, headerButton, openMegaMenu } from '../support/nav-helpers';

function describeDropdown(menu: NavParent) {
  test.describe(`Header navigation - "${menu.name}" dropdown`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/site/', { waitUntil: 'load' });
    });

    test(`hovering "${menu.name}" reveals all ${menu.children.length} expected items`, async ({
      page,
    }) => {
      await openMegaMenu(page, menu.name, menu.children[0].name);
      for (const child of menu.children) {
        await expect(headerLink(page, child.name)).toBeVisible();
      }
    });

    for (const child of menu.children) {
      test(`"${menu.name}" > "${child.name}" navigates to the correct page`, async ({
        page,
        context,
      }) => {
        await openMegaMenu(page, menu.name, child.name);
        const locator = headerLink(page, child.name);
        await expect(locator).toHaveAttribute('href', child.href);

        // dispatchEvent, not a real mouse click: a real CI run showed a
        // *different* top-level menu item's own <li> (still logically
        // closed, aria-expanded="false") transiently intercepting pointer
        // events meant for this link - almost certainly the mouse's travel
        // path toward a child near a neighboring item grazing that item's
        // own flyout container. See DECISIONS.md ("Mega-menu leaf-link
        // clicks: dispatchEvent instead of a real mouse click"). Every
        // child here is a plain <a href> with no click-interception JS of
        // its own (only top-level triggers with children have that - see
        // the "Solutions" test below), so invoking its click handler
        // directly, bypassing hit-testing at pixel coordinates, tests the
        // same thing (does this link navigate correctly) without depending
        // on nothing else being in the way of the mouse.
        //
        // The Blog link carries target="_blank" - it opens a new tab rather
        // than navigating the current page. See testability-notes.md
        // ("Blog link opens a new tab"). dispatchEvent triggers a real
        // target="_blank" navigation the same as a trusted click - that's
        // native anchor behavior, not something JS-mediated.
        if (child.opensInNewTab) {
          const [popup] = await Promise.all([
            context.waitForEvent('page'),
            locator.dispatchEvent('click'),
          ]);
          await popup.waitForLoadState('domcontentloaded');
          await expect(popup).toHaveURL(new RegExp(new URL(child.href).host.replace(/\./g, '\\.')));
          await expect(popup).toHaveTitle(new RegExp(child.expectedTitleContains));
          await popup.close();
          return;
        }

        await locator.dispatchEvent('click');
        await page.waitForLoadState('domcontentloaded');

        if (child.sameOrigin) {
          await expect(page).toHaveURL(child.href);
        } else {
          await expect(page).toHaveURL(new RegExp(new URL(child.href).host.replace(/\./g, '\\.')));
        }
        await expect(page).toHaveTitle(new RegExp(child.expectedTitleContains));
      });
    }
  });
}

describeDropdown(SOLUTIONS_MENU);
describeDropdown(ABOUT_US_MENU);

test.describe('Header navigation - "Solutions" trigger itself', () => {
  test('clicking the "Solutions" label (not a submenu item) goes to the product index', async ({
    page,
  }) => {
    await page.goto('/site/', { waitUntil: 'load' });
    const locator = headerLink(page, SOLUTIONS_MENU.name);
    await expect(locator).toHaveAttribute('href', SOLUTIONS_MENU.href!);

    // Real, verified quirk (see testability-notes.md, "First click on a
    // mega-menu parent only opens it"): because "Solutions" is a top-level
    // link that also has children, the Max Mega Menu plugin intercepts the
    // FIRST click to reveal the submenu and does not follow the href. A
    // genuine second click (with the menu already open) is what actually
    // navigates - this mirrors what a real user clicking twice would see.
    await locator.click();
    const firstChildLink = headerLink(page, SOLUTIONS_MENU.children[0].name);
    await expect(firstChildLink).toBeVisible();
    await expect(page).toHaveURL('https://www.healthadvocate.com/site/');

    await locator.click();
    await page.waitForLoadState('domcontentloaded');
    await expect(page).toHaveURL(SOLUTIONS_MENU.href!);
  });

  test('"About Us" has no direct href - it only opens its dropdown', async ({ page }) => {
    await page.goto('/site/', { waitUntil: 'load' });
    // Wait for the header to be interactive before checking the button -
    // on a cold load the mega menu plugin briefly leaves the visible header
    // copy with a zero-size layout until its own init script runs (see
    // testability-notes.md, "Header takes a moment to become interactive").
    await expect(headerLink(page, 'Careers')).toBeVisible();

    const trigger = headerButton(page, ABOUT_US_MENU.name);
    await expect(trigger).toBeVisible();
    // Deliberately documenting current behavior (see testability-notes.md,
    // "About Us has no direct destination"): this is a real accessibility/UX
    // caveat, not something this suite is trying to fix.
    await expect(trigger).not.toHaveAttribute('href', /.+/);
  });
});
