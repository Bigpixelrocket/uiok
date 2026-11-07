import { describe, expect, it } from 'vitest';

import {
  ghosttySpriteCodepoint,
  ghosttySpriteGlyph,
  ghosttySpriteThickness,
  type GhosttySpriteGlyph,
  type GhosttySpriteRect
} from './spriteGlyphs.logic.js';

const glyph = (character: string, width = 15, height = 32, thickness = 2): GhosttySpriteGlyph => {
  const result = ghosttySpriteGlyph(character.charCodeAt(0), width, height, thickness);
  if (result === null) throw new Error(`no sprite for ${character}`);
  return result;
};

const rect = (left: number, top: number, right: number, bottom: number): GhosttySpriteRect => ({
  left,
  top,
  right,
  bottom
});

/** The pixels a glyph's rectangles cover, as a set of `x,y` keys. */
function covered(sprite: GhosttySpriteGlyph): Set<string> {
  const pixels = new Set<string>();
  for (const { left, top, right, bottom } of sprite.rects) {
    for (let x = left; x < right; x += 1) {
      for (let y = top; y < bottom; y += 1) pixels.add(`${x},${y}`);
    }
  }
  return pixels;
}

/** The pixels the union of rectangles covers. */
const area = (...rects: GhosttySpriteRect[]): Set<string> =>
  covered({ alpha: 1, arc: null, rects });

describe('ghosttySpriteCodepoint', () => {
  it('takes single box-drawing and block characters', () => {
    expect(ghosttySpriteCodepoint('─')).toBe(0x2500);
    expect(ghosttySpriteCodepoint('█')).toBe(0x2588);
    expect(ghosttySpriteCodepoint('▟')).toBe(0x259f);
  });

  it('leaves text, clusters, and the diagonals to the font', () => {
    expect(ghosttySpriteCodepoint('a')).toBe(-1);
    expect(ghosttySpriteCodepoint('')).toBe(-1);
    expect(ghosttySpriteCodepoint('█́')).toBe(-1);
    expect(ghosttySpriteCodepoint('╱')).toBe(-1);
    expect(ghosttySpriteCodepoint('╳')).toBe(-1);
    expect(ghosttySpriteCodepoint('■')).toBe(-1);
  });
});

describe('ghosttySpriteThickness', () => {
  it('rounds the estimated underline up to whole device pixels', () => {
    expect(ghosttySpriteThickness(12, 1)).toBe(1);
    expect(ghosttySpriteThickness(13, 2)).toBe(2);
    expect(ghosttySpriteThickness(20, 1)).toBe(1);
    expect(ghosttySpriteThickness(24, 2)).toBe(3);
  });
});

