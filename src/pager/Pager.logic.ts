/*
 * The pages of a long list and the page numbers its `Pager` offers: every
 * page while there are fewer than `SHOW_ALL_PAGES`, else the first and last
 * five, a page every twentieth of the way, every page within ten of the
 * current one, and pages at doubling distances from it.
 */

/** Below this many pages the selector lists every one. */
const SHOW_ALL_PAGES = 200;
/** Pages always listed at either end of a long list. */
const SLICE = 5;
/** The long list is crossed in this many even steps. */
const STEPS = 20;
/** Pages listed one by one either side of the current page. */
const RANGE = 10;

/** How many pages `count` items take at `size` a page; never fewer than one. */
export const pageCount = (count: number, size: number): number =>
  Math.max(1, Math.ceil(count / Math.max(1, size)));

/** `page` (from 0) held inside a list of `pages` pages. */
export const clampPage = (page: number, pages: number): number =>
  Math.min(Math.max(0, Math.floor(page)), Math.max(0, pages - 1));

/** The items of `page` (from 0), `size` a page. */
export const pageSlice = <T>(items: readonly T[], page: number, size: number): readonly T[] => {
  const at = clampPage(page, pageCount(items.length, size)) * size;

  return items.slice(at, at + size);
};

/** The page (from 0) that holds the item at `index`, `size` a page. */
export const pageOf = (index: number, size: number): number =>
  Math.floor(Math.max(0, index) / Math.max(1, size));

/**
 * The page numbers (from 1) the selector lists for `pages` pages while
 * `current` (from 1) is shown, in order, each once.
 */
export function selectorPages(pages: number, current: number): readonly number[] {
  if (pages < SHOW_ALL_PAGES) return Array.from({ length: pages }, (_, index) => index + 1);

  const listed = new Set<number>();
  const last = pages - SLICE;
  const increment = Math.floor(pages / STEPS);

  for (let page = 1; page <= SLICE; page += 1) listed.add(page);
  for (let page = last; page <= pages; page += 1) listed.add(page);

  // Even steps across the list, every page once they come near the current one.
  let page = SLICE;
  let near = false;
  while (page <= last) {
    if (page >= current - RANGE && page <= current + RANGE) {
      page += 1;
      near = true;
    } else {
      page += increment;
      if (page > current - RANGE && !near) page = current - RANGE;
    }
    if (page > 0 && page <= last) listed.add(page);
  }

  // Pages at doubling distances either side of the current one.
  for (let distance = 2; current + distance <= last; distance *= 2) listed.add(current + distance);
  for (let distance = 2; current - distance > 0; distance *= 2) listed.add(current - distance);

  listed.add(current);

  return [...listed].filter((entry) => entry >= 1 && entry <= pages).sort((a, b) => a - b);
}
