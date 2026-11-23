import { describe, expect, it } from 'vitest';

import { appearanceInUse, steppedIndex } from './ThemePicker.logic.js';

describe('steppedIndex', () => {
  it('moves forward on Right and Down and back on Left and Up, wrapping at either end', () => {
    expect(steppedIndex('ArrowRight', 0, 3)).toBe(1);
    expect(steppedIndex('ArrowDown', 2, 3)).toBe(0);
    expect(steppedIndex('ArrowLeft', 0, 3)).toBe(2);
    expect(steppedIndex('ArrowUp', 1, 3)).toBe(0);
  });

  it('ignores any other key and an empty group', () => {
    expect(steppedIndex('Enter', 0, 3)).toBeNull();
    expect(steppedIndex('ArrowRight', 0, 0)).toBeNull();
  });
});

describe('appearanceInUse', () => {
  it('follows the system while the appearance is System, and holds a fixed one whatever the system uses', () => {
    expect(appearanceInUse('system', false)).toBe('light');
    expect(appearanceInUse('system', true)).toBe('dark');
    expect(appearanceInUse('light', true)).toBe('light');
    expect(appearanceInUse('dark', false)).toBe('dark');
  });
});
