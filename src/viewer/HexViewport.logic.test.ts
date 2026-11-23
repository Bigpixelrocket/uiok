import { describe, expect, it } from 'vitest';

import { VIEWER_MAX_READ_BYTES } from './types.js';

import { positionForThumb, thumbGeometry } from './ScaledScroll.logic.js';
import {
  clampTop,
  covers,
  endAfterRead,
  HEX_READ_BYTES,
  hexScrollRange,
  lastTopRow,
  readWindowFor,
  rowOfByte,
  rowsFrom,
  type HexChunk
} from './HexViewport.logic.js';

const GB = 1024 ** 3;
const HUGE = 128 * GB;
const chunk = (offset: number, length: number, eof = false): HexChunk => ({
  offset,
  bytes: new Uint8Array(length),
  eof
});

describe('the hex viewport', () => {
  it('reads one bounded, row-aligned window around any row of a 128 GB file', () => {
    for (const top of [0, 1, 4096, rowOfByte(64 * GB) + 7, lastTopRow(HUGE, 40)]) {
      const window = readWindowFor(top, 40);

      expect(window.length).toBe(HEX_READ_BYTES);
      expect(window.length).toBeLessThanOrEqual(VIEWER_MAX_READ_BYTES);
      expect(window.offset % 16).toBe(0);
      expect(window.offset).toBeLessThanOrEqual(top * 16);
      expect(window.offset + window.length).toBeGreaterThanOrEqual((top + 40) * 16);
    }
  });

  it('maps a thumb to the row holding the byte it points at, at 128 GB', () => {
    const range = hexScrollRange(HUGE, 40);
    const span = { ...range, trackPx: 600 };

    expect(rowOfByte(positionForThumb(span, 0))).toBe(0);
    // The bottom of the track is the last screen, whose last row is the file's last.
    expect(rowOfByte(positionForThumb(span, 600))).toBe(lastTopRow(HUGE, 40));
    expect(lastTopRow(HUGE, 40) + 40).toBe(HUGE / 16);

    for (const pixel of [1, 123.5, 288, 575]) {
      const byte = positionForThumb(span, pixel);
      const row = rowOfByte(byte);
      expect(row * 16).toBeLessThanOrEqual(byte);
      expect(byte).toBeLessThan(row * 16 + 16);
    }

    // A row's thumb maps back to that row, to within a pixel's worth of rows.
    const middle = rowOfByte(64 * GB);
    const back = rowOfByte(positionForThumb(span, thumbGeometry(span, middle * 16).topPx));
    expect(Math.abs(back - middle)).toBeLessThanOrEqual(1);
  });

  it('keeps the top row between the first row and the last screen', () => {
    expect(clampTop(-5, 1000, 10)).toBe(0);
    expect(clampTop(3.7, 1000, 10)).toBe(3);
    // 1,000 bytes are 63 rows, the last of 8 bytes.
    expect(clampTop(Infinity, 1000, 10)).toBe(53);
    expect(clampTop(Infinity, 100, 40)).toBe(0);
    expect(clampTop(Infinity, HUGE, 40)).toBe(HUGE / 16 - 40);
  });

  it('ends the view where a read found the file shrunk, never past the end it had', () => {
    expect(endAfterRead(chunk(0, 4096), 5000)).toBe(5000);
    expect(endAfterRead(chunk(0, 1200, true), 5000)).toBe(1200);
    expect(endAfterRead(chunk(1024, 176, true), 5000)).toBe(1200);
    expect(endAfterRead(chunk(0, 0, true), 5000)).toBe(0);
    // A file that grew still ends where it did.
    expect(endAfterRead(chunk(0, 9000, true), 5000)).toBe(5000);
    // An empty read from past the end does not say where the end is.
    expect(endAfterRead(chunk(4096, 0, true), 5000)).toBeNull();
  });

  it('holds a screen when the chunk reaches its last row or the end of the file', () => {
    expect(covers(null, 0, 40)).toBe(false);
    expect(covers(chunk(0, 640), 0, 40)).toBe(true);
    expect(covers(chunk(0, 639), 0, 40)).toBe(false);
    expect(covers(chunk(0, 100, true), 0, 40)).toBe(true);
    expect(covers(chunk(16, 640), 0, 40)).toBe(false);
  });

  it('cuts the screen into rows of 16, the last one short', () => {
    const rows = rowsFrom(chunk(0, 40, true), 0, 10, 40);

    expect(rows.map((row) => [row.offset, row.bytes.length])).toEqual([
      [0, 16],
      [16, 16],
      [32, 8]
    ]);
    expect(rowsFrom(chunk(0, 40, true), 1, 1, 40).map((row) => row.offset)).toEqual([16]);
    expect(rowsFrom(chunk(64, 640), 2, 4, 1000)).toEqual([]);
  });
});
