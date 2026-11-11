import { describe, expect, it } from 'vitest';

import {
  DISTINCT_SLICE_FILLS,
  PIE_TAG_REACH,
  pieArcs,
  pieFills,
  pieTags,
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

  it('tags each slice at its middle outside the rim, a ring further out where it would crowd', () => {
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

    // The first half's middle is three o'clock: its tag runs right.
    expect(half?.anchor).toBe('start');
    expect(half?.x).toBeCloseTo(50 + PIE_TAG_REACH);
    expect(half?.fromX).toBeCloseTo(50);
    // Two thin slices side by side at six o'clock: the second steps out.
    expect(reach(a!)).toBeCloseTo(50 + PIE_TAG_REACH);
    expect(reach(b!)).toBeGreaterThan(reach(a!) + 10);
    expect(rest?.anchor).toBe('end');
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
