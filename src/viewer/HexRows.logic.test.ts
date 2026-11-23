import { describe, expect, it } from 'vitest';

import { cellAt, formatRow, lineChars, offsetDigits, rowCount } from './HexRows.logic.js';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);
const FOUR_GB = 2 ** 32;

describe('hex rows', () => {
  it('lays out a full row: offset, two groups joined by a dash, then the text', () => {
    const row = bytes(
      0x4d,
      0x5a,
      0x50,
      0x00,
      0x02,
      0x00,
      0x00,
      0x00,
      0x04,
      0x00,
      0x0f,
      0x00,
      0xff,
      0xff,
      0x00,
      0x00
    );

    expect(formatRow(0, row, 8)).toBe(
      '00000000  4D 5A 50 00 02 00 00 00-04 00 0F 00 FF FF 00 00  MZP.............'
    );
    expect(formatRow(0x10, row, 8)).toMatch(/^00000010 {2}/);
  });

  it('prints every printable ASCII byte as itself, including space and tilde', () => {
    const row = new TextEncoder().encode(' This program~!!');

    expect(formatRow(0x50, row, 8)).toBe(
      '00000050  20 54 68 69 73 20 70 72-6F 67 72 61 6D 7E 21 21   This program~!!'
    );
  });

  it('prints every byte outside 0x20 to 0x7E as a dot', () => {
    const row = bytes(0x00, 0x09, 0x0a, 0x1f, 0x7f, 0x80, 0xa9, 0xff, 0, 0, 0, 0, 0, 0, 0, 0x19);

    expect(formatRow(0, row, 8)).toBe(
      '00000000  00 09 0A 1F 7F 80 A9 FF-00 00 00 00 00 00 00 19  ................'
    );
  });

  it('pads a short last row so its text lines up with the full rows', () => {
    const full = formatRow(0, new Uint8Array(16), 8);
    const short = formatRow(0x20, bytes(0x41, 0x42, 0x43), 8);

    expect(short).toBe(`00000020  41 42 43${' '.repeat(39)}  ABC${' '.repeat(13)}`);
    expect(short.indexOf('ABC')).toBe(full.indexOf('.'.repeat(16)));
    expect(short).toHaveLength(full.length);
    expect(full).toHaveLength(lineChars(8));
    // The dash joins the groups only when the second group has a byte.
    expect(formatRow(0, new Uint8Array(9), 8)).toContain('00-00');
    expect(formatRow(0, new Uint8Array(8), 8)).not.toContain('-');
  });

  it('keeps 8 offset digits through exactly 4 GB and widens past it', () => {
    expect(offsetDigits(0)).toBe(8);
    expect(offsetDigits(1)).toBe(8);
    expect(offsetDigits(3 * 1024 ** 3)).toBe(8);
    expect(offsetDigits(FOUR_GB)).toBe(8);
    expect(offsetDigits(FOUR_GB + 1)).toBe(9);
    expect(offsetDigits(5 * 1024 ** 3)).toBe(9);
    expect(offsetDigits(128 * 1024 ** 3)).toBe(10);
    // Every row of one file shares the width.
    expect(formatRow(0, new Uint8Array(16), offsetDigits(FOUR_GB + 1))).toMatch(/^000000000 {2}/);
  });

  it('counts rows, the last one short', () => {
    expect(rowCount(0)).toBe(0);
    expect(rowCount(16)).toBe(1);
    expect(rowCount(17)).toBe(2);
    expect(rowCount(128 * 1024 ** 3)).toBe(8 * 1024 ** 3);
  });

  it('finds the byte and column under a character of the line', () => {
    // 8 offset digits and a gap: the hex column starts at 10, the text at 59.
    expect(cellAt(0, 8)).toEqual({ column: 'hex', index: 0 });
    expect(cellAt(10, 8)).toEqual({ column: 'hex', index: 0 });
    expect(cellAt(12, 8)).toEqual({ column: 'hex', index: 0 });
    expect(cellAt(13, 8)).toEqual({ column: 'hex', index: 1 });
    expect(cellAt(34, 8)).toEqual({ column: 'hex', index: 8 });
    expect(cellAt(57, 8)).toEqual({ column: 'hex', index: 15 });
    expect(cellAt(58, 8)).toEqual({ column: 'text', index: 0 });
    expect(cellAt(59, 8)).toEqual({ column: 'text', index: 0 });
    expect(cellAt(64, 8)).toEqual({ column: 'text', index: 5 });
    expect(cellAt(500, 8)).toEqual({ column: 'text', index: 15 });
    // A wider offset moves both columns.
    expect(cellAt(13, 10)).toEqual({ column: 'hex', index: 0 });
  });
});
