/**
 * What the hex view shows and what it must read to show it. Row N starts at
 * byte N × 16, so the screen is named by its top row alone and any row is
 * one bounded read away; a move of any length just changes the top row, so
 * moves made while a read is in flight add up without carrying a remainder.
 */

import { BYTES_PER_ROW, rowCount } from './HexRows.logic.js';

/**
 * Bytes one read asks for: 4,096 rows around the screen, so scrolling a few
 * screens either way needs no other read, and a fling's reads stay cheap.
 */
export const HEX_READ_BYTES = 64 * 1024;

/** Bytes the view holds from one read: `bytes` from `offset`, and whether they reach the file's end. */
export interface HexChunk {
  readonly offset: number;
  readonly bytes: Uint8Array;
  readonly eof: boolean;
}

/** One row on screen: its first byte's offset and its bytes, 16 or fewer on the last row. */
export interface HexRow {
  readonly offset: number;
  readonly bytes: Uint8Array;
}

/**
 * Where the readable bytes end after a read, given `end`, where they ended
 * before it: less when the read reached the end of a file that has since
 * shrunk, and never more, since the view does not tail a file that grew.
 * Null when the read came back empty from past the end, which says the file
 * is shorter but not by how much: the view then asks the file's size rather
 * than step back a read at a time.
 */
export function endAfterRead(chunk: HexChunk, end: number): number | null {
  if (!chunk.eof) return end;
  if (chunk.bytes.length === 0 && chunk.offset > 0) return null;

  return Math.min(end, chunk.offset + chunk.bytes.length);
}

/** The last top row: the one that shows the file's last row at the bottom of a screen of `fullRows` whole rows. */
export const lastTopRow = (end: number, fullRows: number): number =>
  Math.max(0, rowCount(end) - Math.max(1, fullRows));

/** A top row kept between the first row and the last screen; Infinity is the last screen. */
export const clampTop = (row: number, end: number, fullRows: number): number =>
  Math.max(0, Math.min(Math.floor(row), lastTopRow(end, fullRows)));

/**
 * The one read for a screen starting at row `top`: `HEX_READ_BYTES` from a
 * row boundary, centred on the screen so it serves moves either way.
 */
export function readWindowFor(
  top: number,
  screenRows: number
): { readonly offset: number; readonly length: number } {
  const screenBytes = screenRows * BYTES_PER_ROW;
  const before = Math.max(0, Math.floor((HEX_READ_BYTES - screenBytes) / 2));
  const start = Math.max(0, top * BYTES_PER_ROW - before);

  return { offset: start - (start % BYTES_PER_ROW), length: HEX_READ_BYTES };
}

/**
 * Whether `chunk` holds the screen starting at row `top`: its first byte,
 * and every byte through the screen's last or the end of the file.
 */
export function covers(chunk: HexChunk | null, top: number, screenRows: number): boolean {
  if (chunk === null) return false;

  const from = top * BYTES_PER_ROW;
  const to = (top + screenRows) * BYTES_PER_ROW;

  return chunk.offset <= from && (chunk.eof || chunk.offset + chunk.bytes.length >= to);
}

/** Up to `screenRows` rows from row `top` that `chunk` holds, stopping at `end`. */
export function rowsFrom(chunk: HexChunk, top: number, screenRows: number, end: number): HexRow[] {
  const held = chunk.offset + chunk.bytes.length;
  const rows: HexRow[] = [];

  for (let index = 0; index < screenRows; index += 1) {
    const offset = (top + index) * BYTES_PER_ROW;
    const stop = Math.min(offset + BYTES_PER_ROW, end, held);
    if (offset < chunk.offset || offset >= stop) break;

    rows.push({
      offset,
      bytes: chunk.bytes.subarray(offset - chunk.offset, stop - chunk.offset)
    });
  }

  return rows;
}

/**
 * What the scrollbar spans for a file of `sizeBytes` on a screen of
 * `fullRows` whole rows: bytes rounded up to whole rows, so the bottom of the
 * track is the last screen.
 */
export const hexScrollRange = (
  sizeBytes: number,
  fullRows: number
): { readonly total: number; readonly visible: number } => ({
  total: rowCount(sizeBytes) * BYTES_PER_ROW,
  visible: Math.max(1, fullRows) * BYTES_PER_ROW
});

/** The row holding a byte, which is where a thumb pointing at that byte lands. */
export const rowOfByte = (offset: number): number => Math.floor(offset / BYTES_PER_ROW);
