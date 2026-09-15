import { Page, Locator, expect } from '@playwright/test';

function exactTextRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`);
}

/**
 * The Max Mega Menu plugin renders the header markup twice in the DOM (a
 * default header and a sticky-on-scroll clone with identical link text and
 * identical classes: "mega-menu-link" is shared by every menu item, so it
 * can't be used to disambiguate either). Only one copy is visible at a time,
 * and which one is first in DOM order is not guaranteed to be the visible
 * one. See docs/discovery/testability-notes.md ("Duplicate header markup").
 *
 * Always resolve header links through this helper instead of
 * page.getByRole('link', { name }) directly, or Playwright's strict mode
 * will throw on more than one match.
 */
export function headerLink(page: Page, name: string): Locator {
  return page.locator('header a:visible', { hasText: exactTextRegex(name) });
}

/**
 * "About Us" is not a real <button> element - it's an <a class="mega-menu-link"
 * role="button"> with no href, so a CSS tag selector like "header button" never
 * matches it. Use an ARIA role locator (which resolves computed role, not tag
 * name) instead. See testability-notes.md ("About Us" is an <a role="button">).
 */
export function headerButton(page: Page, name: string): Locator {
  return page
    .locator('header')
    .getByRole('button', { name, exact: true })
    .and(page.locator(':visible'));
}

/**
 * Mega-menu submenu items exist in the DOM at all times (not lazily rendered)
 * but are only visible/interactable after the parent trigger is hovered, via
 * a hoverIntent-driven CSS/JS reveal. A plain .click() on a child link fails
 * Playwright's actionability check because the element starts out with zero
 * size. Hover the trigger first and wait for a child to become visible.
 */
export async function openMegaMenu(page: Page, triggerName: string, sampleChildName: string) {
  const trigger = page
    .locator('header a:visible, header button:visible', { hasText: exactTextRegex(triggerName) })
    .first();
  await trigger.hover();
  const sampleChild = page.locator('header a:visible', { hasText: exactTextRegex(sampleChildName) });
  await expect(sampleChild).toBeVisible();
}
