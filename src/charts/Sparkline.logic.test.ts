import { describe, expect, it } from 'vitest';

import { sparklinePoints } from './Sparkline.logic.js';

describe('sparklinePoints', () => {
  it('spaces the values across the box, the lowest at the foot and the highest at the head', () => {
    expect(sparklinePoints([0, 5, 10], 64, 16)).toBe('0,15 32,8 64,1');
  });

  it('draws a flat series through the middle and one value across the box', () => {
    expect(sparklinePoints([3, 3], 10, 16)).toBe('0,8 10,8');
    expect(sparklinePoints([7], 10, 16)).toBe('0,8 10,8');
  });

  it('leaves out values that are not finite, and draws nothing for none', () => {
    expect(sparklinePoints([0, Number.NaN, 10], 10, 12, 0)).toBe('0,12 10,0');
    expect(sparklinePoints([], 10, 10)).toBe('');
  });
});
