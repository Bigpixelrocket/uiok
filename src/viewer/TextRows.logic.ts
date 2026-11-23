/**
 * The text view's row model, the way `less` reads a file: from any byte, back
 * up to the start of its row, then read forward one screenful. Nothing here
 * needs the whole file, only a chunk of bytes around the place in view.
 *
 * A row starts at every line start. A line longer than a segment is split
 * into display segments, so a gigabyte with no line break is still drawn one
 * bounded row at a time. Where a line breaks is a pure function of the bytes
 * near the break, never of where the line began: a line starting at `L`
 * breaks at the first multiple of `SEGMENT_BYTES` at least one segment past
 * `L`, then at every multiple after it, each moved forward to the next
 * character boundary, and never right before the line's own line break. So a
 * row is found the same way scrolling down to it, scrolling up to it, or
 * jumping into the middle of a line whose start lies a gigabyte back, and
 * the reader never has to look further back than `LOOKBEHIND_BYTES`.
 *
 * Rows carry byte offsets and their decoded text, so the plain view draws
 * them and syntax highlighting can tokenize the same rows later.
 */

import type { TextLayout } from './TextEncoding.logic.js';

/** The longest stretch of one line drawn as one row before it is split. */
export const SEGMENT_BYTES = 1024;

/**
 * The longest a row can be: the first row of a long line runs up to the
 * second segment boundary past its start, plus a character's realignment and
 * a line break kept on its row.
 */
export const MAX_ROW_BYTES = 2 * SEGMENT_BYTES + 8;

/** How far back from a byte the reader may look to find the start of its row. */
export const LOOKBEHIND_BYTES = 3 * SEGMENT_BYTES;

/** A row begins a line, or continues one past a segment boundary. */
export type RowKind = 'line' | 'continuation';

/** Where a row starts. */
export interface RowStart {
  readonly start: number;
  readonly kind: RowKind;
}

/** One row: its bytes are [start, end); its text is [start, textEnd), without the line break. */
export interface RowBounds extends RowStart {
  readonly end: number;
  readonly textEnd: number;
  /** The row after it, or null when this row ends the file. */
  readonly next: RowStart | null;
}

/** Bytes read from the file at `offset`; `eof` says they run to the end of the file. */
export interface TextChunk {
  readonly offset: number;
  readonly bytes: Uint8Array;
  readonly eof: boolean;
}

const chunkEnd = (chunk: TextChunk): number => chunk.offset + chunk.bytes.length;

const byteAt = (chunk: TextChunk, position: number): number | undefined =>
  chunk.bytes[position - chunk.offset];

/** Bytes per code unit: a line break is one unit. */
const unitBytes = ({ encoding }: TextLayout): number =>
  encoding === 'utf-16le' || encoding === 'utf-16be' ? 2 : 1;

/** Whether the code unit at `position` is `code` (an ASCII control such as 0A or 0D). */
function unitIs(chunk: TextChunk, layout: TextLayout, position: number, code: number): boolean {
  switch (layout.encoding) {
    case 'utf-16le':
      return (
        position % 2 === 0 &&
        byteAt(chunk, position) === code &&
        byteAt(chunk, position + 1) === 0x00
      );
    case 'utf-16be':
      return (
        position % 2 === 0 &&
        byteAt(chunk, position) === 0x00 &&
        byteAt(chunk, position + 1) === code
      );
    default:
      return byteAt(chunk, position) === code;
  }
}

/** The unit holding the 0A byte found at `found`, or -1 when it is no line break. */
function breakUnitAt(chunk: TextChunk, layout: TextLayout, found: number): number {
  const unit = layout.encoding === 'utf-16be' ? found - 1 : found;

  return unitIs(chunk, layout, unit, 0x0a) ? unit : -1;
}

