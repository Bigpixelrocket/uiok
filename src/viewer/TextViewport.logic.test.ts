import { describe, expect, it } from 'vitest';

import { VIEWER_MAX_READ_BYTES } from './types.js';

import type { TextLayout } from './TextEncoding.logic.js';
import { LOOKBEHIND_BYTES, SEGMENT_BYTES, type TextChunk } from './TextRows.logic.js';
import {
  covers,
  lineFromAnchor,
  MAX_SCREEN_ROWS,
  numberRows,
  readWindowFor,
  resolveViewport,
  type ViewTarget
} from './TextViewport.logic.js';

const UTF8: TextLayout = { encoding: 'utf-8', contentStart: 0 };
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

/** A large file in memory, read the way the view reads: one window per target. */
const fileOf =
  (bytes: Uint8Array) =>
  (target: ViewTarget, screen: number): TextChunk => {
    const window = readWindowFor(target, screen);
    const end = Math.min(bytes.length, window.offset + window.length);
    return {
      offset: window.offset,
      bytes: bytes.subarray(window.offset, end),
      eof: end >= bytes.length
    };
  };

const lines = (count: number): string =>
  Array.from({ length: count }, (_, index) => `line ${index + 1}`).join('\n') + '\n';

describe('readWindowFor', () => {
  it('stays within one bounded read for any target on the tallest screen', () => {
    for (const rows of [-1000, -MAX_SCREEN_ROWS, -1, 0, 1, MAX_SCREEN_ROWS, 1000]) {
      const window = readWindowFor({ anchor: 10 ** 12, rows }, 10_000);
      expect(window.length, String(rows)).toBeLessThanOrEqual(VIEWER_MAX_READ_BYTES);
      expect(window.offset).toBeLessThanOrEqual(10 ** 12);
    }
  });

  it('starts at the start of the file for a target near it', () => {
    expect(readWindowFor({ anchor: 10, rows: 0 }, 40).offset).toBe(0);
  });
});

describe('covers', () => {
  it('holds a read for a target and the rows around it, but not a chunk short of what it needs', () => {
    const target = { anchor: 5_000_000, rows: 0 };
    const window = readWindowFor(target, 40);
    const read = { offset: window.offset, bytes: new Uint8Array(window.length), eof: false };

    expect(covers(read, target, 40)).toBe(true);
    expect(covers(read, { anchor: target.anchor + 100_000, rows: 40 }, 40)).toBe(true);
    expect(covers(read, { anchor: target.anchor + 2_000_000, rows: 0 }, 40)).toBe(false);
    // Too little behind the anchor to back up to its row, or too little after it.
    const behind = {
      offset: target.anchor - LOOKBEHIND_BYTES,
      bytes: new Uint8Array(500_000),
      eof: false
    };
    expect(covers(behind, target, 40)).toBe(false);
    const short = {
      offset: window.offset,
      bytes: new Uint8Array(target.anchor - window.offset + 10),
      eof: false
    };
    expect(covers(short, target, 40)).toBe(false);
    expect(covers({ ...short, eof: true }, target, 40)).toBe(true);
    expect(covers(null, target, 40)).toBe(false);
  });
});

