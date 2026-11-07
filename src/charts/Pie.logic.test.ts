import { describe, expect, it } from 'vitest';

import { pieArcs } from './Pie.logic.js';

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
});
