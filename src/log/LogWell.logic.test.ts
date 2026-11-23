import { describe, expect, it } from 'vitest';

import { logSourceColour, logSourceIndexes, logSourceWidth } from './LogWell.logic.js';

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
