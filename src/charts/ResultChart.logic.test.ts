import { describe, expect, it } from 'vitest';

import {
  cutLabel,
  fittedLegend,
  LEGEND_ROW,
  legendLayout,
  pieLegendRows,
  plotTopUnderLegend,
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

  it('lays the legend out by measured widths where it has them, wrapping inside the width', () => {
    expect(legendLayout(['a', 'b', 'c'], 110, [40, 20, 30])).toEqual([
      { text: 'a', x: 0, row: 0 },
      { text: 'b', x: 68, row: 0 },
      { text: 'c', x: 0, row: 1 }
    ]);
  });

  it('lists every entry and counts none when the legend fits its rows', () => {
    expect(fittedLegend(['a', 'b'], 200, 1, [20, 20])).toEqual({
      places: [
        { text: 'a', x: 0, row: 0 },
        { text: 'b', x: 48, row: 0 }
      ],
      more: null
    });
  });

  it('counts the entries a legend leaves out after the last one listed, in the room it reserves', () => {
    // Three 40px entries fill a 200px row (68px each); the count steps the third back.
    const { places, more } = fittedLegend(['a', 'b', 'c', 'd'], 200, 1, [40, 40, 40, 40]);

    expect(places.map((place) => place.text)).toEqual(['a', 'b']);
    expect(more).toEqual({ text: '+2', x: 136, row: 0 });
  });

  it('counts entries past those named, though every named one fits', () => {
    expect(fittedLegend(['a'], 200, 1, [20], 25).more).toEqual({ text: '+24', x: 48, row: 0 });
  });

  it('keeps a pie legend within a third of a short drawing, and at most its cap', () => {
    expect(pieLegendRows(260, 28, 4)).toBe(3);
    expect(pieLegendRows(400, 8, 4)).toBe(4);
    expect(pieLegendRows(60, 28, 4)).toBe(1);
  });

  it('leaves the same room under a wrapped legend as under one row', () => {
    const oneRow = plotTopUnderLegend(28, 1);
    const twoRows = plotTopUnderLegend(28, 2);

    // The last row's ink ends 12px down its row; 12px of air follow it.
    expect(oneRow).toBe(28 + 12 + 12);
    expect(twoRows - oneRow).toBe(LEGEND_ROW);
    expect(twoRows).toBe(28 + LEGEND_ROW + 12 + 12);
    expect(plotTopUnderLegend(8, 0)).toBe(8);
  });
});
