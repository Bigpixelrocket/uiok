import { describe, expect, it } from 'vitest';

import {
  DISTINCT_SLICE_FILLS,
  PIE_TAG_REACH,
  pieArcs,
  pieFills,
  pieTags,
  pieTagBox,
  PIE_TAG_CLEAR,
  PIE_TAG_CLEAR_ABOVE,
  type PieTag,
  type PieTagBox,
  sliceFill,
  type SliceFill
} from './Pie.logic.js';

describe('pieArcs', () => {
  it('shares the circle among the slices clockwise, leaving out empty ones', () => {
    const arcs = pieArcs(
      [
        { label: 'a', value: 3 },
        { label: 'none', value: 0 },
        { label: 'b', value: 1 }
      ],
      10
    );

    expect(arcs.map((arc) => [arc.label, arc.share])).toEqual([
      ['a', 0.75],
      ['b', 0.25]
    ]);
    // The larger slice takes the long way round.
    expect(arcs[0]?.path).toContain(' 0 1 1 ');
    expect(arcs[1]?.path).toContain(' 0 0 1 ');
  });

  it('draws a lone slice as the whole circle', () => {
    expect(pieArcs([{ label: 'all', value: 2 }], 10)[0]?.path).toBe(
      'M 0 -10 A 10 10 0 1 1 0 10 A 10 10 0 1 1 0 -10 Z'
    );
  });

  it('tags each slice at its middle outside the rim, moving a tag only where it would crowd', () => {
    const arcs = pieArcs(
      [
        { label: 'half', value: 50 },
        { label: 'a', value: 1 },
        { label: 'b', value: 1 },
        { label: 'rest', value: 48 }
      ],
      50
    );
    const [half, a, b, rest] = pieTags(arcs, 50);
    const reach = (tag: { x: number; y: number }) => Math.hypot(tag.x, tag.y);
    const turnOf = (tag: { x: number; y: number }) =>
      (Math.atan2(tag.x, -tag.y) / (2 * Math.PI) + 1) % 1;

    // The first half's middle is three o'clock: its tag runs right.
    expect(half?.anchor).toBe('start');
    expect(half?.x).toBeCloseTo(50 + PIE_TAG_REACH);
    expect(half?.textX).toBeCloseTo(50 + PIE_TAG_REACH + 2);
    expect(half?.fromX).toBeCloseTo(50);
    expect(half?.text).toBe('1');
    // Two thin slices side by side at six o'clock: their tags spread a
    // little apart along the first ring until their numbers are clear.
    expect(reach(a!)).toBeCloseTo(50 + PIE_TAG_REACH);
    expect(reach(b!)).toBeCloseTo(50 + PIE_TAG_REACH);
    expect(turnOf(a!)).toBeLessThan(arcs[1]!.middle);
    expect(turnOf(b!)).toBeGreaterThan(arcs[2]!.middle);
    expect(apart(pieTagBox(a!), pieTagBox(b!))).toBe(true);
    expect(rest?.anchor).toBe('end');
  });

  /** Whether two boxes keep their clearance: side by side, or one above the other. */
  const apart = (a: PieTagBox, b: PieTagBox): boolean =>
    Math.max(b.left - a.right, a.left - b.right) >= PIE_TAG_CLEAR - 1e-6 ||
    Math.max(b.top - a.bottom, a.top - b.bottom) >= PIE_TAG_CLEAR_ABOVE - 1e-6;

  const crosses = (a: PieTag, b: PieTag): boolean => {
    const side = (p: PieTag, x: number, y: number) =>
      Math.sign((p.x - p.fromX) * (y - p.fromY) - (p.y - p.fromY) * (x - p.fromX));

    return (
      side(a, b.fromX, b.fromY) * side(a, b.x, b.y) < 0 &&
      side(b, a.fromX, a.fromY) * side(b, a.x, a.y) < 0
    );
  };

  /**
   * Places the tags and checks no two numbers touch and no two leaders
   * cross; `placedAtLeast` is the share that must find a place (all by default).
   */
  const expectClear = (values: readonly number[], r: number, placedAtLeast = 1): void => {
    const arcs = pieArcs(
      values.map((value, at) => ({ label: String(at), value })),
      r
    );
    const all = pieTags(arcs, r);
    const tags = all.filter((tag): tag is PieTag => tag !== null);

    expect(tags.length / all.length, `placed of ${values.length} at r ${r}`).toBeGreaterThanOrEqual(
      placedAtLeast
    );
    tags.forEach((tag, at) => {
      // A leader leaves the rim outward, never back across the pie.
      expect(
        tag.fromX * (tag.x - tag.fromX) + tag.fromY * (tag.y - tag.fromY)
      ).toBeGreaterThanOrEqual(-1e-6);
      tags.slice(at + 1).forEach((other) => {
        const label = `tags ${tag.text} and ${other.text} of ${values.length} at r ${r}`;

        expect(apart(pieTagBox(tag), pieTagBox(other)), label).toBe(true);
        expect(crosses(tag, other), label).toBe(false);
      });
    });
  };

  it('keeps the last tag and the first apart round the circle', () => {
    // The twelve-slice demo: thin first and last slices meet at twelve o'clock.
    expectClear([4, 9, 14, 6, 11, 16, 8, 13, 5, 10, 15, 7], 60);
    expectClear([1, 30, 30, 30, 1], 60);
  });

  it('keeps two thin one-figure tags from reading as one number', () => {
    // Rows of rising price: the first slices are slivers side by side.
    expectClear(
      Array.from({ length: 25 }, (_, at) => (at < 5 ? 0.2 + at * 0.1 : 3 + at)),
      90
    );
  });

  it('keeps every tag clear for any count up to the legend’s limit', () => {
    let seed = 7;
    const random = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };

    for (let count = 9; count <= 24; count++) {
      for (const r of [50, 90, 160]) {
        // Shares of one size and another: every tag finds a place.
        expectClear(
          Array.from({ length: count }, () => 1 + random() * 20),
          r
        );
        // Runs of four slivers between large slices, two runs meeting
        // round the circle: the rare tag with no clear place is left to the
        // legend, and the rest still never touch.
        expectClear(
          Array.from({ length: count }, (_, at) =>
            at % 6 < 4 ? 0.05 + random() : 20 + random() * 40
          ),
          r,
          0.8
        );
      }
    }
  });
});

