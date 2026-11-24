import { describe, expect, it } from 'vitest';

import { pageRows, pageRowsFrom } from './PaneKeys.js';

/** A pane whose home shows `room` pixels, holding rows of the heights given. */
function pane(
  room: number,
  heights: readonly number[]
): { root: HTMLElement; rows: HTMLElement[] } {
  const root = document.createElement('div');
  const home = document.createElement('div');

  home.dataset.paneHome = '';
  Object.defineProperty(home, 'clientHeight', { configurable: true, value: room });
  root.append(home);
  const rows = heights.map((height, index) => {
    const row = document.createElement('div');

    row.dataset.rowKey = String(index);
    row.getBoundingClientRect = () => ({ height }) as DOMRect;
    home.append(row);
    return row;
  });
  document.body.append(root);
  return { root, rows };
}

describe('pageRowsFrom', () => {
  it('pages rows of one height as pageRows does, one row kept in view', () => {
    const { root, rows } = pane(
      240,
      Array.from({ length: 30 }, () => 24)
    );

    expect(pageRowsFrom(root, rows, 5, false)).toBe(pageRows(root));
    expect(pageRowsFrom(root, rows, 20, true)).toBe(9);
    root.remove();
  });

  it('pages fewer rows over rows that grew, so no row is skipped unseen', () => {
    // 48px rows that hold two lines of chips: five fill the 240px home.
    const { root, rows } = pane(
      240,
      Array.from({ length: 30 }, () => 48)
    );

    expect(pageRowsFrom(root, rows, 0, false)).toBe(4);
    // Mixed heights, read row by row from where the cursor stands, up.
    const mixed = pane(240, [24, 24, 120, 24, 24, 24, 24]);
    expect(pageRowsFrom(mixed.root, mixed.rows, 6, true)).toBe(5);
    root.remove();
    mixed.root.remove();
  });

  it('moves at least one row, and falls back to pageRows with nothing laid out', () => {
    const { root, rows } = pane(240, [24, 400, 24]);

    expect(pageRowsFrom(root, rows, 0, false)).toBe(1);
    expect(pageRowsFrom(root, rows, -1, false)).toBe(pageRows(root));
    const hidden = pane(0, [24, 24, 24]);
    expect(pageRowsFrom(hidden.root, hidden.rows, 0, false)).toBe(pageRows(hidden.root));
    root.remove();
    hidden.root.remove();
  });
});
