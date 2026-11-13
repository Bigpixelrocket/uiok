import { describe, expect, it } from 'vitest';

import { THEMES } from '../themes/catalog.js';
import { themeTokens } from '../themes/tokens.js';
import {
  TERMINAL_MIN_CONTRAST,
  legibleForeground,
  parseTranslucentColor,
  selectedForeground,
  terminalContrast
} from './ghostty/contrast.logic.js';
import {
  BELL_FLASH_MS,
  BELL_INTERVAL_MS,
  bellFlashes,
  parseCssColor,
  terminalActionInput,
  terminalFontFamilyFromCss,
  terminalThemeFromTokens
} from './Terminal.logic.js';

/** The terminal tokens a catalog theme sets. */
function terminalTokens(tokens: Readonly<Record<string, string>>): Map<string, string> {
  return new Map(Object.entries(tokens).filter(([name]) => name.startsWith('--terminal-')));
}

describe('parseCssColor', () => {
  it('reads hex and rgb() forms', () => {
    expect(parseCssColor('#1e1e2e')).toEqual({ r: 30, g: 30, b: 46 });
    expect(parseCssColor(' #FFF ')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor('rgb(30, 102, 245)')).toEqual({ r: 30, g: 102, b: 245 });
    expect(parseCssColor('rgba(137, 180, 250, 0.28)')).toEqual({ r: 137, g: 180, b: 250 });
    expect(parseCssColor('rgb(255 255 255 / 35%)')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseCssColor('rgb(100% 0% 50%)')).toEqual({ r: 255, g: 0, b: 128 });
  });

  it('leaves other forms for the caller', () => {
    expect(parseCssColor('')).toBeNull();
    expect(parseCssColor('rebeccapurple')).toBeNull();
    expect(parseCssColor('color-mix(in srgb, red, blue)')).toBeNull();
    expect(parseCssColor('#12345')).toBeNull();
    expect(parseCssColor('rgb(1, 2)')).toBeNull();
  });
});

describe('the derived 256-color palette', () => {
  const ansi = Array.from({ length: 16 }, (_, index) => `#0${index.toString(16)}0000`);
  const palette = terminalThemeFromTokens((token) => {
    const index = /^--terminal-ansi-(\d+)$/.exec(token)?.[1];
    return index === undefined ? '' : (ansi[Number(index)] ?? '');
  }).palette;

  it('keeps the 16 ANSI colors and derives the xterm cube and gray ramp', () => {
    expect(palette).toHaveLength(256);
    expect(palette?.[1]).toEqual({ r: 1, g: 0, b: 0 });
    expect(palette?.[15]).toEqual({ r: 15, g: 0, b: 0 });
    expect(palette?.[16]).toEqual({ r: 0, g: 0, b: 0 });
    expect(palette?.[196]).toEqual({ r: 255, g: 0, b: 0 });
    expect(palette?.[110]).toEqual({ r: 135, g: 175, b: 215 });
    expect(palette?.[231]).toEqual({ r: 255, g: 255, b: 255 });
    expect(palette?.[232]).toEqual({ r: 8, g: 8, b: 8 });
    expect(palette?.[255]).toEqual({ r: 238, g: 238, b: 238 });
  });
});

describe('terminalThemeFromTokens', () => {
  it.each(THEMES.map((theme) => [theme.id, theme] as const))(
    'reads a complete theme from the tokens of %s, every colour in a form it parses',
    (_id, theme) => {
      const tokens = terminalTokens(themeTokens(theme));
      expect(tokens.size).toBe(21);
      for (const [name, value] of tokens) expect(parseCssColor(value), name).not.toBeNull();

      const terminal = terminalThemeFromTokens((token) => tokens.get(token) ?? '');
      expect(terminal.background).toEqual(parseCssColor(tokens.get('--terminal-bg') ?? ''));
      expect(terminal.foreground).toEqual(parseCssColor(tokens.get('--terminal-fg') ?? ''));
      expect(terminal.cursor).toEqual(parseCssColor(tokens.get('--terminal-cursor') ?? ''));
      expect(terminal.selectionBackground).toBe(tokens.get('--terminal-selection'));
      expect(terminal.selectionForeground).toEqual(
        parseCssColor(tokens.get('--terminal-selection-text') ?? '')
      );
      expect(terminal.palette?.[1]).toEqual(parseCssColor(tokens.get('--terminal-ansi-1') ?? ''));
      expect(terminal.palette?.[15]).toEqual(parseCssColor(tokens.get('--terminal-ansi-15') ?? ''));
    }
  );

  it('falls back without tokens and keeps the engine palette when ANSI colors are missing', () => {
    const theme = terminalThemeFromTokens(() => '');
    expect(theme.background).toEqual({ r: 30, g: 30, b: 46 });
    expect(theme.selectionBackground).toBe('rgba(137, 180, 250, 0.28)');
    expect(theme.palette).toBeUndefined();
    expect(theme.selectionForeground).toBeUndefined();
  });

  it('resolves values the parser cannot read through the given parser', () => {
    const theme = terminalThemeFromTokens(
      (token) => (token === '--terminal-bg' ? 'black' : ''),
      (value) => (value === 'black' ? { r: 0, g: 0, b: 0 } : null)
    );
    expect(theme.background).toEqual({ r: 0, g: 0, b: 0 });
  });
});