describe('resolveViewport', () => {
  const text = lines(100_000);
  const bytes = encode(text);
  const read = fileOf(bytes);
  const resolve = (target: ViewTarget, screen = 10, minimum = screen) =>
    resolveViewport(read(target, screen), UTF8, target, screen, minimum);
  const lineAt = (offset: number): string => text.slice(offset, text.indexOf('\n', offset));

  it('opens on the first screen', () => {
    const viewport = resolve({ anchor: 0, rows: 0 });
    expect(viewport?.top).toEqual({ start: 0, kind: 'line' });
    expect(viewport?.rows).toHaveLength(10);
  });

  it('lands a jump to any byte on the start of its line, within the one read', () => {
    const anchor = Math.floor(bytes.length * 0.61) + 3;
    const viewport = resolve({ anchor, rows: 0 });
    const top = viewport?.top.start ?? -1;

    expect(top).toBeLessThanOrEqual(anchor);
    expect(text[top - 1]).toBe('\n');
    expect(lineAt(top)).toMatch(/^line \d+$/);
  });

  it('moves a page down and back up to the same row', () => {
    const start = resolve({ anchor: 500_000, rows: 0 })?.top.start ?? 0;
    const down = resolve({ anchor: start, rows: 10 })?.top.start ?? 0;
    const back = resolve({ anchor: down, rows: -10 })?.top.start;

    expect(lineAt(down)).toBe(`line ${Number(lineAt(start).slice(5)) + 10}`);
    expect(back).toBe(start);
  });

  it('moves a page per screen and carries the rest of a longer move, until a file edge stops it', () => {
    const start = resolve({ anchor: 500_000, rows: 0 })?.top.start ?? 0;
    const first = resolve({ anchor: start, rows: 25 });

    expect(lineAt(first?.top.start ?? 0)).toBe(`line ${Number(lineAt(start).slice(5)) + 10}`);
    expect(first?.rest).toBe(15);
    expect(resolve({ anchor: start, rows: -25 })?.rest).toBe(-15);
    expect(resolve({ anchor: start, rows: 3 })?.rest).toBe(0);
    expect(resolve({ anchor: 0, rows: -25 })?.rest).toBe(0);
    expect(resolve({ anchor: bytes.length, rows: 25 })?.rest).toBe(0);
  });

  it('pulls the last screen up to the end of the file, or keeps one row when lines wrap', () => {
    const end = resolve({ anchor: bytes.length, rows: 0 });
    expect(end?.rows).toHaveLength(10);
    expect(lineAt(end?.top.start ?? 0)).toBe('line 99991');

    expect(resolve({ anchor: bytes.length, rows: 0 }, 10, 1)?.rows).toHaveLength(1);
  });

  it('shows a gigabyte-long line a segment at a time', () => {
    const single = new Uint8Array(200 * SEGMENT_BYTES).fill(0x61);
    const target = { anchor: 150 * SEGMENT_BYTES + 17, rows: 0 };
    const viewport = resolveViewport(fileOf(single)(target, 30), UTF8, target, 30, 30);

    expect(viewport?.top).toEqual({ start: 150 * SEGMENT_BYTES, kind: 'continuation' });
    expect(viewport?.rows).toHaveLength(30);
    expect(viewport?.rows.every((row) => row.end - row.start === SEGMENT_BYTES)).toBe(true);
  });

  it('has nothing to show for a file with no text', () => {
    expect(
      resolveViewport(
        { offset: 0, bytes: new Uint8Array(), eof: true },
        UTF8,
        { anchor: 0, rows: 0 },
        10,
        10
      )
    ).toBeNull();
  });
});

describe('line numbers', () => {
  it('numbers the rows that start lines and leaves continuations blank', () => {
    expect(
      numberRows(
        [
          { start: 0, kind: 'continuation' },
          { start: 5, kind: 'line' },
          { start: 9, kind: 'continuation' },
          { start: 12, kind: 'line' }
        ],
        41
      )
    ).toEqual([null, 42, null, 43]);
    expect(numberRows([{ start: 0, kind: 'line' }], 7)).toEqual([7]);
  });

  it('carries a known line up or down by counting breaks in the chunk', () => {
    const chunk = { offset: 100, bytes: encode('a\nb\nc\nd'), eof: true };

    expect(lineFromAnchor(chunk, UTF8, { offset: 102, line: 10 }, 106)).toBe(12);
    expect(lineFromAnchor(chunk, UTF8, { offset: 106, line: 12 }, 100)).toBe(9);
    expect(lineFromAnchor(chunk, UTF8, { offset: 50, line: 1 }, 106)).toBeNull();
  });
});
