import { describe, expect, it } from 'vitest';

import {
  joinedRuns,
  lineAt,
  lineTops,
  logSourceColour,
  logSourceIndexes,
  logSourceWidth,
  visibleRun
} from './LogWell.logic.js';

describe('logSourceIndexes', () => {
  it('gives each source its turn by first appearance, after the order given', () => {
    const indexes = logSourceIndexes(['web', 'vite', 'web', null, 'queue.1'], ['vite']);

    expect([...indexes]).toEqual([
      ['vite', 0],
      ['web', 1],
      ['queue.1', 2]
    ]);
  });
});

describe('logSourceColour', () => {
  it('names the source tokens in turn, starting over after the sixth', () => {
    expect(logSourceColour(0)).toBe('var(--log-source-1)');
    expect(logSourceColour(5)).toBe('var(--log-source-6)');
    expect(logSourceColour(6)).toBe('var(--log-source-1)');
  });
});

describe('logSourceWidth', () => {
  it('is the longest source, none when no line has one', () => {
    expect(logSourceWidth(['web', 'scheduler', null])).toBe(9);
    expect(logSourceWidth([null, undefined])).toBe(0);
  });
});

describe('lineTops and visibleRun', () => {
  // Line 2 wraps to three lines (54px); the rest are not measured yet.
  const tops = lineTops(10, (index) => (index === 2 ? 54 : undefined), 18);

  it('stacks measured lines at their height and the rest at the estimate', () => {
    expect([...tops.slice(0, 5)]).toEqual([0, 18, 36, 90, 108]);
    expect(tops[10]).toBe(54 + 9 * 18);
  });

  it('finds the line at a height, and the view with its overscan', () => {
    expect(lineAt(tops, 0)).toBe(0);
    expect(lineAt(tops, 89)).toBe(2);
    expect(lineAt(tops, 90)).toBe(3);
    expect(lineAt(tops, 10_000)).toBe(9);
    expect(visibleRun(tops, 40, 60, 1)).toEqual({ start: 1, end: 5 });
    expect(
      visibleRun(
        lineTops(0, () => undefined, 18),
        0,
        100,
        5
      )
    ).toEqual({ start: 0, end: 0 });
  });

  it('joins runs that touch or overlap, in order, within the log', () => {
    expect(
      joinedRuns(
        [
          { start: 90, end: 120 },
          { start: 5, end: 30 },
          { start: 30, end: 40 },
          { start: -10, end: 0 }
        ],
        100
      )
    ).toEqual([
      { start: 5, end: 40 },
      { start: 90, end: 100 }
    ]);
  });
});