/** The first line break starting in [from, to), or -1. Scans only those bytes. */
function findBreak(chunk: TextChunk, layout: TextLayout, from: number, to: number): number {
  // A UTF-16BE break's 0A byte sits one past its unit's start.
  const limit = Math.min(to + unitBytes(layout) - 1, chunkEnd(chunk));
  let search = Math.max(from, chunk.offset);

  while (search < limit) {
    const index = chunk.bytes.subarray(search - chunk.offset, limit - chunk.offset).indexOf(0x0a);
    if (index === -1) return -1;

    const found = search + index;
    const unit = breakUnitAt(chunk, layout, found);
    if (unit >= from && unit < to) return unit;
    search = found + 1;
  }

  return -1;
}

/** The last line break starting in [from, to), or -1. Scans only those bytes. */
function findBreakBefore(chunk: TextChunk, layout: TextLayout, from: number, to: number): number {
  const lowest = Math.max(from, chunk.offset);
  let limit = Math.min(to + unitBytes(layout) - 1, chunkEnd(chunk));

  while (limit > lowest) {
    const index = chunk.bytes
      .subarray(lowest - chunk.offset, limit - chunk.offset)
      .lastIndexOf(0x0a);
    if (index === -1) return -1;

    const found = lowest + index;
    const unit = breakUnitAt(chunk, layout, found);
    if (unit >= from && unit < to) return unit;
    limit = found;
  }

  return -1;
}

/**
 * The first character boundary at or after `position`: past UTF-8
 * continuation bytes, onto an even offset for UTF-16, and past the low half
 * of a surrogate pair. Looks at no more than four bytes.
 */
export function alignToCharacter(chunk: TextChunk, layout: TextLayout, position: number): number {
  switch (layout.encoding) {
    case 'utf-8': {
      let aligned = position;
      while (aligned - position < 3 && ((byteAt(chunk, aligned) ?? 0) & 0xc0) === 0x80) {
        aligned += 1;
      }
      return aligned;
    }
    case 'utf-16le':
    case 'utf-16be': {
      const even = position + (position % 2);
      const high = byteAt(chunk, layout.encoding === 'utf-16le' ? even + 1 : even) ?? 0;
      return high >= 0xdc && high <= 0xdf ? even + 2 : even;
    }
    case 'latin-1':
      return position;
  }
}

/** The segment boundary a row's split is measured from: the next one at least a segment past it. */
function nextSegmentBoundary({ start, kind }: RowStart): number {
  const base = kind === 'line' ? start : start - (start % SEGMENT_BYTES);

  return Math.ceil((base + SEGMENT_BYTES) / SEGMENT_BYTES) * SEGMENT_BYTES;
}

/**
 * The row starting at `row`, or null when the chunk ends before its end can
 * be known. `row` must be a row start: a line start or a segment break.
 */
export function rowAt(chunk: TextChunk, layout: TextLayout, row: RowStart): RowBounds | null {
  const unit = unitBytes(layout);
  const end = chunkEnd(chunk);
  const split = alignToCharacter(chunk, layout, nextSegmentBoundary(row));
  // A break up to one unit past the split still ends this row, so a line
  // break (with its carriage return) is never split from its line.
  const lineBreak = findBreak(chunk, layout, row.start, split + 2 * unit);

  if (lineBreak === -1 && !chunk.eof && split + 2 * unit + 4 > end) {
    // The split's character and any break right after it lie past the chunk.
    return null;
  }

  if (lineBreak !== -1) {
    const carriageReturn =
      lineBreak - unit >= row.start && unitIs(chunk, layout, lineBreak - unit, 0x0d);
    const textEnd = carriageReturn ? lineBreak - unit : lineBreak;

    if (textEnd <= split) {
      const nextStart = lineBreak + unit;

      return {
        ...row,
        end: nextStart,
        textEnd,
        next: chunk.eof && nextStart >= end ? null : { start: nextStart, kind: 'line' }
      };
    }
  }

  if (chunk.eof && split >= end) {
    return { ...row, end, textEnd: end, next: null };
  }

  return { ...row, end: split, textEnd: split, next: { start: split, kind: 'continuation' } };
}

