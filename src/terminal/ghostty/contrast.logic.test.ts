import { describe, expect, it } from 'vitest';

import { TERMINAL_MIN_CONTRAST, legibleForeground, terminalContrast } from './contrast.logic.js';

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
