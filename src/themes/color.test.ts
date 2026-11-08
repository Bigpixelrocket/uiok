// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { contrast, firstLegible, legibleOn, rgbOf, type Hex } from './color.js';

const WHITE: Hex = '#ffffff';
const BLACK: Hex = '#000000';

describe('firstLegible', () => {
  it('picks the first candidate that keeps the ratio, skipping quieter ones that do not', () => {
    expect(firstLegible(['#cccccc', '#767676', BLACK], [WHITE], 4.5)).toBe('#767676');
  });

  it('holds the ratio on every ground, not only the first', () => {
    expect(firstLegible(['#767676', '#555555', BLACK], [WHITE, '#dddddd'], 4.5)).toBe('#555555');
  });

  it('falls back to the last candidate when none keeps the ratio, and white when there are none', () => {
    expect(firstLegible(['#eeeeee', '#dddddd'], [WHITE], 4.5)).toBe('#dddddd');
    expect(firstLegible([], [WHITE], 4.5)).toBe(WHITE);
  });
});

describe('legibleOn', () => {
  it('keeps a colour that already reads', () => {
    expect(legibleOn('#333333', [WHITE], 4.5)).toBe('#333333');
  });

  it('darkens over a light ground, keeping the hue, just far enough to reach the ratio', () => {
    const tone = legibleOn('#ff0000', [WHITE], 4.5);
    const { r, g, b } = rgbOf(tone);

    expect(contrast(tone, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tone, WHITE)).toBeLessThan(4.7);
    expect(r).toBeLessThan(255);
    expect([g, b]).toEqual([0, 0]);
  });

  it('lightens over a dark ground, judged by the first, and holds on every ground', () => {
    const grounds: Hex[] = [BLACK, '#202020'];
    const tone = legibleOn('#0000ff', grounds, 3);
    const { r, g, b } = rgbOf(tone);

    for (const ground of grounds) expect(contrast(tone, ground)).toBeGreaterThanOrEqual(3);
    expect(b).toBe(255);
    expect(r).toBeGreaterThan(0);
    expect(r).toBe(g);
  });

  it('gives black over a light ground, or white over a dark one, when no mix keeps the ratio', () => {
    expect(legibleOn('#808080', [WHITE, BLACK], 5)).toBe(BLACK);
    expect(legibleOn('#808080', [BLACK, WHITE], 5)).toBe(WHITE);
  });
});
