/**
 * The colour arithmetic the theme tokens are derived with: sRGB hex colours,
 * mixes, translucent forms, WCAG 2 contrast ratios, and the picks of a tone
 * that keeps a ratio (`firstLegible`, `legibleOn`). Pure, with no DOM, so the
 * token generator, an app deriving tokens of its own, tests, and a host
 * process that paints a window's ground before any stylesheet loads can
 * share it.
 */

/** An opaque colour as six lowercase hex digits, the form every palette entry takes. */
export type Hex = `#${string}`;

/** A colour's red, green, and blue channels, each 0 to 255. */
export interface Rgb {
  /** Red, 0 to 255. */
  readonly r: number;
  /** Green, 0 to 255. */
  readonly g: number;
  /** Blue, 0 to 255. */
  readonly b: number;
}

const HEX_COLOR = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/;

/** The channels of a six-digit hex colour; throws on any other form, so a palette typo fails loudly. */
export function rgbOf(hex: Hex): Rgb {
  const match = HEX_COLOR.exec(hex);
  if (match === null) throw new Error(`Not a six-digit lowercase hex colour: ${hex}`);
  return {
    r: Number.parseInt(match[1] ?? '', 16),
    g: Number.parseInt(match[2] ?? '', 16),
    b: Number.parseInt(match[3] ?? '', 16)
  };
}

/** `rgb` as six lowercase hex digits, each channel rounded to the nearest step. */
export function hexOf(rgb: Rgb): Hex {
  const digits = [rgb.r, rgb.g, rgb.b].map((channel) =>
    Math.min(255, Math.max(0, Math.round(channel)))
      .toString(16)
      .padStart(2, '0')
  );
  return `#${digits.join('')}`;
}

/** `share` percent of `a` over the rest of `b`, mixed in sRGB and rounded, as CSS `color-mix(in srgb)` mixes. */
export function mix(a: Hex, b: Hex, share: number): Hex {
  const x = rgbOf(a);
  const y = rgbOf(b);
  const weight = share / 100;
  const channel = (from: number, to: number) => from * weight + to * (1 - weight);
  return hexOf({ r: channel(x.r, y.r), g: channel(x.g, y.g), b: channel(x.b, y.b) });
}

/** `hex` at `opacity` percent, written `rgb(r g b / opacity%)`, a form a terminal engine's colour reader can parse. */
export function translucent(hex: Hex, opacity: number): string {
  const { r, g, b } = rgbOf(hex);
  return `rgb(${r} ${g} ${b} / ${opacity}%)`;
}

/** WCAG 2 relative luminance. */
export function luminance(hex: Hex): number {
  const linear = (channel: number) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  };
  const { r, g, b } = rgbOf(hex);
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b);
}

/** WCAG 2 contrast ratio between two opaque colours, 1 to 21. */
export function contrast(a: Hex, b: Hex): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return ((light ?? 0) + 0.05) / ((dark ?? 0) + 0.05);
}

const WHITE: Hex = '#ffffff';
const BLACK: Hex = '#000000';

/** Whether `tone` keeps `ratio` on every one of `grounds`. */
function legibleOnAll(tone: Hex, grounds: readonly Hex[], ratio: number): boolean {
  return grounds.every((ground) => contrast(tone, ground) >= ratio);
}

/**
 * The first of `candidates` that keeps a WCAG contrast of at least `ratio`
 * on every one of `grounds`, else the last candidate, which a caller orders
 * as the strongest; white when `candidates` is empty. Picks the quietest
 * tone of a ramp that still reads: `firstLegible([palette.overlay0,
 * palette.overlay1, palette.subtext0], [palette.base], 4.5)`.
 */
export function firstLegible(
  candidates: readonly Hex[],
  grounds: readonly Hex[],
  ratio: number
): Hex {
  return (
    candidates.find((tone) => legibleOnAll(tone, grounds, ratio)) ?? candidates.at(-1) ?? WHITE
  );
}

/**
 * `color` itself when it keeps a WCAG contrast of at least `ratio` on every
 * one of `grounds`, else `color` mixed toward black (over a light first
 * ground) or white (over a dark one) a percent at a time until it does, so
 * the hue survives as far as legibility allows; pure black or white when no
 * mix keeps `ratio`. 4.5 suits text, 3 a mark read by shape alone:
 * `legibleOn(palette.red, [palette.base], 4.5)`.
 */
export function legibleOn(color: Hex, grounds: readonly Hex[], ratio: number): Hex {
  const away = luminance(grounds[0] ?? WHITE) > 0.18 ? BLACK : WHITE;
  for (let share = 100; share > 0; share -= 1) {
    const tone = mix(color, away, share);
    if (legibleOnAll(tone, grounds, ratio)) return tone;
  }
  return away;
}
