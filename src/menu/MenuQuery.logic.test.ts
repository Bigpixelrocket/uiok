import { describe, expect, it } from 'vitest';

import {
  enteredLevel,
  leftLevel,
  menuQueryRefused,
  movedPickableCursor,
  moveMenuCursor,
  pickableCursor,
  returnedCursor,
  trailLevel
} from './MenuQuery.logic.js';

describe('menuQueryRefused', () => {
  it('refuses a longer query that would empty a menu that still had rows', () => {
    expect(menuQueryRefused('do', 'dox', 2, 0)).toBe(true);
    expect(menuQueryRefused('', 'z', 3, 0)).toBe(true);
  });

  it('accepts a query that still matches something', () => {
    expect(menuQueryRefused('d', 'do', 3, 2)).toBe(false);
  });

  it('never blocks the way back: a shorter query passes even when nothing matches', () => {
    expect(menuQueryRefused('dox', 'do', 0, 0)).toBe(false);
    expect(menuQueryRefused('zz', 'z', 0, 0)).toBe(false);
    // Deleting the space in "o f" leaves "of", which can match nothing that "o f" did.
    expect(menuQueryRefused('o f', 'of', 1, 0)).toBe(false);
  });

  it('refuses nothing while the menu has no rows to empty', () => {
    // Still loading, failed, or empty: the list is not known to be complete.
    expect(menuQueryRefused('', 'd', 0, 0)).toBe(false);
  });

  it('lets an excluding query through, since it widens again as its term grows', () => {
    expect(menuQueryRefused('!', '!d', 3, 0)).toBe(false);
  });
});

describe('moveMenuCursor', () => {
  it('enters the list from either end and clamps inside it', () => {
    expect(moveMenuCursor(null, 1, 3)).toBe(0);
    expect(moveMenuCursor(null, -1, 3)).toBe(2);
    expect(moveMenuCursor(2, 1, 3)).toBe(2);
    expect(moveMenuCursor(0, -1, 3)).toBe(0);
    expect(moveMenuCursor(1, 1, 0)).toBeNull();
  });
});

describe('pickable rows', () => {
  const items = [
    { key: 'a', taken: true },
    { key: 'b', taken: false },
    { key: 'c', taken: true },
    { key: 'd', taken: false }
  ];

  it('keeps the cursor on the row it was moved to while that row is pickable', () => {
    expect(pickableCursor(items, 'd')).toBe(3);
  });

  it('moves on to the first pickable row when the pointed one is taken or gone', () => {
    expect(pickableCursor(items, 'c')).toBe(1);
    expect(pickableCursor(items, 'z')).toBe(1);
    expect(pickableCursor(items, null)).toBe(1);
    expect(pickableCursor([{ key: 'a', taken: true }], null)).toBeNull();
  });

  it('steps over taken rows and clamps to the pickable ones', () => {
    expect(movedPickableCursor(items, 1, 1)).toBe(3);
    expect(movedPickableCursor(items, 3, 1)).toBe(3);
    expect(movedPickableCursor(items, 3, -1)).toBe(1);
    expect(movedPickableCursor(items, null, -1)).toBe(3);
    // A cursor on a taken row enters the pickable rows afresh.
    expect(movedPickableCursor(items, 0, 1)).toBe(1);
    expect(movedPickableCursor([{ key: 'a', taken: true }], null, 1)).toBeNull();
  });
});

describe('level trails', () => {
  it('returns the cursor to the row that opened each level, one step at a time', () => {
    const top = enteredLevel([], 'formats', 'copy-as');
    const deep = enteredLevel(top, 'encodings', 'url');

    expect(trailLevel(deep)).toBe('encodings');

    const out = leftLevel(deep);

    expect(out?.pointed).toBe('url');
    expect(trailLevel(out?.trail ?? [])).toBe('formats');

    const outer = leftLevel(out?.trail ?? []);

    expect(outer?.pointed).toBe('copy-as');
    expect(outer?.trail).toEqual([]);
    expect(trailLevel(outer?.trail ?? [])).toBeNull();
  });

  it('has nothing to step back from at the top', () => {
    expect(leftLevel([])).toBeNull();
  });

  it('keeps no row for a level opened some other way', () => {
    expect(leftLevel(enteredLevel([], 'formats', null))?.pointed).toBeNull();
  });
});

describe('returnedCursor', () => {
  it('lands on the remembered row by key, wherever the list put it', () => {
    expect(returnedCursor(['open', 'copy', 'copy-as'], 'copy-as')).toBe(2);
  });

  it('leaves the resting row to the surface when the row is gone or none was kept', () => {
    expect(returnedCursor(['open', 'copy'], 'copy-as')).toBeNull();
    expect(returnedCursor(['open', 'copy'], null)).toBeNull();
  });
});
