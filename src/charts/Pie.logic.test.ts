import { describe, expect, it } from 'vitest';

import { PIE_TAG_REACH, pieArcs, pieTags } from './Pie.logic.js';

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
