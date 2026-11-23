import { describe, expect, it } from 'vitest';

import type { TextLayout } from './TextEncoding.logic.js';
import {
  alignToCharacter,
  countLineBreaks,
  LOOKBEHIND_BYTES,
  MAX_ROW_BYTES,
  rowAt,
  rowContaining,
  rowsBefore,
  rowsFrom,
  SEGMENT_BYTES,
  type RowStart,
  type TextChunk
} from './TextRows.logic.js';

const UTF8: TextLayout = { encoding: 'utf-8', contentStart: 0 };
const UTF16LE: TextLayout = { encoding: 'utf-16le', contentStart: 2 };
const UTF16BE: TextLayout = { encoding: 'utf-16be', contentStart: 2 };
const LATIN1: TextLayout = { encoding: 'latin-1', contentStart: 0 };

const utf8 = (text: string): Uint8Array => new TextEncoder().encode(text);
const utf16 = (text: string, order: 'le' | 'be'): Uint8Array => {
  const bytes = new Uint8Array(2 + text.length * 2);
  const view = new DataView(bytes.buffer);
  view.setUint16(0, 0xfeff, order === 'le');
  for (let index = 0; index < text.length; index += 1) {
    view.setUint16(2 + index * 2, text.charCodeAt(index), order === 'le');
  }
  return bytes;
};

const whole = (bytes: Uint8Array): TextChunk => ({ offset: 0, bytes, eof: true });

/** The bytes [from, to) of a file, as one read would return them. */
const slice = (bytes: Uint8Array, from: number, to: number): TextChunk => {
  const start = Math.max(0, from);
  const end = Math.min(bytes.length, to);
  return { offset: start, bytes: bytes.subarray(start, end), eof: end >= bytes.length };
};

/** Every row of a file, walked forward from its first byte. */
const allRows = (bytes: Uint8Array, layout: TextLayout): RowStart[] =>
  rowsFrom(whole(bytes), layout, { start: layout.contentStart, kind: 'line' }, 1e9).rows.map(
    ({ start, kind }) => ({ start, kind })
  );

/** The row the forward walk puts byte `position` in. */
const canonicalRow = (rows: RowStart[], position: number): RowStart =>
  rows.filter((row) => row.start <= position).at(-1) ?? (rows[0] as RowStart);

/** Decodes a row's text with the platform decoder. */
const rowText = (bytes: Uint8Array, layout: TextLayout, row: RowStart): string => {
  const bounds = rowAt(whole(bytes), layout, row);
  if (bounds === null) throw new Error('row out of range');
  return new TextDecoder(layout.encoding === 'latin-1' ? 'latin1' : layout.encoding).decode(
    bytes.subarray(bounds.start, bounds.textEnd)
  );
};

/**
 * Checks that, from any byte, the reader backs up to the same row the
 * forward walk reaches, holding only one read's worth of bytes around it.
 */
const expectStableRows = (bytes: Uint8Array, layout: TextLayout, step = 1): void => {
  const rows = allRows(bytes, layout);

  for (let position = 0; position < bytes.length; position += step) {
    const chunk = slice(bytes, position - LOOKBEHIND_BYTES, position + 2 * MAX_ROW_BYTES);
    const found = rowContaining(chunk, layout, position);

    expect(found, `byte ${position}`).toEqual(
      canonicalRow(rows, Math.max(position, layout.contentStart))
    );
  }
};

describe('alignToCharacter', () => {
  it('steps past UTF-8 continuation bytes to the next character', () => {
    const bytes = utf8('a€b'); // € is E2 82 AC
    expect([1, 2, 3, 4].map((position) => alignToCharacter(whole(bytes), UTF8, position))).toEqual([
      1, 4, 4, 4
    ]);
  });

  it('lands UTF-16 on an even offset and past the low half of a surrogate pair', () => {
    for (const [layout, order] of [
      [UTF16LE, 'le'],
      [UTF16BE, 'be']
    ] as const) {
      const bytes = utf16('a😀b', order); // a at 2, the pair at 4 and 6, b at 8
      expect(
        [3, 4, 5, 6, 7].map((position) => alignToCharacter(whole(bytes), layout, position)),
        layout.encoding
      ).toEqual([4, 4, 8, 8, 8]);
    }
  });

  it('leaves Latin-1 alone, where every byte is a character', () => {
    expect(alignToCharacter(whole(new Uint8Array([0xe9, 0x82])), LATIN1, 1)).toBe(1);
  });
});

