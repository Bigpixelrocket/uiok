/**
 * What the text view shows and what it must read to show it. A view target
 * is a byte and a number of rows to move from the row holding it; resolving
 * a target against a chunk of the file gives the screen's rows. Every target
 * needs one bounded read at most, sized from the screen, never from the file.
 */

import { VIEWER_MAX_READ_BYTES } from './types.js';

import type { TextLayout } from './TextEncoding.logic.js';
import {
  countLineBreaks,
  LOOKBEHIND_BYTES,
  MAX_ROW_BYTES,
  rowAt,
  rowContaining,
  rowsBefore,
  rowsFrom,
  type RowBounds,
  type RowStart,
  type TextChunk
} from './TextRows.logic.js';

/**
 * The most rows one screen shows; a taller window shows this many. It keeps
 * a screen, a page either way, and the look back for a row start inside one
 * read of `VIEWER_MAX_READ_BYTES`.
 */
export const MAX_SCREEN_ROWS = 120;

/** Where to look: the row holding byte `anchor`, moved `rows` rows down (or up when negative). */
export interface ViewTarget {
  readonly anchor: number;
  readonly rows: number;
}

/** A byte range to read for a target. */
export interface ReadWindow {
  readonly offset: number;
  readonly length: number;
}

/**
 * The screen: its first row, the rows from there, and the rows of the
 * target's move still to go. A move of more than a page goes a page per
 * screen, so `rest` carries the remainder to the next screen; it is 0 once
 * the move is done or stopped at the start or end of the file.
 */
export interface Viewport {
  readonly top: RowStart;
  readonly rows: readonly RowBounds[];
  readonly rest: number;
}

/** A screen's row count, at least one and at most `MAX_SCREEN_ROWS`. */
export const screenRows = (rows: number): number =>
  Math.min(MAX_SCREEN_ROWS, Math.max(1, Math.floor(rows)));

/** A move clamped to a page, so any target fits one read. */
const clampMove = (rows: number, screen: number): number =>
  Math.max(-screen, Math.min(screen, Math.trunc(rows)));

/**
 * The bytes `target` needs on a screen of `screen` rows: back far enough to
 * find the row holding the anchor, move up a page, and pull the last screen
 * up to the end of the file; forward far enough to move down a page and fill
 * the screen. Always within one read of `VIEWER_MAX_READ_BYTES`.
 */
function neededWindow(target: ViewTarget, screen: number): ReadWindow {
  const rows = screenRows(screen);
  const move = clampMove(target.rows, rows);
  const before = LOOKBEHIND_BYTES + (Math.max(0, -move) + rows + 1) * MAX_ROW_BYTES;
  const after = (Math.max(0, move) + rows + 1) * MAX_ROW_BYTES;
  const offset = Math.max(0, target.anchor - before);

  return { offset, length: Math.min(VIEWER_MAX_READ_BYTES, target.anchor + after - offset) };
}

/**
 * The one read for a target the view does not hold: what it needs, widened
 * evenly to a full bounded read so the rows around it scroll without
 * another. A read never exceeds `VIEWER_MAX_READ_BYTES`, whatever the file.
 */
export function readWindowFor(target: ViewTarget, screen: number): ReadWindow {
  const needed = neededWindow(target, screen);
  const offset = Math.max(0, needed.offset - (VIEWER_MAX_READ_BYTES - needed.length) / 2);

  return { offset: Math.floor(offset), length: VIEWER_MAX_READ_BYTES };
}

/** Whether `chunk` holds everything `target` needs, so it resolves without a read. */
export function covers(chunk: TextChunk | null, target: ViewTarget, screen: number): boolean {
  if (chunk === null) return false;

  const window = neededWindow(target, screen);

  return (
    chunk.offset <= window.offset &&
    (chunk.eof || chunk.offset + chunk.bytes.length >= window.offset + window.length)
  );
}

/**
 * The screen `target` lands on. The top row is the row holding the anchor,
 * moved by the target's rows, at most a page; past the end it is pulled back
 * until at least `minimumRows` rows show (the rows that fit whole when lines
 * do not wrap, one row when they do, since a wrapped row can fill the screen
 * alone). Null for a file with no text.
 */
export function resolveViewport(
  chunk: TextChunk,
  layout: TextLayout,
  target: ViewTarget,
  screen: number,
  minimumRows: number
): Viewport | null {
  const rows = screenRows(screen);
  const move = clampMove(target.rows, rows);
  let top = rowContaining(chunk, layout, target.anchor);
  let moved = 0;

  if (top === null) return null;

  if (move > 0) {
    for (; moved < move; moved += 1) {
      const next: RowStart | null | undefined = rowAt(chunk, layout, top)?.next;
      if (next === null || next === undefined) break;
      top = next;
    }
  } else if (move < 0) {
    const before = rowsBefore(chunk, layout, top, -move);
    top = before[0] ?? top;
    moved = -before.length;
  }

  let shown = rowsFrom(chunk, layout, top, rows);
  const wanted = Math.min(rows, Math.max(1, minimumRows));

  if (shown.end && shown.rows.length < wanted) {
    const back = rowsBefore(chunk, layout, top, wanted - shown.rows.length);

    if (back[0] !== undefined) {
      top = back[0];
      shown = rowsFrom(chunk, layout, top, rows);
    }
  }

  // A move cut short by the start or end of the file is done.
  return { top, rows: shown.rows, rest: moved === move ? Math.trunc(target.rows) - move : 0 };
}

/**
 * The line number for each row: the first row's line is `firstLine` (the
 * line holding its first byte); each later row that starts a line counts one
 * more. A row that continues a line gets null.
 */
export function numberRows(rows: readonly RowStart[], firstLine: number): Array<number | null> {
  let line = firstLine;

  return rows.map((row, index) => {
    if (index > 0 && row.kind === 'line') line += 1;

    return row.kind === 'line' ? line : null;
  });
}

/** A known line: the line holding byte `offset`. */
export interface LineAnchor {
  readonly offset: number;
  readonly line: number;
}

/**
 * The line holding byte `offset`, carried from a known line by counting the
 * line breaks between them in `chunk`; null when the chunk does not hold
 * both.
 */
export function lineFromAnchor(
  chunk: TextChunk,
  layout: TextLayout,
  anchor: LineAnchor,
  offset: number
): number | null {
  const end = chunk.offset + chunk.bytes.length;
  const holds = (position: number): boolean => position >= chunk.offset && position <= end;

  if (!holds(anchor.offset) || !holds(offset)) return null;

  return offset >= anchor.offset
    ? anchor.line + countLineBreaks(chunk, layout, anchor.offset, offset)
    : anchor.line - countLineBreaks(chunk, layout, offset, anchor.offset);
}
