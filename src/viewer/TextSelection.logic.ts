/**
 * The text view's selection. The screen holds only the rows in view, so the
 * selection is kept in file terms (a row's starting byte and a character in
 * its text) and survives scrolling the rows it spans out of the page. Copy
 * reads the selected rows in one bounded read and refuses a selection
 * larger than that, with a message, instead of reading the file whole.
 */

import { VIEWER_MAX_READ_BYTES } from './types.js';
import type { ViewerLabels } from '../labels/viewer.js';

import { MAX_ROW_BYTES, type RowKind } from './TextRows.logic.js';

/** A place in the text: character `char` of the row starting at byte `row`. */
export interface TextPoint {
  readonly row: number;
  readonly kind: RowKind;
  readonly char: number;
}

/** Where a selection started and where it was taken to; either may come first in the file. */
export interface TextSelection {
  readonly anchor: TextPoint;
  readonly focus: TextPoint;
}

/** The largest selection copy reads, in bytes of the file. */
export const MAX_COPY_BYTES = VIEWER_MAX_READ_BYTES;

/** Copy for a selection larger than copy will read. */
export function selectionTooLarge(labels: ViewerLabels): string {
  return labels.text.copyTooLarge(labels.size(MAX_COPY_BYTES));
}

/** Orders two points by their place in the file. */
export function comparePoints(a: TextPoint, b: TextPoint): number {
  return a.row !== b.row ? a.row - b.row : a.char - b.char;
}

/** The selection's start and end in file order. */
export function orderedSelection({
  anchor,
  focus
}: TextSelection): readonly [TextPoint, TextPoint] {
  return comparePoints(anchor, focus) <= 0 ? [anchor, focus] : [focus, anchor];
}

/** Whether a selection selects nothing. */
export const isCollapsed = (selection: TextSelection): boolean =>
  comparePoints(selection.anchor, selection.focus) === 0;

/**
 * The part of a row a selection covers, as character offsets into the row's
 * text of `length` characters, or null when it covers none of it.
 */
export function selectedSpan(
  selection: TextSelection,
  row: number,
  length: number
): { readonly from: number; readonly to: number } | null {
  const [start, end] = orderedSelection(selection);
  if (row < start.row || row > end.row) return null;

  const from = row === start.row ? Math.min(start.char, length) : 0;
  const to = row === end.row ? Math.min(end.char, length) : length;

  return to > from ? { from, to } : null;
}

/**
 * The bytes copy reads for a selection: from its first row's start to the
 * end of its last row, which is at most a row past where that row starts.
 * Null when that is more than copy will read.
 */
export function copyRange(
  selection: TextSelection,
  fileEnd: number
): { readonly offset: number; readonly length: number } | null {
  const [start, end] = orderedSelection(selection);
  const stop = Math.min(fileEnd, end.row + MAX_ROW_BYTES);
  const length = Math.max(0, stop - start.row);

  return length <= MAX_COPY_BYTES ? { offset: start.row, length } : null;
}

/**
 * A row as copy sees it: its bytes [start, end), whether it begins a line,
 * its text, and the line break that ends it as the file spells it (empty for
 * a row a segment break ends, or the file's last row without one).
 */
export interface CopyRow {
  readonly start: number;
  readonly end: number;
  readonly kind: RowKind;
  readonly text: string;
  readonly lineBreak: string;
}

/**
 * The selected text from the rows it spans, in order from the selection's
 * first row: rows of one line join directly, and a row's line break, CRLF
 * or LF as the file has it, is copied when the selection runs past the row,
 * including to the end of the file.
 */
export function selectedText(selection: TextSelection, rows: readonly CopyRow[]): string {
  const [start, end] = orderedSelection(selection);
  let text = '';

  for (const row of rows) {
    if (row.start < start.row) continue;
    if (row.start > end.row) break;

    const from = row.start === start.row ? start.char : 0;
    const to = row.start === end.row ? end.char : row.text.length;
    text += row.text.slice(from, Math.max(from, to));
    if (end.row >= row.end) text += row.lineBreak;
  }

  return text;
}

/** Characters a word is made of: letters, marks, digits, and the underscore, as a code editor counts them. */
const WORD_CHARACTER = /[\p{L}\p{M}\p{N}_]/u;
const SPACE_CHARACTER = /[^\S\n]/u;

/**
 * The word a double click at character `char` of `text` selects, as
 * character offsets: a run of word characters, a run of spaces, or the one
 * other character there, both halves of it for a character past U+FFFF (an
 * emoji). A click past the last character takes the last.
 */
export function wordAt(text: string, char: number): { readonly from: number; readonly to: number } {
  if (text.length === 0) return { from: 0, to: 0 };

  // A caret right after a word (a click on its last letter's right half)
  // means that word, not the character after it.
  let at = Math.max(0, Math.min(char, text.length - 1));
  if (!WORD_CHARACTER.test(text[at] ?? '') && WORD_CHARACTER.test(text[at - 1] ?? '')) at -= 1;

  const character = text[at] ?? '';
  const kind = WORD_CHARACTER.test(character)
    ? WORD_CHARACTER
    : SPACE_CHARACTER.test(character)
      ? SPACE_CHARACTER
      : null;
  if (kind === null) {
    const low = character >= '\udc00' && character <= '\udfff';
    const from = low && (text.codePointAt(at - 1) ?? 0) > 0xffff ? at - 1 : at;
    return { from, to: from + ((text.codePointAt(from) ?? 0) > 0xffff ? 2 : 1) };
  }

  let from = at;
  let to = at + 1;
  while (from > 0 && kind.test(text[from - 1] ?? '')) from -= 1;
  while (to < text.length && kind.test(text[to] ?? '')) to += 1;

  return { from, to };
}

/** A stretch of a row drawn as one span: characters [from, to), whether selected, and its token style. */
export interface RowPart {
  readonly from: number;
  readonly to: number;
  readonly selected: boolean;
  /** An index into the highlighting's styles, or null for the text's own style. */
  readonly style: number | null;
}

/**
 * A row of `length` characters cut where the selected `span` and the
 * highlighting `tokens` (sorted, not overlapping) begin and end, so each
 * part draws in one style, selected or not.
 */
export function rowParts(
  length: number,
  tokens:
    readonly { readonly start: number; readonly end: number; readonly style: number }[] | null,
  span: { readonly from: number; readonly to: number } | null
): RowPart[] {
  const cuts = new Set([0, length]);
  if (span !== null) {
    cuts.add(span.from);
    cuts.add(span.to);
  }
  for (const token of tokens ?? []) {
    cuts.add(Math.min(token.start, length));
    cuts.add(Math.min(token.end, length));
  }

  const points = [...cuts].sort((a, b) => a - b);
  const parts: RowPart[] = [];
  let next = 0;

  for (let index = 0; index + 1 < points.length; index += 1) {
    const from = points[index] ?? 0;
    const to = points[index + 1] ?? 0;
    while (tokens && next < tokens.length && (tokens[next]?.end ?? 0) <= from) next += 1;

    const token = tokens?.[next];
    parts.push({
      from,
      to,
      selected: span !== null && from >= span.from && to <= span.to,
      style: token !== undefined && token.start <= from ? token.style : null
    });
  }

  return parts;
}
