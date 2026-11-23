import { describe, expect, it } from 'vitest';

import {
  copyRange,
  extendSelection,
  hexCopy,
  MAX_HEX_COPY_BYTES,
  selectedCells,
  selectedRange,
  textCopy
} from './HexSelection.logic.js';

describe('the hex selection', () => {
  it('includes both ends, in either direction', () => {
    expect(selectedRange({ anchor: 20, focus: 5, column: 'hex' })).toEqual({ start: 5, end: 21 });
    expect(selectedRange({ anchor: 7, focus: 7, column: 'text' })).toEqual({ start: 7, end: 8 });
  });

  it('marks the part of each row it covers', () => {
    const selection = { anchor: 20, focus: 35, column: 'hex' as const };

    expect(selectedCells(selection, 0, 16)).toBeNull();
    expect(selectedCells(selection, 16, 16)).toEqual({ from: 4, to: 16 });
    expect(selectedCells(selection, 32, 16)).toEqual({ from: 0, to: 4 });
    expect(selectedCells(selection, 32, 2)).toEqual({ from: 0, to: 2 });
    expect(selectedCells(selection, 48, 16)).toBeNull();
  });

  it('copies bytes as spaced uppercase hex or as the text column shows them', () => {
    const bytes = new Uint8Array([0x4d, 0x5a, 0x00, 0x0a, 0x7e, 0xff]);

    expect(hexCopy(bytes)).toBe('4D 5A 00 0A 7E FF');
    expect(textCopy(bytes)).toBe('MZ..~.');
    expect(hexCopy(new Uint8Array())).toBe('');
  });

  it('reads at most one bounded read for copy, and refuses a larger selection', () => {
    expect(copyRange({ anchor: 10, focus: 0, column: 'hex' }, 100)).toEqual({
      offset: 0,
      length: 11
    });
    expect(copyRange({ anchor: 0, focus: MAX_HEX_COPY_BYTES - 1, column: 'hex' }, 2 ** 40)).toEqual(
      { offset: 0, length: MAX_HEX_COPY_BYTES }
    );
    expect(copyRange({ anchor: 0, focus: MAX_HEX_COPY_BYTES, column: 'hex' }, 2 ** 40)).toBeNull();
    expect(
      copyRange({ anchor: 0, focus: 128 * 1024 ** 3 - 1, column: 'text' }, 2 ** 40)
    ).toBeNull();
    // A file that shrank under the selection copies what is left.
    expect(copyRange({ anchor: 90, focus: 120, column: 'hex' }, 100)).toEqual({
      offset: 90,
      length: 10
    });
  });

  it('moves its free end with Shift and an arrow, inside the file', () => {
    const start = { anchor: 16, focus: 16, column: 'text' as const };

    expect(extendSelection(start, 16, 0, 100)).toEqual({ ...start, focus: 32 });
    expect(extendSelection(start, -1, 0, 100)).toEqual({ ...start, focus: 15 });
    expect(extendSelection({ ...start, focus: 98 }, 16, 0, 100)?.focus).toBe(99);
    expect(extendSelection({ ...start, focus: 3 }, -16, 0, 100)?.focus).toBe(0);
    // With nothing selected, it starts at the given byte in the hex column.
    expect(extendSelection(null, 1, 48, 100)).toEqual({ anchor: 48, focus: 49, column: 'hex' });
    expect(extendSelection(null, 1, 0, 0)).toBeNull();
  });
});
