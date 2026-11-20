import { describe, expect, it } from 'vitest';

import {
  linePath,
  lonePoints,
  nearestMoment,
  timeTickLabels,
  valueDomain,
  valueRange
} from './Line.logic.js';
import { ticksOf } from './Scatter.logic.js';

describe('the line chart’s geometry', () => {
  it('starts the value axis at zero, below it only for negative values, with room above', () => {
    expect(valueDomain([2, 10, null])).toEqual({ min: 0, max: 11 });
    expect(valueDomain([-10, 10])).toEqual({ min: -12, max: 12 });
    expect(valueDomain([])).toEqual({ min: 0, max: 1 });
    expect(valueDomain([0, 0])).toEqual({ min: 0, max: 1 });
  });

  it('uses a fixed end exactly and scales the other one to the values', () => {
    expect(valueDomain([20, 140], { min: 0, max: 100 })).toEqual({ min: 0, max: 100 });
    expect(valueDomain([60, 80], { min: 50 })).toEqual({ min: 50, max: 83 });
    expect(valueDomain([20, 40], { max: 100 })).toEqual({ min: 0, max: 100 });
    expect(valueDomain([-20, 40], { max: 100 })).toEqual({ min: -32, max: 100 });
    // Every value beyond the fixed end: the free end gives the unit span.
    expect(valueDomain([10, 20], { min: 50 })).toEqual({ min: 50, max: 51 });
    expect(valueDomain([10, 20], { max: -5 })).toEqual({ min: -6, max: -5 });
  });

  it('keeps every tick of a fixed value axis inside it', () => {
    for (const domain of [
      valueDomain([], { min: 0, max: 100 }),
      valueDomain([], { min: 3, max: 97 }),
      valueDomain([], { min: -0.5, max: 0.25 })
    ]) {
      const ticks = ticksOf(domain, 'number', 5);

      expect(ticks.length).toBeGreaterThan(1);
      for (const tick of ticks) {
        expect(tick).toBeGreaterThanOrEqual(domain.min);
        expect(tick).toBeLessThanOrEqual(domain.max);
      }
    }
  });

  it('ignores a fixed end that is not finite, and both ends when they are out of order', () => {
    expect(valueRange(Number.NaN, 100)).toEqual({ max: 100 });
    expect(valueRange(0, Number.POSITIVE_INFINITY)).toEqual({ min: 0 });
    expect(valueRange(100, 100)).toEqual({});
    expect(valueRange(100, 0)).toEqual({});
    expect(valueRange(undefined, undefined)).toEqual({});
    expect(valueDomain([2, 10], { min: 10, max: 0 })).toEqual(valueDomain([2, 10]));
    expect(valueDomain([2, 10], { min: Number.NaN, max: Number.NaN })).toEqual({ min: 0, max: 11 });
  });

  it('breaks a line where a value is missing, and still draws a lone value', () => {
    const path = linePath(
      [
        { at: 0, value: 1 },
        { at: 1, value: 2 },
        { at: 2, value: null },
        { at: 3, value: 4 }
      ],
      (at) => at * 10,
      (value) => 100 - value
    );

    expect(path).toBe('M 0.0 99.0 l 0.01 0 L 10.0 98.0 M 30.0 96.0 l 0.01 0');
    expect(
      linePath(
        [],
        (at) => at,
        (value) => value
      )
    ).toBe('');
  });

  it('finds the values a line cannot show: one alone, or one between two gaps', () => {
    expect(lonePoints([{ at: 5, value: 2 }])).toEqual([{ at: 5, value: 2 }]);
    expect(
      lonePoints([
        { at: 1, value: 1 },
        { at: 2, value: 2 },
        { at: 3, value: null },
        { at: 4, value: 4 },
        { at: 5, value: null },
        { at: 6, value: 6 },
        { at: 7, value: 7 }
      ])
    ).toEqual([{ at: 4, value: 4 }]);
    expect(lonePoints([{ at: 1, value: null }])).toEqual([]);
  });

  it('finds the moment nearest the pointer', () => {
    expect(nearestMoment([1000, 2000, 3000], 2400)).toBe(2000);
    expect(nearestMoment([1000, 2000, 3000], 2600)).toBe(3000);
    expect(nearestMoment([], 5)).toBeNull();
  });
});

describe('time tick label geometry', () => {
  it('keeps complete labels inside both plot boundaries and clear of the zero value label', () => {
    const labels = timeTickLabels(
      [0, 105, 210],
      () => '00:00:00',
      (at) => at,
      210,
      () => 56
    );

    expect(labels).toHaveLength(3);
    expect(labels[0]?.left).toBe(0);
    expect(labels.at(-1)!.left + labels.at(-1)!.width).toBe(210);
    for (const label of labels) {
      expect(label.left).toBeGreaterThanOrEqual(0);
      expect(label.left + label.width).toBeLessThanOrEqual(210);
      // Value ticks end at x=-6; no time label may invade their space.
      expect(label.left - -6).toBeGreaterThanOrEqual(6);
    }
  });

  it('thins dense ticks by measured glyph width, including long localized time labels', () => {
    for (const width of [120, 180, 304]) {
      const ticks = Array.from({ length: 9 }, (_, at) => (at * width) / 8);
      const labels = timeTickLabels(
        ticks,
        () => '23.59.00',
        (at) => at,
        width,
        () => 73
      );

      expect(labels.length).toBeGreaterThan(0);
      expect(labels.length).toBeLessThan(ticks.length);
      for (const [index, label] of labels.entries()) {
        expect(label.left).toBeGreaterThanOrEqual(0);
        expect(label.left + label.width).toBeLessThanOrEqual(width);
        if (index > 0)
          expect(label.left - (labels[index - 1]!.left + 73)).toBeGreaterThanOrEqual(8);
      }
    }
  });

  it('does not draw a label wider than the plot', () => {
    expect(
      timeTickLabels(
        [0],
        () => '00:00:00',
        () => 0,
        30,
        () => 56
      )
    ).toEqual([]);
  });
});
