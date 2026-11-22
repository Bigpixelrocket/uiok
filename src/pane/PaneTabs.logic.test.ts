// @vitest-environment node

import { describe, expect, it } from 'vitest';

import {
  draggedTabOrder,
  foldOrder,
  foldsNeeded,
  gatherTabs,
  pickedTabs,
  pickRun,
  tabLabelFloor,
  togglePick
} from './PaneTabs.logic.js';

const ORDER = ['a', 'b', 'c', 'd', 'e'];

describe('picks', () => {
  it('toggles a pick beside the front tab and never drops the front tab', () => {
    const once = togglePick(ORDER, 'b', null, 'd');

    expect(once).toEqual({ front: 'b', ids: ['d'] });
    expect(togglePick(ORDER, 'b', once, 'a')).toEqual({ front: 'b', ids: ['d', 'a'] });
    expect(togglePick(ORDER, 'b', once, 'b')).toEqual(once);
    expect(togglePick(ORDER, 'b', once, 'd')).toBeNull();
  });

  it('lapses picks made under another front tab, or on tabs gone', () => {
    const picks = { front: 'b', ids: ['d', 'z'] };

    expect(pickedTabs(ORDER, 'b', picks)).toEqual(['b', 'd']);
    expect(pickedTabs(ORDER, 'c', picks)).toEqual(['c']);
    expect(togglePick(ORDER, 'c', picks, 'a')).toEqual({ front: 'c', ids: ['a'] });
  });

  it('picks the run from the front tab, either way, in place of earlier picks', () => {
    expect(pickRun(ORDER, 'b', 'd')).toEqual({ front: 'b', ids: ['c', 'd'] });
    expect(pickRun(ORDER, 'd', 'a')).toEqual({ front: 'd', ids: ['a', 'b', 'c'] });
    expect(pickRun(ORDER, 'b', 'b')).toBeNull();
    expect(pickRun(ORDER, 'b', 'z')).toBeNull();
  });

  it('lists the front tab and live picks in strip order', () => {
    expect(pickedTabs(ORDER, 'c', { front: 'c', ids: ['e', 'a'] })).toEqual(['a', 'c', 'e']);
    expect(pickedTabs(ORDER, 'c', null)).toEqual(['c']);
  });

  it('gathers carried tabs round the held one in their order', () => {
    expect(gatherTabs(ORDER, ['a', 'e'], 'c')).toEqual(['b', 'a', 'c', 'e', 'd']);
    expect(gatherTabs(ORDER, ['a'], 'z')).toEqual(ORDER);
  });
});

describe('folding', () => {
  it('folds farthest from the front tab first, the later of two as far', () => {
    expect(
      foldOrder(
        ORDER.map((id) => ({ id })),
        'c'
      )
    ).toEqual(['e', 'a', 'd', 'b']);
  });

  it('never folds pinned, front, or following tabs', () => {
    const tabs = [
      { id: 'p', pinned: true },
      { id: 'a' },
      { id: 'b', following: true },
      { id: 'c' },
      { id: 'd' }
    ];

    expect(foldOrder(tabs, 'a')).toEqual(['d', 'c']);
  });

  it('folds as many tabs in one step as cover the deficit, at least one', () => {
    expect(foldsNeeded(150, [100, 100, 100], 4)).toBe(2);
    expect(foldsNeeded(1, [100, 100], 4)).toBe(1);
    expect(foldsNeeded(1000, [100, 100], 4)).toBe(2);
    expect(foldsNeeded(0, [100], 4)).toBe(0);
  });

  it('keeps eight characters of a name and three of a context, ellipses counted', () => {
    expect(tabLabelFloor({ name: 'customers_by_region' })).toEqual({ context: 0, name: 9 });
    expect(tabLabelFloor({ name: 'orders', context: 'shop_archive' })).toEqual({
      context: 4,
      name: 6
    });
    expect(tabLabelFloor({ name: 'x', context: 'db' })).toEqual({ context: 2, name: 1 });
  });
});

describe('draggedTabOrder', () => {
  const boxes = [
    { id: 'a', left: 0, width: 100 },
    { id: 'c', left: 200, width: 100 },
    { id: 'd', left: 300, width: 100 }
  ];

  it('moves a neighbour aside once the held tab covers half of it', () => {
    expect(
      draggedTabOrder(['a', 'b', 'c', 'd'], { id: 'b', left: 140, width: 100 }, boxes, 1)
    ).toEqual(['a', 'b', 'c', 'd']);
    expect(
      draggedTabOrder(['a', 'b', 'c', 'd'], { id: 'b', left: 160, width: 100 }, boxes, 1)
    ).toEqual(['a', 'c', 'b', 'd']);
  });

  it('leaves a neighbour the held tab moves away from where it is', () => {
    expect(
      draggedTabOrder(['a', 'b', 'c', 'd'], { id: 'b', left: 160, width: 100 }, boxes, -1)
    ).toEqual(['a', 'b', 'c', 'd']);
  });

  it('keeps tabs not on show (folded) in the order it returns', () => {
    expect(
      draggedTabOrder(['a', 'b', 'c', 'd', 'e'], { id: 'b', left: 360, width: 100 }, boxes, 1)
    ).toEqual(['a', 'c', 'd', 'b', 'e']);
  });

  it('keeps the order while no tab on show is crossed, folded tabs between them included', () => {
    const order = ['a', 'b', 'c', 'd', 'e', 'f'];
    const far = [{ id: 'f', left: 200, width: 100 }];

    expect(draggedTabOrder(order, { id: 'c', left: 5, width: 100 }, far, 1)).toBe(order);
    expect(draggedTabOrder(order, { id: 'c', left: 160, width: 100 }, far, 1)).toEqual([
      'a',
      'b',
      'd',
      'e',
      'f',
      'c'
    ]);
    expect(
      draggedTabOrder(
        order,
        { id: 'f', left: -10, width: 100 },
        [{ id: 'c', left: 0, width: 100 }],
        -1
      )
    ).toEqual(['a', 'b', 'f', 'c', 'd', 'e']);
  });
});
