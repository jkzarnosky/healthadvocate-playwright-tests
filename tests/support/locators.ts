import { Page, Locator } from '@playwright/test';

/** Escapes a string for use inside a RegExp, then anchors it to match the
 * whole (trimmed) text of an element - avoids accidental substring matches
 * (e.g. "Solutions" matching inside "Explore Solutions"). */
export function exactTextRegex(name: string): RegExp {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^\\s*${escaped}\\s*$`);
}

/**
 * Locates a visible link by its exact text, anywhere on the page. Several
 * homepage content links (e.g. "Population Health", "Clinical Care
 * Management") share exact text with a header mega-menu item of the same
 * name - but the header's dropdown children stay hidden (zero size) unless
 * their parent is hovered (see testability-notes.md), so filtering to
 * `:visible` is enough to land on the homepage's own link without ever
 * hovering the header. Same trick nav-helpers.ts uses for header links.
 */
export function visibleLink(page: Page, name: string): Locator {
  return page.locator('a:visible', { hasText: exactTextRegex(name) });
}

/**
 * Locates a visible link by its accessible name (role=link), for homepage
 * content links. Unlike visibleLink() above (raw textContent + regex), this
 * uses getByRole, which normalizes internal whitespace - several homepage
 * "solution tile" headings render with a literal line break inside the link
 * (e.g. "Mental Health<br>& Work/Life (EAP)"), which a naive single-space
 * regex misses. It's also needed because the site duplicates whole content
 * sections for responsive breakpoints (not just the header - see
 * testability-notes.md, "The homepage duplicates whole content sections,
 * not just the header"): several tiles have TWO on-page copies (plus the
 * header's own hidden dropdown copy for tiles that are also Solutions menu
 * items), and only one is ever genuinely visible at the desktop viewport
 * this project tests at.
 */
export function tileLink(page: Page, name: string): Locator {
  return page.getByRole('link', { name, exact: true }).and(page.locator(':visible'));
}

/**
 * Same as tileLink(), but for a solution tile's *heading* link specifically.
 * On some tiles (Clinical Care Management, Health Screenings & Vaccinations)
 * the accompanying icon/figure link's image has alt text identical to the
 * tile name, so tileLink() alone matches both and throws a strict-mode
 * error. The icon link is always wrapped in WPBakery's
 * `vc_single_image-wrapper` class; the heading link never is - excluding it
 * disambiguates without needing a name that happens to differ.
 */
export function tileHeadingLink(page: Page, name: string): Locator {
  return tileLink(page, name).and(page.locator(':not(.vc_single_image-wrapper)'));
}

/** Counts visible links with a given href - used to verify a solution
 * tile's heading link and icon/figure link point at the same place (see
 * testability-notes.md). Excludes the header's own (hidden) copies and any
 * responsive-duplicate content that isn't visible at the current viewport,
 * for the same reason tileLink() needs `:visible` filtering. */
export function visibleLinksWithHref(page: Page, href: string): Locator {
  return page.locator(`a[href="${href}"]`).and(page.locator(':visible'));
}

/**
 * Locates a link by accessible name, scoped to the real <footer id="wp-footer">
 * element. Needed because the header (always present/visible on every page)
 * carries its own "Member Login" link with the exact same accessible name as
 * the footer's - without scoping to <footer>, a plain page-wide lookup hits
 * Playwright's strict-mode "2 elements matched" error instead of a
 * not-found. See testability-notes.md ("Two 'Member Login' links").
 */
export function footerLink(page: Page, name: string): Locator {
  return page.locator('footer').getByRole('link', { name, exact: true }).and(page.locator(':visible'));
}