describe('pieFills', () => {
  const key = (fill: SliceFill): string => `${fill.hue}:${fill.hatch}`;
  const range = (count: number): number[] => Array.from({ length: count }, (_, at) => at);

  it('draws the first eight slices solid in the eight series colours', () => {
    expect(pieFills(range(8))).toEqual(range(8).map((hue) => ({ hue, hatch: 'solid' })));
  });

  it('gives each of the first 24 slices, and so each legend swatch, a fill of its own', () => {
    const fills = pieFills(range(DISTINCT_SLICE_FILLS)).map(key);

    expect(DISTINCT_SLICE_FILLS).toBe(24);
    expect(new Set(fills).size).toBe(24);
    expect(fills[8]).toBe('0:hatch');
    expect(fills[16]).toBe('0:cross');
  });

  it('never gives two neighbouring slices, round the circle too, the same fill', () => {
    for (let count = 2; count <= 60; count++) {
      const fills = pieFills(range(count)).map(key);

      fills.forEach((fill, at) => {
        expect(fill, `${count} slices, slice ${at + 1}`).not.toBe(fills[(at + 1) % count]);
      });
    }
  });

  it('keeps the fill of its place for a slice after one of nothing', () => {
    expect(pieFills([0, 8, 9]).map(key)).toEqual(['0:solid', '0:hatch', '1:hatch']);
    expect(pieFills([0, 24]).map(key)).toEqual(['0:solid', '0:hatch']);
    expect(sliceFill(25)).toEqual({ hue: 1, hatch: 'solid' });
  });
});
