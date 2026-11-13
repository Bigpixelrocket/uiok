import { describe, expect, it } from 'vitest';

import {
  domainOf,
  scaled,
  tickLabel,
  tickLabels,
  ticksOf,
  unscaled,
  zoomedTo
} from './Scatter.logic.js';

describe('the scatter chart’s geometry', () => {
  it('spares a twentieth of the span around the values, half a step around categories', () => {
    expect(domainOf([0, 100], 'number')).toEqual({ min: -5, max: 105 });
    expect(domainOf([3], 'number')).toEqual({ min: 2, max: 4 });
    expect(domainOf([0, 2], 'category')).toEqual({ min: -0.5, max: 2.5 });
    expect(domainOf([], 'number')).toEqual({ min: 0, max: 1 });
  });

  it('ticks on round numbers, each category, and round times', () => {
    expect(ticksOf({ min: -5, max: 105 }, 'number')).toEqual([0, 20, 40, 60, 80, 100]);
    expect(ticksOf({ min: -0.5, max: 2.5 }, 'category')).toEqual([0, 1, 2]);
    const day = 86_400_000;

    expect(ticksOf({ min: 0, max: 10 * day }, 'time')).toEqual(
      [0, 2, 4, 6, 8, 10].map((n) => n * day)
    );
    expect(
      tickLabel(
        Date.UTC(2026, 0, 2),
        { title: 'd', kind: 'time' },
        { min: 0, max: 10 * 86_400_000 }
      )
    ).toBe('2026-01-02');
    expect(
      tickLabel(1, { title: 'c', kind: 'category', categories: ['a', 'b'] }, { min: 0, max: 1 })
    ).toBe('b');
  });

  it('maps values to pixels and back, and zooms to a dragged rectangle', () => {
    const domain = { min: 0, max: 10 };

    expect(scaled(5, domain, 0, 200)).toBe(100);
    expect(unscaled(100, domain, 0, 200)).toBe(5);
    expect(
      zoomedTo({ x: 50, y: 20 }, { x: 150, y: 80 }, { x: domain, y: domain }, 200, 100)
    ).toEqual({ x: { min: 2.5, max: 7.5 }, y: { min: 2, max: 8 } });
    // A click is no zoom.
    expect(zoomedTo({ x: 5, y: 5 }, { x: 6, y: 6 }, { x: domain, y: domain }, 200, 100)).toBeNull();
  });

  it('shows at least three ticks on a number or time axis, however few are asked for', () => {
    // Ten minutes on a narrow plot: start, middle, and end, not one tick at the end.
    expect(ticksOf({ min: 0, max: 600_000 }, 'time', 2)).toEqual([0, 300_000, 600_000]);
    expect(ticksOf({ min: 0, max: 7.5 * 86_400_000 }, 'time', 2).length).toBeGreaterThanOrEqual(3);
    expect(ticksOf({ min: 0, max: 10 }, 'number', 1).length).toBeGreaterThanOrEqual(3);
  });

  it('ends its ticks where a step is finer than a double tells apart, and refuses such a zoom', () => {
    const near = ticksOf(domainOf([9007199254740992, 9007199254740996], 'number'), 'number');

    expect(near.length).toBeLessThanOrEqual(17);
    expect(new Set(near).size).toBe(near.length);
    expect(
      ticksOf(domainOf([1400000000000000000, 1400000000000000512], 'number'), 'number').length
    ).toBeLessThanOrEqual(17);
    expect(ticksOf({ min: 1e6, max: 1e6 + 3e-10 }, 'number').length).toBeLessThanOrEqual(17);

    const tiny = { min: 1e6, max: 1e6 + 1e-9 };

    expect(zoomedTo({ x: 0, y: 0 }, { x: 10, y: 10 }, { x: tiny, y: tiny }, 200, 100)).toBeNull();
  });

  it('labels ticks close together for their size by their offset from the first', () => {
    const axis = { title: '', kind: 'number' } as const;
    const domain = { min: 1_793_550_000_000, max: 1_794_150_000_000 };
    const ticks = ticksOf(domain, 'number', 6);
    const labels = tickLabels(ticks, axis, domain);

    expect(labels.slice(1)).toEqual(ticks.slice(1).map((_tick, at) => `+${(at + 1) * 100}M`));
    expect(tickLabels([0, 50, 100], axis, { min: 0, max: 100 })).toEqual(['0', '50', '100']);
  });
});
