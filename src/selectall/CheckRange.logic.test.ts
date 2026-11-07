import { describe, expect, it } from 'vitest';

import { checkedAfterClick } from './CheckRange.logic.js';

const order = ['a', 'b', 'c', 'd', 'e'];

describe('checkedAfterClick', () => {
  it('turns the row alone on a plain click', () => {
    expect([...checkedAfterClick(new Set(['a']), order, 'a', 'c', false)]).toEqual(['a', 'c']);
    expect([...checkedAfterClick(new Set(['a', 'c']), order, 'a', 'c', false)]).toEqual(['a']);
  });

  it('turns the range from the last row clicked to the state the clicked row takes, either way', () => {
    expect([...checkedAfterClick(new Set(['b']), order, 'b', 'd', true)].sort()).toEqual([
      'b',
      'c',
      'd'
    ]);
    expect([...checkedAfterClick(new Set(order), order, 'd', 'b', true)].sort()).toEqual([
      'a',
      'e'
    ]);
  });

  it('turns the row alone on a Shift-click with no anchor in the list', () => {
    expect([...checkedAfterClick(new Set(), order, null, 'c', true)]).toEqual(['c']);
    expect([...checkedAfterClick(new Set(), order, 'gone', 'c', true)]).toEqual(['c']);
  });
});
