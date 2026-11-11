/*
 * The pure parts of `DataGrid`: which rows a scrolled viewport shows and
 * when a scroll draws them again, where the cursor cell goes for a key, and
 * how wide a dragged column becomes.
 */

/** A grid's cursor cell, by row and column index. */
export interface GridCell {
  readonly row: number;
  readonly column: number;
}

/** How many rows a grid draws beyond each edge of its viewport. */
const OVERSCAN = 8;

/** Which way a grid last scrolled: 1 down, -1 up, 0 not yet. */
export type ScrollDirection = -1 | 0 | 1;

/**
 * The rows a viewport draws, `[from, to)`, with `overscan` rows beyond each
 * edge. A grid scrolling one way draws as many rows in all, a quarter of
 * them behind and the rest ahead, so it can keep the rows drawn for a few
 * rows' scroll (`windowHolds`) with `overscan` still ahead.
 */
export function visibleRows(
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  rowCount: number,
  overscan = OVERSCAN,
  direction: ScrollDirection = 0
): { readonly from: number; readonly to: number } {
  const first = Math.floor(Math.max(0, scrollTop) / rowHeight);
  const shown = Math.ceil(Math.max(0, viewportHeight) / rowHeight) + 1;
  const behind = direction === 0 ? overscan : Math.floor(overscan / 2);
  const ahead = 2 * overscan - behind;

  return {
    from: Math.max(0, first - (direction < 0 ? ahead : behind)),
    to: Math.min(rowCount, first + shown + (direction < 0 ? behind : ahead))
  };
}

/**
 * Whether the rows drawn, `[from, to)`, still serve a viewport scrolled to
 * `scrollTop` that last moved `direction`: they cover it with `overscan`
 * rows to spare ahead of it (beyond both edges before any scroll), or reach
 * that end of the grid, and none lies past its last row. A scroll inside
 * them draws nothing again, and every screen painted has as many rows ahead
 * as a grid drawn again on every scroll would.
 */
export function windowHolds(
  drawn: { readonly from: number; readonly to: number },
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  rowCount: number,
  direction: ScrollDirection,
  overscan = OVERSCAN
): boolean {
  const shown = visibleRows(scrollTop, viewportHeight, rowHeight, rowCount, 0);

  return (
    drawn.to <= rowCount &&
    drawn.from <= Math.max(0, shown.from - (direction > 0 ? 0 : overscan)) &&
    drawn.to >= Math.min(rowCount, shown.to + (direction < 0 ? 0 : overscan))
  );
}

/** The keys that move a grid's cursor cell. */
export type GridMove =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'page-up'
  | 'page-down'
  | 'row-start'
  | 'row-end'
  | 'start'
  | 'end';

/** The move a key asks of a grid's cursor, or null for a key it leaves alone. */
export function gridMove(key: string, meta: boolean): GridMove | null {
  switch (key) {
    case 'ArrowUp':
      return meta ? 'start' : 'up';
    case 'ArrowDown':
      return meta ? 'end' : 'down';
    case 'ArrowLeft':
      return meta ? 'row-start' : 'left';
    case 'ArrowRight':
      return meta ? 'row-end' : 'right';
    case 'PageUp':
      return 'page-up';
    case 'PageDown':
      return 'page-down';
    case 'Home':
      return 'row-start';
    case 'End':
      return 'row-end';
    default:
      return null;
  }
}

/**
 * Where a move takes the cursor among `rows` by `columns` cells, stopping
 * at every edge; a page moves `page` rows. No cursor yet starts on the
 * first cell. Null when the grid has no cells.
 */
export function movedCell(
  cursor: GridCell | null,
  move: GridMove,
  rows: number,
  columns: number,
  page: number
): GridCell | null {
  if (rows === 0 || columns === 0) return null;
  if (cursor === null) return { row: 0, column: 0 };

  const clampRow = (row: number): number => Math.min(rows - 1, Math.max(0, row));
  const clampColumn = (column: number): number => Math.min(columns - 1, Math.max(0, column));
  const step = Math.max(1, page);

  switch (move) {
    case 'up':
      return { ...cursor, row: clampRow(cursor.row - 1) };
    case 'down':
      return { ...cursor, row: clampRow(cursor.row + 1) };
    case 'left':
      return { ...cursor, column: clampColumn(cursor.column - 1) };
    case 'right':
      return { ...cursor, column: clampColumn(cursor.column + 1) };
    case 'page-up':
      return { ...cursor, row: clampRow(cursor.row - step) };
    case 'page-down':
      return { ...cursor, row: clampRow(cursor.row + step) };
    case 'row-start':
      return { ...cursor, column: 0 };
    case 'row-end':
      return { ...cursor, column: columns - 1 };
    case 'start':
      return { ...cursor, row: 0 };
    case 'end':
      return { ...cursor, row: rows - 1 };
  }
}

/** The narrowest a column can be dragged. */
export const MINIMUM_COLUMN_WIDTH = 40;

/** A column's width after its edge is dragged by `delta` pixels from `start`. */
export const resizedWidth = (start: number, delta: number): number =>
  Math.max(MINIMUM_COLUMN_WIDTH, Math.round(start + delta));

/**
 * A column's first width from what it holds: its label and up to the first
 * rows' texts, at `charWidth` pixels a character, between 60 and 360 pixels.
 */
export function initialWidth(label: string, samples: readonly string[], charWidth: number): number {
  const longest = Math.max(label.length, ...samples.map((text) => Math.min(text.length, 60)));

  return Math.min(360, Math.max(60, Math.round(longest * charWidth + 20)));
}

/**
 * Where a header dragged from `from` lands with the pointer at `x`, among
 * the header cells' edges: the column under the pointer, the first left of
 * them all, the last right of them all.
 */
export function dropPlace(
  x: number,
  edges: readonly { readonly left: number; readonly right: number }[],
  from: number
): number {
  if (edges.length === 0) return from;

  const at = edges.findIndex((edge) => x >= edge.left && x < edge.right);

  if (at >= 0) return at;

  return x < (edges[0]?.left ?? 0) ? 0 : edges.length - 1;
}

/**
 * Where the inline editor's layer starts, in window pixels: over its cell
 * (`left`), unless a layer wider than the cell would cross the well's right
 * edge, when it moves left to end `margin` inside it, never past the well's
 * left edge.
 */
export function editorLeft(
  left: number,
  width: number,
  well: { readonly left: number; readonly right: number },
  margin: number
): number {
  if (left + width <= well.right) return left;
  return Math.max(well.left, Math.min(left, well.right - margin - width));
}
