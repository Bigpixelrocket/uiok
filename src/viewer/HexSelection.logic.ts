/**
 * The hex view's selection and copy. A selection is a range of bytes, both
 * ends included, kept in file terms so it survives scrolling, and remembers
 * the column it was made in: Copy gives the hex digits for a selection made
 * in the hex column and the text for one made in the text column, and the
 * status bar copies either form. Copy reads at most one bounded read and
 * refuses a larger selection with a message instead of reading more.
 */

import { VIEWER_MAX_READ_BYTES } from './types.js';
import type { ViewerLabels } from '../labels/viewer.js';

import { BYTES_PER_ROW, hexByte, textChar, type HexColumn } from './HexRows.logic.js';

/** Where a selection started and where it was taken to, both bytes included, and the column it was made in. */
export interface HexSelection {
  readonly anchor: number;
  readonly focus: number;
  readonly column: HexColumn;
}

/** The largest selection copy reads, in bytes. */
export const MAX_HEX_COPY_BYTES = VIEWER_MAX_READ_BYTES;

/** Copy for a selection larger than copy will read. */
export function hexSelectionTooLarge(labels: ViewerLabels): string {
  return labels.hex.copyTooLarge(labels.size(MAX_HEX_COPY_BYTES));
}

/** The selected bytes as [start, end): its first byte and one past its last. */
export function selectedRange(selection: HexSelection): {
  readonly start: number;
  readonly end: number;
} {
  return {
    start: Math.min(selection.anchor, selection.focus),
    end: Math.max(selection.anchor, selection.focus) + 1
  };
}

/**
 * The part of a row of `length` bytes from `rowOffset` a selection covers,
 * as byte indexes [from, to) into the row, or null when it covers none.
 */
export function selectedCells(
  selection: HexSelection,
  rowOffset: number,
  length: number
): { readonly from: number; readonly to: number } | null {
  const { start, end } = selectedRange(selection);
  const from = Math.max(0, start - rowOffset);
  const to = Math.min(length, end - rowOffset);

  return to > from ? { from, to } : null;
}

/**
 * The bytes copy reads for a selection, cut at `fileEnd`; null when that is
 * more than copy will read.
 */
export function copyRange(
  selection: HexSelection,
  fileEnd: number
): { readonly offset: number; readonly length: number } | null {
  const { start, end } = selectedRange(selection);
  const length = Math.max(0, Math.min(end, fileEnd) - start);

  return length <= MAX_HEX_COPY_BYTES ? { offset: start, length } : null;
}

/** Bytes as copy gives them in hex: two uppercase digits each, a space between. */
export function hexCopy(bytes: Uint8Array): string {
  return Array.from(bytes, hexByte).join(' ');
}

/** Bytes as copy gives them as text: what the text column shows, `.` for every byte outside printable ASCII. */
export function textCopy(bytes: Uint8Array): string {
  return Array.from(bytes, textChar).join('');
}

/** The steps Shift with an arrow takes the selection's moving end: a row up or down, a byte sideways. */
export const SELECTION_STEPS = {
  ArrowUp: -BYTES_PER_ROW,
  ArrowDown: BYTES_PER_ROW,
  ArrowLeft: -1,
  ArrowRight: 1
} as const;

/**
 * The selection with its moving end taken `delta` bytes, kept inside a file
 * of `fileEnd` bytes. With no selection, it starts at byte `from`.
 */
export function extendSelection(
  selection: HexSelection | null,
  delta: number,
  from: number,
  fileEnd: number
): HexSelection | null {
  if (fileEnd <= 0) return null;

  const start = selection ?? { anchor: from, focus: from, column: 'hex' as const };
  const focus = Math.max(0, Math.min(fileEnd - 1, start.focus + delta));

  return { ...start, focus };
}
