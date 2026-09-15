import { test as base, expect } from '@playwright/test';

/**
 * The homepage runs Revolution Slider (`sr6`), an auto-rotating hero
 * carousel built from custom elements (`rs-module-wrap`, `rs-slide`, etc.).
 * During a slide transition it can spawn an `rs-mask-wrap` element that
 * intercepts pointer events on whatever's underneath it - confirmed via a
 * real CI trace, where a header hover ended up hitting
 * "<rs-mask-wrap>...</rs-mask-wrap> ... intercepts pointer events" instead
 * of the menu item. Unlike the mega-menu race fixed in nav-helpers.ts (a
 * one-time animation that settles), the carousel keeps auto-rotating for as
 * long as a test is on the page, so no amount of waiting reliably avoids it.
 * See DECISIONS.md ("Neutralize Revolution Slider's pointer-event
 * interference in tests").
 *
 * Every spec imports `test`/`expect` from here instead of directly from
 * `@playwright/test`, so this applies automatically everywhere - including
 * pages this project doesn't yet have a spec for, in case the carousel (or
 * something like it) shows up there too. `addInitScript` re-runs on every
 * navigation within the test, not just the first `page.goto()`.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await page.addInitScript(() => {
      const style = document.createElement('style');
      style.textContent = `
        rs-module-wrap, rs-mask-wrap { pointer-events: none !important; }
      `;
      document.documentElement.appendChild(style);
    });
    await use(page);
  },
});

export { expect };
