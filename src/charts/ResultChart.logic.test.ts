import { describe, expect, it } from 'vitest';

import {
  cutLabel,
  shownLabels,
  splinePath,
  stackedRanges,
  valueDomain
} from './ResultChart.logic.js';

describe('the chart of a table', () => {
  it('grows bars from zero, and stacks positive values up and negative ones down', () => {
    const series = [
      { name: 'a', values: [1, -2, null] },
      { name: 'b', values: [3, -1, 4] }
    ];

    expect(valueDomain(series, false)).toEqual({ min: -2, max: 4 });
    expect(valueDomain(series, true)).toEqual({ min: -3, max: 4 });
    expect(valueDomain([{ name: 'flat', values: [5, 5] }], false)).toEqual({ min: 0, max: 5 });
    expect(stackedRanges(series)).toEqual([
      [
        { from: 0, to: 1 },
        { from: 0, to: -2 },
        { from: 0, to: 0 }
      ],
      [
        { from: 1, to: 4 },
        { from: -2, to: -3 },
        { from: 0, to: 4 }
      ]
    ]);
  });

  it('draws a spline that keeps to its points, breaking at a gap', () => {
    const path = splinePath([[0, 10], [10, 0], [20, 10], null, [30, 5], [40, 5]]);

    expect(path.startsWith('M0 10 C')).toBe(true);
    expect(path).toContain('M30 5 L40 5');
    // The middle point is a turn, so its tangent is flat and the curve never passes 0.
    expect(path).toContain('10 0 C');
    expect(shownLabels(100, 400, 40)).toEqual(new Set([0, 10, 20, 30, 40, 50, 60, 70, 80, 90]));
    expect(cutLabel('a long category name', 8)).toBe('a long …');
  });

  it('keeps each spline segment within its end points when the slopes differ', () => {
    const points: [number, number][] = [
      [0, 0],
      [1, 1],
      [2, 100]
    ];
    const segments = [...splinePath(points).matchAll(/C(\S+) (\S+) (\S+) (\S+) (\S+) (\S+)/g)];

    expect(segments).toHaveLength(2);
    segments.forEach((segment, at) => {
      const [, y0] = points[at] as [number, number];
      const [, y1] = points[at + 1] as [number, number];
      const low = Math.min(y0, y1);
      const high = Math.max(y0, y1);

      // Control points inside the segment's range keep the whole Bezier inside it.
      for (const y of [Number(segment[2]), Number(segment[4])]) {
        expect(y).toBeGreaterThanOrEqual(low);
        expect(y).toBeLessThanOrEqual(high);
      }
    });
  });
});
