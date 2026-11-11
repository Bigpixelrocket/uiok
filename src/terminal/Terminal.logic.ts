/**
 * The terminal component's pure decisions: its theme from the stylesheet's
 * terminal tokens (with the 256-color palette derived from the 16 ANSI
 * colors), its font stack from `--font-mono` and its size and line pitch,
 * the bytes its line-editing actions send, and how often the bell may flash.
 */

import type { GhosttyColor, GhosttyTheme } from './ghostty/core.js';
import { FALLBACK_TERMINAL_THEME } from './ghostty/fallbackColors.js';

/**
 * The terminal's text size in CSS pixels: the listing's, so a terminal
 * beside a listing reads at the same size.
 */
export const TERMINAL_FONT_SIZE = 13;

/**
 * The terminal's line pitch in CSS pixels: a little roomier than the size
 * alone, and tighter than the listing's 24px rows, which hold one item each
 * rather than running text.
 */
export const TERMINAL_LINE_HEIGHT = 19;

/**
 * The stylesheet tokens the theme reads, which every theme of the catalog
 * sets (`src/themes/tokens.ts`) as hex or `rgb()`.
 */
const TERMINAL_THEME_TOKENS = {
  background: '--terminal-bg',
  foreground: '--terminal-fg',
  cursor: '--terminal-cursor',
  selection: '--terminal-selection',
  /** `--terminal-ansi-0` through `--terminal-ansi-15`: SGR 30-37, then 90-97. */
  ansiPrefix: '--terminal-ansi-'
} as const;

const ANSI_COLOR_COUNT = 16;
/** The xterm color cube's channel levels for palette entries 16-231. */
const CUBE_LEVELS = [0, 95, 135, 175, 215, 255] as const;

function channel(value: string): number | null {
  const trimmed = value.trim();
  const number = trimmed.endsWith('%')
    ? (Number.parseFloat(trimmed) / 100) * 255
    : Number.parseFloat(trimmed);
  return Number.isFinite(number) ? Math.round(Math.max(0, Math.min(255, number))) : null;
}

/**
 * Parses the color forms the terminal tokens use: `#rgb`, `#rrggbb`, and
 * `rgb()`/`rgba()` in comma or space syntax (alpha ignored). Anything else
 * is null, for the caller to resolve another way.
 */
export function parseCssColor(value: string): GhosttyColor | null {
  const text = value.trim().toLowerCase();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/.exec(text)?.[1];
  if (hex !== undefined) {
    const digits =
      hex.length === 3
        ? [...hex].map((digit) => digit + digit)
        : [hex.slice(0, 2), hex.slice(2, 4), hex.slice(4, 6)];
    const [r, g, b] = digits.map((pair) => Number.parseInt(pair, 16));
    return { r: r ?? 0, g: g ?? 0, b: b ?? 0 };
  }
  const functional = /^rgba?\(([^)]*)\)$/.exec(text)?.[1];
  if (functional === undefined) return null;
  const parts = functional
    .split(/[\s,/]+/)
    .filter((part) => part.length > 0)
    .slice(0, 3)
    .map(channel);
  const [r, g, b] = parts;
  if (parts.length !== 3 || r == null || g == null || b == null) return null;
  return { r, g, b };
}

/**
 * The full 256-color palette for 16 ANSI colors: those 16, then xterm's
 * 6x6x6 color cube and 24-step gray ramp, which programs address by index.
 */
function terminalPalette(ansi: readonly GhosttyColor[]): GhosttyColor[] {
  if (ansi.length !== ANSI_COLOR_COUNT) {
    throw new Error(`A terminal palette starts from ${ANSI_COLOR_COUNT} ANSI colors`);
  }
  const palette = [...ansi];
  for (let index = 0; index < 216; index += 1) {
    palette.push({
      r: CUBE_LEVELS[Math.floor(index / 36)] ?? 0,
      g: CUBE_LEVELS[Math.floor(index / 6) % 6] ?? 0,
      b: CUBE_LEVELS[index % 6] ?? 0
    });
  }
  for (let index = 0; index < 24; index += 1) {
    const level = 8 + index * 10;
    palette.push({ r: level, g: level, b: level });
  }
  return palette;
}

