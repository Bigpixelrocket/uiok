/*
 * The terminal's minimum contrast: a cell's text against that cell's own
 * background, as terminals with a "minimum contrast" setting enforce it. A
 * program may paint any background it likes; only the text colour on it
 * moves, and only as far as it must.
 */

import type { GhosttyColor } from './core.js';

/** The contrast ratio a cell's text keeps against its background: WCAG's body-text floor. */
export const TERMINAL_MIN_CONTRAST = 4.5;

const BLACK: GhosttyColor = { r: 0, g: 0, b: 0 };
const WHITE: GhosttyColor = { r: 255, g: 255, b: 255 };

const channel = (value: number): number => {
  const unit = value / 255;

  return unit <= 0.04045 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
};

/** A colour's relative luminance (WCAG 2). */
const luminance = (color: GhosttyColor): number =>
  0.2126 * channel(color.r) + 0.7152 * channel(color.g) + 0.0722 * channel(color.b);

/** The WCAG contrast ratio between two colours, from 1 to 21. */
export function terminalContrast(left: GhosttyColor, right: GhosttyColor): number {
  const a = luminance(left);
  const b = luminance(right);

  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** `from` moved `amount` (0 to 1) of the way to `to`, in whole sRGB channels. */
const mixed = (from: GhosttyColor, to: GhosttyColor, amount: number): GhosttyColor => ({
  r: Math.round(from.r + (to.r - from.r) * amount),
  g: Math.round(from.g + (to.g - from.g) * amount),
  b: Math.round(from.b + (to.b - from.b) * amount)
});

/**
 * The colour a cell's text is drawn in on `background`: `foreground` itself
 * when it keeps `TERMINAL_MIN_CONTRAST` there, else the least mix of it
 * toward white or black, whichever stands further from the background. A
 * mix toward white or black keeps the hue the program asked for (a red
 * error stays red, only lighter or darker), where a mix toward the
 * terminal's grey text colour would wash it out. The result is a new
 * object only when it differs from `foreground`.
 */
export function legibleForeground(
  foreground: GhosttyColor,
  background: GhosttyColor
): GhosttyColor {
  if (terminalContrast(foreground, background) >= TERMINAL_MIN_CONTRAST) return foreground;

  const target =
    terminalContrast(WHITE, background) >= terminalContrast(BLACK, background) ? WHITE : BLACK;
  let low = 0;
  let high = 1;

  // Twelve halvings settle the mix finer than one channel step.
  for (let step = 0; step < 12; step += 1) {
    const middle = (low + high) / 2;

    if (terminalContrast(mixed(foreground, target, middle), background) >= TERMINAL_MIN_CONTRAST) {
      high = middle;
    } else {
      low = middle;
    }
  }
  return mixed(foreground, target, high);
}

/** The contrast ratio a mark (the cursor, an outline) keeps against the ground it sits on. */
export const TERMINAL_MARK_CONTRAST = 3;

/**
 * A quiet mark's colour on `background`: `foreground` mixed `share` of the
 * way in from the background, or, where that stands less than
 * `TERMINAL_MARK_CONTRAST` from it, the least stronger mix that does (at
 * most `foreground` itself). An unfocused terminal's hollow cursor is drawn
 * in it, so it stays quieter than text without fading out of sight.
 */
export function quietMark(
  foreground: GhosttyColor,
  background: GhosttyColor,
  share = 0.5
): GhosttyColor {
  const at = (amount: number) => mixed(background, foreground, amount);

  if (terminalContrast(at(share), background) >= TERMINAL_MARK_CONTRAST) return at(share);
  if (terminalContrast(foreground, background) < TERMINAL_MARK_CONTRAST) return foreground;

  let low = share;
  let high = 1;

  for (let step = 0; step < 12; step += 1) {
    const middle = (low + high) / 2;

    if (terminalContrast(at(middle), background) >= TERMINAL_MARK_CONTRAST) high = middle;
    else low = middle;
  }
  return at(high);
}

/** A colour over whatever lies under it, at `alpha` (0 to 1). */
export interface TranslucentColor {
  readonly color: GhosttyColor;
  readonly alpha: number;
}

/**
 * Reads the CSS colour forms the selection fill takes: `#rrggbb`, and
 * `rgb()`/`rgba()` in comma or space syntax with an optional alpha as a
 * number or a percentage. Null for anything else.
 */
export function parseTranslucentColor(value: string): TranslucentColor | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{6})$/.exec(text)?.[1];
  if (hex !== undefined) {
    return {
      color: {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16)
      },
      alpha: 1
    };
  }
  const functional = /^rgba?\(([^)]*)\)$/.exec(text)?.[1];
  if (functional === undefined) return null;
  const parts = functional.split(/[\s,/]+/).filter((part) => part.length > 0);
  if (parts.length !== 3 && parts.length !== 4) return null;
  const [r, g, b] = parts.slice(0, 3).map((part) => Number.parseFloat(part));
  const alphaText = parts[3] ?? '1';
  const alpha = alphaText.endsWith('%')
    ? Number.parseFloat(alphaText) / 100
    : Number.parseFloat(alphaText);
  if (![r, g, b, alpha].every((number) => Number.isFinite(number))) return null;
  const clamp = (number: number) => Math.round(Math.max(0, Math.min(255, number)));
  return {
    color: { r: clamp(r!), g: clamp(g!), b: clamp(b!) },
    alpha: Math.max(0, Math.min(1, alpha))
  };
}

/**
 * The colour a selected cell's text is drawn in. Selected text takes the
 * theme's selection ink (`selectionText`) where it has one, else its own
 * foreground, floored at the minimum contrast against what the reader sees
 * behind it: the selection fill laid over the cell's own background. So a
 * dim or coloured word stays readable while selected, as unselected text
 * does on its own background.
 */
export function selectedForeground(
  foreground: GhosttyColor,
  background: GhosttyColor,
  selection: TranslucentColor | null,
  selectionText?: GhosttyColor
): GhosttyColor {
  const under =
    selection === null ? background : mixed(background, selection.color, selection.alpha);

  return legibleForeground(selectionText ?? foreground, under);
}
