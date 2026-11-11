import { describe, expect, it } from 'vitest';

import {
  TERMINAL_MIN_CONTRAST,
  legibleForeground,
  parseTranslucentColor,
  selectedForeground,
  terminalContrast
} from './contrast.logic.js';

const ground = { r: 30, g: 30, b: 46 };

describe('legibleForeground', () => {
  it('keeps a foreground that already reads on its background', () => {
    const red = { r: 243, g: 139, b: 168 };

    expect(legibleForeground(red, ground)).toBe(red);
  });

  it('lifts a truecolour foreground near the ground to the floor, no further', () => {
    const near = { r: 40, g: 40, b: 60 };
    const ink = legibleForeground(near, ground);

    expect(terminalContrast(ink, ground)).toBeGreaterThanOrEqual(TERMINAL_MIN_CONTRAST);
    expect(terminalContrast(ink, ground)).toBeLessThan(TERMINAL_MIN_CONTRAST + 0.2);
  });

  it('lifts ANSI black on a dark ground', () => {
    const black = { r: 69, g: 71, b: 90 };

    expect(terminalContrast(legibleForeground(black, ground), ground)).toBeGreaterThanOrEqual(
      TERMINAL_MIN_CONTRAST
    );
  });

  it('keeps the hue of a coloured foreground it lifts', () => {
    const solarized = { r: 0, g: 43, b: 54 };
    const ink = legibleForeground({ r: 220, g: 50, b: 47 }, solarized);

    expect(terminalContrast(ink, solarized)).toBeGreaterThanOrEqual(TERMINAL_MIN_CONTRAST);
    expect(ink.r - ink.g).toBeGreaterThan(80);
  });

  it('darkens text on a light cell background', () => {
    const paper = { r: 230, g: 230, b: 230 };
    const ink = legibleForeground({ r: 220, g: 220, b: 220 }, paper);

    expect(terminalContrast(ink, paper)).toBeGreaterThanOrEqual(TERMINAL_MIN_CONTRAST);
    expect(ink.r).toBeLessThan(120);
  });

  it('reads even where text and background are one colour', () => {
    const ink = legibleForeground(ground, ground);

    expect(terminalContrast(ink, ground)).toBeGreaterThanOrEqual(TERMINAL_MIN_CONTRAST);
  });
});

describe('parseTranslucentColor', () => {
  it('reads the selection fill forms with their opacity', () => {
    expect(parseTranslucentColor('rgb(29 98 235 / 22%)')).toEqual({
      color: { r: 29, g: 98, b: 235 },
      alpha: 0.22
    });
    expect(parseTranslucentColor('rgba(137, 180, 250, 0.28)')).toEqual({
      color: { r: 137, g: 180, b: 250 },
      alpha: 0.28
    });
    expect(parseTranslucentColor('#204060')).toEqual({ color: { r: 32, g: 64, b: 96 }, alpha: 1 });
    expect(parseTranslucentColor('rgb(1, 2, 3)')).toEqual({
      color: { r: 1, g: 2, b: 3 },
      alpha: 1
    });
  });

  it('leaves other forms', () => {
    expect(parseTranslucentColor('')).toBeNull();
    expect(parseTranslucentColor('color-mix(in srgb, red, blue)')).toBeNull();
    expect(parseTranslucentColor('rgb(1, 2)')).toBeNull();
  });
});

describe('selectedForeground', () => {
  // Catppuccin Latte's terminal ground and its selection.
  const paper = { r: 239, g: 241, b: 245 };
  const selection = { color: { r: 30, g: 102, b: 245 }, alpha: 0.22 };
  const under = { r: 193, g: 210, b: 245 };

  it('floors a coloured word on the selection over the cell, not on the bare cell', () => {
    const green = { r: 64, g: 160, b: 43 };
    const ink = selectedForeground(green, paper, selection);

    expect(terminalContrast(legibleForeground(green, paper), under)).toBeLessThan(
      TERMINAL_MIN_CONTRAST
    );
    expect(terminalContrast(ink, under)).toBeGreaterThanOrEqual(TERMINAL_MIN_CONTRAST);
    expect(ink.g - ink.r).toBeGreaterThan(40);
  });

  it('draws the selection ink in place of the cell colour where the theme gives one', () => {
    const text = { r: 76, g: 79, b: 105 };

    expect(selectedForeground({ r: 64, g: 160, b: 43 }, paper, selection, text)).toBe(text);
  });

  it('floors on the cell itself without a fill it can read', () => {
    const ink = selectedForeground(paper, paper, null);

    expect(terminalContrast(ink, paper)).toBeGreaterThanOrEqual(TERMINAL_MIN_CONTRAST);
  });
});
