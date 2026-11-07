import { describe, expect, it } from 'vitest';

import { clampPage, pageCount, pageOf, pageSlice, selectorPages } from './Pager.logic.js';

describe('the pages of a list', () => {
  it('counts pages, keeps a page inside them, and slices it', () => {
    expect(pageCount(0, 50)).toBe(1);
    expect(pageCount(101, 50)).toBe(3);
    expect(clampPage(9, 3)).toBe(2);
    expect(clampPage(-1, 3)).toBe(0);
    expect(pageSlice(['a', 'b', 'c', 'd', 'e'], 1, 2)).toEqual(['c', 'd']);
    expect(pageSlice(['a', 'b', 'c'], 7, 2)).toEqual(['c']);
    expect(pageOf(4, 2)).toBe(2);
  });
});

describe('selectorPages', () => {
  it('lists every page of a short run', () => {
    expect(selectorPages(4, 2)).toEqual([1, 2, 3, 4]);
  });

  it('samples a long run: both ends, even steps, the pages near the current one, and doubling distances', () => {
    const pages = selectorPages(1000, 500);

    expect(pages.slice(0, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(pages.slice(-6)).toEqual([995, 996, 997, 998, 999, 1000]);
    for (let page = 490; page <= 510; page += 1) expect(pages).toContain(page);
    expect(pages).toEqual(
      expect.arrayContaining([502, 504, 508, 516, 532, 564, 628, 756, 244, 372])
    );
    expect(pages).toContain(55);
    expect(new Set(pages).size).toBe(pages.length);
    expect([...pages].sort((a, b) => a - b)).toEqual(pages);
    expect(pages.length).toBeLessThan(120);
  });
});
