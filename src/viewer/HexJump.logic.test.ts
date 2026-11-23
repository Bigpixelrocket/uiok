import { describe, expect, it } from 'vitest';

import { parseJumpOffset } from './HexJump.logic.js';
import { DEFAULT_VIEWER_LABELS as L } from '../labels/viewer.js';

describe('jump to offset', () => {
  it('reads hex with or without 0x, in either case, around spaces', () => {
    expect(parseJumpOffset('1F40', 10_000, L)).toEqual({ offset: 0x1f40 });
    expect(parseJumpOffset('0x1f40', 10_000, L)).toEqual({ offset: 0x1f40 });
    expect(parseJumpOffset('  0X1F40 ', 10_000, L)).toEqual({ offset: 0x1f40 });
    expect(parseJumpOffset('0', 1, L)).toEqual({ offset: 0 });
    // Bare digits are hex too, as the offset column prints them.
    expect(parseJumpOffset('10', 100, L)).toEqual({ offset: 16 });
  });

  it('reaches the last byte of a 128 GB file exactly', () => {
    const size = 128 * 1024 ** 3;

    expect(parseJumpOffset('1FFFFFFFFF', size, L)).toEqual({ offset: size - 1 });
    expect(parseJumpOffset('0x1000000000', size, L)).toEqual({ offset: 64 * 1024 ** 3 });
  });

  it('refuses an offset past the last byte, naming the last offset', () => {
    expect(parseJumpOffset('100', 256, L)).toEqual({
      error: 'Offset 100 is past the end of the file. The last offset is 000000FF.'
    });
    expect(parseJumpOffset('0x2000000000', 128 * 1024 ** 3, L)).toEqual({
      error: 'Offset 2000000000 is past the end of the file. The last offset is 1FFFFFFFFF.'
    });
    // Too long for a number is still just past the end.
    expect(parseJumpOffset('F'.repeat(40), 256, L)).toHaveProperty('error');
  });

  it('refuses what is not a hex offset, and any offset into an empty file', () => {
    for (const input of ['', '  ', '0x', 'xyz', '-10', '12 34', '1.5', '#10']) {
      expect(parseJumpOffset(input, 256, L)).toEqual({
        error: 'Type an offset in hex, such as 1F40 or 0x1F40.'
      });
    }
    expect(parseJumpOffset('0', 0, L)).toEqual({ error: 'The file is empty.' });
  });
});
