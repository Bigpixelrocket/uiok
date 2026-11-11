import { describe, expect, it } from 'vitest';

import {
  dropPlace,
  editorLeft,
  gridMove,
  initialWidth,
  movedCell,
  resizedWidth,
  visibleRows,
  windowHolds
} from './DataGrid.logic.js';

describe('DataGrid logic', () => {
  it('draws the rows a scrolled viewport shows, with a margin either side', () => {
    expect(visibleRows(0, 220, 22, 1_000, 2)).toEqual({ from: 0, to: 13 });
    expect(visibleRows(2_200, 220, 22, 1_000, 2)).toEqual({ from: 98, to: 113 });
    expect(visibleRows(2_200, 220, 22, 105, 2)).toEqual({ from: 98, to: 105 });
    // Scrolling, the same rows in all lean ahead of the screen.
    expect(visibleRows(2_200, 220, 22, 1_000, 2, 1)).toEqual({ from: 99, to: 114 });
    expect(visibleRows(2_200, 220, 22, 1_000, 2, -1)).toEqual({ from: 97, to: 112 });
  });

  it('draws again only once a scroll leaves fewer than the overscan rows ahead', () => {
    // A screen of rows 100 to 110 (2,200 px down, 220 px tall): rows 92 to 118
    // before any scroll, 96 to 122 scrolling down, 88 to 114 scrolling up.
    const still = visibleRows(2_200, 220, 22, 1_000);
    const down = visibleRows(2_200, 220, 22, 1_000, undefined, 1);
    const up = visibleRows(2_200, 220, 22, 1_000, undefined, -1);

    expect([still, down, up]).toEqual([
      { from: 92, to: 119 },
      { from: 96, to: 123 },
      { from: 88, to: 115 }
    ]);
    expect(windowHolds(still, 2_200, 220, 22, 1_000, 0)).toBe(true);
    expect(windowHolds(still, 2_200 + 22, 220, 22, 1_000, 1)).toBe(false);
    expect(windowHolds(down, 2_200, 220, 22, 1_000, 1)).toBe(true);
    expect(windowHolds(down, 2_200 + 4 * 22, 220, 22, 1_000, 1)).toBe(true);
    expect(windowHolds(down, 2_200 + 5 * 22, 220, 22, 1_000, 1)).toBe(false);
    expect(windowHolds(up, 2_200 - 4 * 22, 220, 22, 1_000, -1)).toBe(true);
    expect(windowHolds(up, 2_200 - 5 * 22, 220, 22, 1_000, -1)).toBe(false);
    // Turning back draws again, with the overscan ahead the other way.
    expect(windowHolds(down, 2_200 - 22, 220, 22, 1_000, -1)).toBe(false);
    // A taller viewport, fewer rows, or more rows near the end each draw again.
    expect(windowHolds(down, 2_200, 440, 22, 1_000, 1)).toBe(false);
    expect(windowHolds(down, 2_200, 220, 22, 110, 1)).toBe(false);
    expect(windowHolds({ from: 96, to: 112 }, 2_200, 220, 22, 112, 1)).toBe(true);
    expect(windowHolds({ from: 96, to: 112 }, 2_200, 220, 22, 200, 1)).toBe(false);
    // At the top, the rows from the first serve.
    expect(windowHolds({ from: 0, to: 19 }, 0, 220, 22, 1_000, 0)).toBe(true);
    expect(windowHolds({ from: 0, to: 0 }, 0, 220, 22, 1_000, 0)).toBe(false);
  });

  it('moves the cursor cell, stopping at every edge', () => {
    expect(movedCell(null, 'down', 3, 2, 10)).toEqual({ row: 0, column: 0 });
    expect(movedCell({ row: 0, column: 0 }, 'up', 3, 2, 10)).toEqual({ row: 0, column: 0 });
    expect(movedCell({ row: 0, column: 1 }, 'right', 3, 2, 10)).toEqual({ row: 0, column: 1 });
    expect(movedCell({ row: 0, column: 0 }, 'page-down', 30, 2, 10)).toEqual({
      row: 10,
      column: 0
    });
    expect(movedCell({ row: 5, column: 1 }, gridMove('ArrowUp', true) ?? 'up', 30, 2, 10)).toEqual({
      row: 0,
      column: 1
    });
    expect(movedCell({ row: 0, column: 0 }, 'down', 0, 2, 10)).toBeNull();
    expect(gridMove('a', false)).toBeNull();
  });

  it('keeps a dragged column from closing, and sizes a column by its first rows', () => {
    expect(resizedWidth(100, -500)).toBe(40);
    expect(initialWidth('id', ['1', '22'], 8)).toBe(60);
    expect(initialWidth('note', ['x'.repeat(200)], 8)).toBe(360);
  });
});

describe('dropPlace', () => {
  const edges = [
    { left: 0, right: 100 },
    { left: 100, right: 160 },
    { left: 160, right: 300 }
  ];

  it('lands on the column under the pointer, or the end the pointer passed', () => {
    expect(dropPlace(120, edges, 0)).toBe(1);
    expect(dropPlace(-20, edges, 2)).toBe(0);
    expect(dropPlace(900, edges, 0)).toBe(2);
    expect(dropPlace(50, [], 3)).toBe(3);
  });

  it('keeps a wide editor inside the grid well, a margin from its right edge', () => {
    const well = { left: 100, right: 500 };

    // A layer that fits stays over its cell, even flush with the edge.
    expect(editorLeft(300, 120, well, 8)).toBe(300);
    expect(editorLeft(380, 120, well, 8)).toBe(380);
    // One that would cross moves left to end 8px inside.
    expect(editorLeft(400, 250, well, 8)).toBe(242);
    // Wider than the well: from its left edge.
    expect(editorLeft(400, 450, well, 8)).toBe(100);
  });
});