/**
 * The row holding byte `position`: back up to the last line start within
 * `LOOKBEHIND_BYTES`, or, inside a longer line, to a segment break that
 * line is sure to have, then walk forward to the row. Null for an empty file.
 * A position past the end of the file finds the last row.
 */
export function rowContaining(
  chunk: TextChunk,
  layout: TextLayout,
  position: number
): RowStart | null {
  const end = chunkEnd(chunk);
  let target = Math.max(position, layout.contentStart);

  if (chunk.eof && target >= end) {
    if (end <= layout.contentStart) return null;
    target = end - 1;
  }

  const from = Math.max(layout.contentStart, target - LOOKBEHIND_BYTES, chunk.offset);
  const lastBreak = findBreakBefore(chunk, layout, from, target - unitBytes(layout) + 1);
  let row: RowStart;

  if (lastBreak !== -1) {
    row = { start: lastBreak + unitBytes(layout), kind: 'line' };
  } else if (from === layout.contentStart) {
    row = { start: layout.contentStart, kind: 'line' };
  } else {
    // The line began before `from`, so it breaks at every segment boundary
    // a segment or more past `from` until it ends, which is after `target`.
    const boundary = Math.ceil((from + SEGMENT_BYTES) / SEGMENT_BYTES) * SEGMENT_BYTES;
    row = { start: alignToCharacter(chunk, layout, boundary), kind: 'continuation' };
  }

  for (;;) {
    const bounds = rowAt(chunk, layout, row);
    if (bounds === null || bounds.next === null || bounds.next.start > target) return row;
    row = bounds.next;
  }
}

/**
 * The start of the line holding byte `position`, looking back no further
 * than `maxBytes`; null when no line starts that close in the chunk (the
 * line is longer, or the chunk does not reach back far enough).
 */
export function lineStartBefore(
  chunk: TextChunk,
  layout: TextLayout,
  position: number,
  maxBytes: number
): number | null {
  const from = Math.max(layout.contentStart, position - maxBytes);
  const lastBreak = findBreakBefore(
    chunk,
    layout,
    Math.max(from, chunk.offset),
    position - unitBytes(layout) + 1
  );

  if (lastBreak !== -1) return lastBreak + unitBytes(layout);

  return from === layout.contentStart && from >= chunk.offset ? from : null;
}

/**
 * Up to `count` rows from `row` onward, and whether they reach the end of
 * the file. Stops early, with `end` false, where the chunk runs out.
 */
export function rowsFrom(
  chunk: TextChunk,
  layout: TextLayout,
  row: RowStart,
  count: number
): { readonly rows: readonly RowBounds[]; readonly end: boolean } {
  const rows: RowBounds[] = [];
  let next: RowStart | null = row;

  while (next !== null && rows.length < count) {
    if (chunk.eof && next.start >= chunkEnd(chunk)) return { rows, end: true };

    const bounds = rowAt(chunk, layout, next);
    if (bounds === null) return { rows, end: false };

    rows.push(bounds);
    next = bounds.next;
  }

  return { rows, end: next === null };
}

/** Up to `count` row starts before `row`, nearest last; fewer at the start of the file. */
export function rowsBefore(
  chunk: TextChunk,
  layout: TextLayout,
  row: RowStart,
  count: number
): readonly RowStart[] {
  if (count <= 0 || row.start <= layout.contentStart) return [];

  const from = rowContaining(chunk, layout, row.start - count * MAX_ROW_BYTES - 1);
  const starts: RowStart[] = [];
  let next: RowStart | null = from;

  while (next !== null && next.start < row.start) {
    starts.push(next);
    next = rowAt(chunk, layout, next)?.next ?? null;
  }

  return starts.slice(-count);
}

/** Line breaks starting in [from, to), as far as the chunk holds them. */
export function countLineBreaks(
  chunk: TextChunk,
  layout: TextLayout,
  from: number,
  to: number
): number {
  let count = 0;
  let search = from;

  for (;;) {
    const found = findBreak(chunk, layout, search, to);
    if (found === -1) return count;

    count += 1;
    search = found + unitBytes(layout);
  }
}