/**
 * The theme the stylesheet's terminal tokens describe. `read` returns a
 * token's value; `parse` resolves a value to a color, or null. Missing
 * defaults fall back to Catppuccin Mocha (`FALLBACK_TERMINAL_THEME`); missing ANSI colors leave Ghostty's
 * own palette in place.
 */
export function terminalThemeFromTokens(
  read: (token: string) => string,
  parse: (value: string) => GhosttyColor | null = parseCssColor
): GhosttyTheme {
  const color = (token: string, fallback: GhosttyColor): GhosttyColor =>
    parse(read(token)) ?? fallback;
  const selection = read(TERMINAL_THEME_TOKENS.selection).trim();
  const ansi = Array.from({ length: ANSI_COLOR_COUNT }, (_, index) =>
    parse(read(`${TERMINAL_THEME_TOKENS.ansiPrefix}${index}`))
  );
  const complete = ansi.every((entry): entry is GhosttyColor => entry !== null);
  return {
    background: color(TERMINAL_THEME_TOKENS.background, FALLBACK_TERMINAL_THEME.background),
    foreground: color(TERMINAL_THEME_TOKENS.foreground, FALLBACK_TERMINAL_THEME.foreground),
    cursor: color(TERMINAL_THEME_TOKENS.cursor, FALLBACK_TERMINAL_THEME.cursor),
    selectionBackground:
      selection.length > 0 ? selection : (FALLBACK_TERMINAL_THEME.selectionBackground ?? ''),
    ...(complete ? { palette: terminalPalette(ansi) } : {})
  };
}

/**
 * The `--font-mono` stack without the CSS-only generic keywords (such as
 * `ui-monospace` and `system-ui`) that make a canvas font string invalid;
 * undefined when nothing named is left, for the engine's default stack.
 */
export function terminalFontFamilyFromCss(value: string): string | undefined {
  const families = value
    .split(',')
    .map((family) => family.trim())
    .filter((family) => family.length > 0 && !/^(ui-[a-z-]+|system-ui)$/i.test(family));
  return families.length > 0 ? families.join(', ') : undefined;
}

/**
 * How long the visual bell shows, in milliseconds: the flash's fade, or the
 * static edge tint that takes its place under reduced motion. terminal.css
 * fades over `--duration-slow`, the same 280 ms.
 */
export const BELL_FLASH_MS = 280;

/**
 * The shortest time between two flashes of the visual bell, in milliseconds.
 * Bells inside it fold into the flash that opened it, so a program ringing
 * without pause flashes at most twice a second instead of strobing, and a
 * flash always ends before the next one starts.
 */
export const BELL_INTERVAL_MS = 500;

/**
 * Whether a bell at `now` flashes, given when the last flash started (null
 * for none yet): only once the interval since then has passed.
 */
export function bellFlashes(lastFlashAt: number | null, now: number): boolean {
  return lastFlashAt === null || now - lastFlashAt >= BELL_INTERVAL_MS;
}

/**
 * What a terminal does for a chord its host binds to it, as macOS Terminal
 * does: clear to start (the scrollback and the rows above the cursor), move
 * to the line's start or end, move back or forward a word, or delete to the
 * line's start. The host decides which chords run them (`actionForKey`).
 */
export type TerminalAction =
  'clear' | 'line-start' | 'line-end' | 'word-back' | 'word-forward' | 'delete-to-line-start';

/** The fields of a keydown a host reads to pick a terminal action. */
export type TerminalKeyStroke = Pick<
  KeyboardEvent,
  'altKey' | 'code' | 'ctrlKey' | 'key' | 'metaKey' | 'shiftKey'
>;

/**
 * Readline and zsh line-editor bytes for the editing actions; clear sends
 * nothing, since the screen clears itself and the program is not told.
 */
const ACTION_INPUT: Readonly<Record<Exclude<TerminalAction, 'clear'>, string>> = {
  'line-start': '\u0001',
  'line-end': '\u0005',
  'word-back': '\u001bb',
  'word-forward': '\u001bf',
  'delete-to-line-start': '\u0015'
};

/** The bytes an action sends the shell, or null for clear, which only the screen does. */
export function terminalActionInput(action: TerminalAction): string | null {
  return action === 'clear' ? null : ACTION_INPUT[action];
}
