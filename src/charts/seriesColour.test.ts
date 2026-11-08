import { describe, expect, it } from 'vitest';

import { seriesColour } from './seriesColour.js';

describe('seriesColour', () => {
  it('takes the eight chart tokens in turn and starts over after the last', () => {
    expect([0, 1, 7].map(seriesColour)).toEqual([
      'var(--chart-1)',
      'var(--chart-2)',
      'var(--chart-8)'
    ]);
    expect(seriesColour(8)).toBe('var(--chart-1)');
    expect(seriesColour(19)).toBe('var(--chart-4)');
  });
});
