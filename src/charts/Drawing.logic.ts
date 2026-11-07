/*
 * A theme colour as a picture saved to a file takes it: resolved from the
 * theme's tokens to `#rrggbb`, which every SVG and canvas reader accepts.
 */

/** A colour as a token resolves it (a three or six digit hex, or an rgb function), as `#rrggbb`; null for anything else. */
export function hexColour(text: string): string | null {
  const value = text.trim().toLowerCase();
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/u.exec(value);

  if (short !== null) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  if (/^#[0-9a-f]{6}$/u.test(value)) return value;
  if (/^#[0-9a-f]{8}$/u.test(value)) return value.slice(0, 7);

  const rgb = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/u.exec(value);

  if (rgb !== null) {
    return `#${[rgb[1], rgb[2], rgb[3]]
      .map((part) => Math.min(255, Number(part)).toString(16).padStart(2, '0'))
      .join('')}`;
  }
  return null;
}