describe('ghosttySpriteGlyph', () => {
  it('fills the whole cell with a full block', () => {
    expect(glyph('█')).toEqual({ alpha: 1, rects: [rect(0, 0, 15, 32)], arc: null });
  });

  it('splits the cell into upper and lower halves', () => {
    expect(glyph('▀').rects).toEqual([rect(0, 0, 15, 16)]);
    expect(glyph('▄').rects).toEqual([rect(0, 16, 15, 32)]);
    expect(glyph('▄', 15, 33).rects).toEqual([rect(0, 16, 15, 33)]);
  });

  it('draws eighths against their side', () => {
    expect(glyph('▁').rects).toEqual([rect(0, 28, 15, 32)]);
    expect(glyph('▏', 16).rects).toEqual([rect(0, 0, 2, 32)]);
    expect(glyph('▕', 16).rects).toEqual([rect(14, 0, 16, 32)]);
  });

  it('covers every pixel when halves and quadrants meet on an odd width', () => {
    // On 15 pixels the halves overlap by one rather than leave a column bare.
    expect(glyph('▌').rects).toEqual([rect(0, 0, 8, 32)]);
    expect(glyph('▐').rects).toEqual([rect(7, 0, 15, 32)]);
    expect(glyph('▘').rects).toEqual([rect(0, 0, 8, 16)]);
    expect(glyph('▝').rects).toEqual([rect(7, 0, 15, 16)]);
    expect(covered(glyph('▛'))).toEqual(
      new Set([...covered(glyph('▘')), ...covered(glyph('▝')), ...covered(glyph('▖'))])
    );
    const full = covered(glyph('█'));
    const pieced = new Set([...covered(glyph('▛')), ...covered(glyph('▗'))]);
    expect(pieced).toEqual(full);
    expect(new Set([...covered(glyph('▜')), ...covered(glyph('▖'))])).toEqual(full);
  });

  it('shades with solid fills at quarter-step coverage', () => {
    for (const [character, alpha] of [
      ['░', 0x40 / 0xff],
      ['▒', 0x80 / 0xff],
      ['▓', 0xc0 / 0xff]
    ] as const) {
      expect(glyph(character)).toEqual({ alpha, rects: [rect(0, 0, 15, 32)], arc: null });
    }
  });

  it('centres light lines and runs them edge to edge', () => {
    // 15 by 32 with 2-pixel lines: rows 15 and 16, columns 6 and 7.
    expect(covered(glyph('─'))).toEqual(area(rect(0, 15, 15, 17)));
    expect(covered(glyph('│'))).toEqual(area(rect(6, 0, 8, 32)));
    expect(covered(glyph('━'))).toEqual(area(rect(0, 14, 15, 18)));
  });

  it('crosses light and heavy lines through the centre', () => {
    const light = covered(glyph('┼'));
    expect(light).toEqual(new Set([...covered(glyph('─')), ...covered(glyph('│'))]));

    expect(covered(glyph('╋'))).toEqual(area(rect(0, 14, 15, 18), rect(5, 0, 9, 32)));
  });

  it('joins light and heavy arms without gaps', () => {
    // ┿: light up and down, heavy left and right.
    expect(covered(glyph('┿'))).toEqual(area(rect(0, 14, 15, 18), rect(6, 0, 8, 32)));
    // ┍: light down, heavy right; the heavy arm reaches over the light one.
    expect(covered(glyph('┍'))).toEqual(area(rect(6, 14, 15, 18), rect(6, 14, 8, 32)));
  });

  it('draws double lines as two light strokes a stroke apart', () => {
    expect(covered(glyph('═'))).toEqual(area(rect(0, 13, 15, 15), rect(0, 17, 15, 19)));
    expect(covered(glyph('║'))).toEqual(area(rect(4, 0, 6, 32), rect(8, 0, 10, 32)));
    // ╔: the outer stroke wraps the corner and the inner one turns inside it.
    expect(covered(glyph('╔'))).toEqual(
      area(rect(4, 13, 15, 15), rect(4, 13, 6, 32), rect(8, 17, 15, 19), rect(8, 17, 10, 32))
    );
  });

  it('draws half lines from one edge to the centre', () => {
    expect(glyph('╴').rects).toEqual([rect(0, 15, 8, 17)]);
    // Upstream starts a lone heavy half line at the light stroke's top.
    expect(glyph('╻').rects).toEqual([rect(5, 15, 9, 32)]);
  });

  it('rounds a corner with a stroke that meets the neighbouring lines', () => {
    const arc = glyph('╭').arc;
    expect(glyph('╭').rects).toEqual([]);
    expect(arc).toMatchObject({
      lineWidth: 2,
      startX: 7,
      startY: 32,
      bendStartX: 7,
      bendStartY: 16 + 7.5,
      bendEndX: 7 + 7.5,
      bendEndY: 16,
      endX: 15,
      endY: 16
    });
    // The stroke's centre sits on the light lines' pixels (6..8 and 15..17).
    const lineCentre = (6 + 8) / 2;
    expect(arc?.startX).toBe(lineCentre);
    expect(glyph('╯').arc).toMatchObject({ startY: 0, endX: 0, bendStartY: 16 - 7.5 });
  });

  it('splits dashed lines into even dashes that stay inside the cell', () => {
    const dashes = glyph('┄', 16).rects;
    expect(dashes).toHaveLength(3);
    for (const dash of dashes) {
      expect(dash.left).toBeGreaterThanOrEqual(0);
      expect(dash.right).toBeLessThanOrEqual(16);
      expect(dash.top).toBe(15);
      expect(dash.bottom).toBe(17);
    }
  });

  it('leaves codepoints it does not draw to the font', () => {
    expect(ghosttySpriteGlyph(0x2571, 15, 32, 2)).toBeNull();
    expect(ghosttySpriteGlyph('a'.charCodeAt(0), 15, 32, 2)).toBeNull();
    expect(ghosttySpriteGlyph(0x25a0, 15, 32, 2)).toBeNull();
  });
});