describe('rows', () => {
  it('starts a row at every line start and drops the line break from its text', () => {
    const bytes = utf8('one\r\ntwo\n\nlast');
    const rows = allRows(bytes, UTF8);

    expect(rows.map((row) => rowText(bytes, UTF8, row))).toEqual(['one', 'two', '', 'last']);
    expect(rows.every((row) => row.kind === 'line')).toBe(true);
  });

  it('draws no empty row after a final line break', () => {
    expect(allRows(utf8('a\nb\n'), UTF8)).toHaveLength(2);
    expect(rowsFrom(whole(new Uint8Array()), UTF8, { start: 0, kind: 'line' }, 10)).toEqual({
      rows: [],
      end: true
    });
  });

  it('splits a line longer than a segment into bounded display segments', () => {
    // The line starts 5 bytes in, so its first row runs to the second boundary.
    const bytes = utf8('abcd\n' + 'x'.repeat(10 * SEGMENT_BYTES));
    const rows = rowsFrom(whole(bytes), UTF8, { start: 5, kind: 'line' }, 100).rows;

    expect(rows.length).toBe(10);
    expect(rows[0]).toMatchObject({ start: 5, kind: 'line', end: 2 * SEGMENT_BYTES });
    expect(rows.slice(1).every((row) => row.kind === 'continuation')).toBe(true);
    expect(Math.max(...rows.map((row) => row.end - row.start))).toBeLessThanOrEqual(MAX_ROW_BYTES);
    expect(rows.at(-1)?.end).toBe(bytes.length);
  });

  it('never splits a character, a line break, or a carriage return from its line feed', () => {
    // The segment boundary lands inside "€", then right on a "\r\n".
    const text = 'x'.repeat(2 * SEGMENT_BYTES - 1) + '€' + 'y'.repeat(SEGMENT_BYTES - 3) + '\r\nz';
    const bytes = utf8(text);
    const rows = allRows(bytes, UTF8);
    const texts = rows.map((row) => rowText(bytes, UTF8, row));

    expect(texts.join('')).toBe(text.replace('\r\n', ''));
    expect(texts.every((part) => !part.includes('�') && !part.includes('\r'))).toBe(true);
    expect(texts.at(-1)).toBe('z');
  });

  it('finds the same row from any byte, scrolling or jumping, in UTF-8 with long lines', () => {
    const text = [
      'short',
      'é'.repeat(3 * SEGMENT_BYTES),
      '',
      'mixed €😀 '.repeat(400),
      'tail\r',
      'end'
    ].join('\n');
    expectStableRows(utf8(text), UTF8, 7);
  });

  it('finds the same row from any byte in UTF-16 either way round, through surrogate pairs', () => {
    const text = ['a', '😀'.repeat(SEGMENT_BYTES), 'ੁĊ'.repeat(700), 'z'].join('\r\n');
    expectStableRows(utf16(text, 'le'), UTF16LE, 5);
    expectStableRows(utf16(text, 'be'), UTF16BE, 5);
  });

  it('jumps into the middle of a line far longer than any read and lands on a segment', () => {
    const bytes = utf8('a'.repeat(50 * SEGMENT_BYTES));
    const position = 37 * SEGMENT_BYTES + 123;
    const found = rowContaining(
      slice(bytes, position - LOOKBEHIND_BYTES, position + MAX_ROW_BYTES),
      UTF8,
      position
    );

    expect(found).toEqual({ start: 37 * SEGMENT_BYTES, kind: 'continuation' });
  });

  it('reports a row it cannot finish from the chunk instead of guessing', () => {
    const bytes = utf8('a'.repeat(4 * SEGMENT_BYTES));
    expect(rowAt(slice(bytes, 0, SEGMENT_BYTES), UTF8, { start: 0, kind: 'line' })).toBeNull();
  });

  it('lists the rows before a row, nearest last', () => {
    const bytes = utf8('a\nb\nc\nd\n');
    expect(rowsBefore(whole(bytes), UTF8, { start: 6, kind: 'line' }, 2)).toEqual([
      { start: 2, kind: 'line' },
      { start: 4, kind: 'line' }
    ]);
    expect(rowsBefore(whole(bytes), UTF8, { start: 0, kind: 'line' }, 2)).toEqual([]);
  });

  it('starts after a byte order mark and treats a byte past the end as the last row', () => {
    const bytes = utf16('hi\nyo', 'le');
    expect(rowContaining(whole(bytes), UTF16LE, 0)).toEqual({ start: 2, kind: 'line' });
    expect(rowContaining(whole(bytes), UTF16LE, 999)).toEqual({ start: 8, kind: 'line' });
    expect(rowContaining(whole(new Uint8Array([0xff, 0xfe])), UTF16LE, 0)).toBeNull();
  });
});

describe('countLineBreaks', () => {
  it('counts the breaks between two bytes in the chunk', () => {
    const bytes = utf16('a\nb\nੁc', 'le');
    expect(countLineBreaks(whole(bytes), UTF16LE, 2, bytes.length)).toBe(2);
    expect(countLineBreaks(whole(utf8('a\nb\nc')), UTF8, 2, 5)).toBe(1);
  });
});