// In every theme, a cell's text keeps the minimum contrast on
// what is behind it, the ground or the selection laid over it, whatever
// colour the program asked for (each ANSI colour, the light and dark ends
// of truecolour, the terminal's own text).
describe('the per-cell floor in every theme', () => {
  const asks = (palette: readonly { r: number; g: number; b: number }[] | undefined) => [
    ...(palette?.slice(0, 16) ?? []),
    { r: 255, g: 255, b: 255 },
    { r: 235, g: 235, b: 225 },
    { r: 40, g: 40, b: 60 },
    { r: 0, g: 0, b: 0 }
  ];

  it.each(THEMES.map((theme) => [theme.id, theme] as const))(
    'keeps text on the ground of %s at the floor, bright white included',
    (_id, theme) => {
      const tokens = terminalTokens(themeTokens(theme));
      const terminal = terminalThemeFromTokens((token) => tokens.get(token) ?? '');
      const palette = asks(terminal.palette);
      expect(palette).toHaveLength(20);
      for (const asked of palette) {
        const ink = legibleForeground(asked, terminal.background);
        expect(terminalContrast(ink, terminal.background)).toBeGreaterThanOrEqual(
          TERMINAL_MIN_CONTRAST
        );
      }
    }
  );

  it.each(THEMES.map((theme) => [theme.id, theme] as const))(
    'keeps selected text of %s at the floor on the selection over the ground',
    (_id, theme) => {
      const tokens = terminalTokens(themeTokens(theme));
      const terminal = terminalThemeFromTokens((token) => tokens.get(token) ?? '');
      const fill = parseTranslucentColor(terminal.selectionBackground ?? '');
      expect(fill).not.toBeNull();
      const { color, alpha } = fill!;
      const ground = terminal.background;
      const under = {
        r: Math.round(ground.r + (color.r - ground.r) * alpha),
        g: Math.round(ground.g + (color.g - ground.g) * alpha),
        b: Math.round(ground.b + (color.b - ground.b) * alpha)
      };
      for (const asked of [terminal.foreground, ...asks(terminal.palette)]) {
        const ink = selectedForeground(asked, ground, fill, terminal.selectionForeground);
        expect(terminalContrast(ink, under)).toBeGreaterThanOrEqual(TERMINAL_MIN_CONTRAST);
      }
    }
  );
});

describe('terminalFontFamilyFromCss', () => {
  it('drops the generic keywords a canvas font string rejects', () => {
    expect(terminalFontFamilyFromCss("'SF Mono', ui-monospace, Menlo, monospace")).toBe(
      "'SF Mono', Menlo, monospace"
    );
    expect(terminalFontFamilyFromCss('system-ui, ui-monospace')).toBeUndefined();
    expect(terminalFontFamilyFromCss('')).toBeUndefined();
  });
});

describe('terminalActionInput', () => {
  it('sends the line editor the bytes Terminal sends for its editing chords', () => {
    expect(terminalActionInput('word-back')).toBe('\u001bb');
    expect(terminalActionInput('word-forward')).toBe('\u001bf');
    expect(terminalActionInput('line-start')).toBe('\u0001');
    expect(terminalActionInput('line-end')).toBe('\u0005');
    expect(terminalActionInput('delete-to-line-start')).toBe('\u0015');
  });

  it('sends nothing to clear, which the screen does by itself', () => {
    expect(terminalActionInput('clear')).toBeNull();
  });
});

describe('bellFlashes', () => {
  it('flashes the first bell, folds the ones inside the interval into it, and flashes again after', () => {
    expect(bellFlashes(null, 0)).toBe(true);
    expect(bellFlashes(1_000, 1_000)).toBe(false);
    expect(bellFlashes(1_000, 1_000 + BELL_INTERVAL_MS - 1)).toBe(false);
    expect(bellFlashes(1_000, 1_000 + BELL_INTERVAL_MS)).toBe(true);
  });

  it('flashes a bell rung without pause at most twice a second, each flash over before the next', () => {
    let lastFlashAt: number | null = null;
    const flashes: number[] = [];

    // A program ringing every 20 ms for three seconds.
    for (let now = 0; now < 3_000; now += 20) {
      if (bellFlashes(lastFlashAt, now)) {
        flashes.push(now);
        lastFlashAt = now;
      }
    }

    expect(flashes).toEqual([0, 500, 1_000, 1_500, 2_000, 2_500]);
    expect(BELL_FLASH_MS).toBeLessThan(BELL_INTERVAL_MS);
  });
});
