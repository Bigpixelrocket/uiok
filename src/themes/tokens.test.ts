// @vitest-environment node

/**
 * The token rules' invariants: every theme yields the same tokens, text and
 * marks keep their contrast in every theme, overrides flow into the tokens
 * derived from them, and Latte and Mocha keep their frozen values.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { readStylesheet } from '../../test/stylesheets.js';

import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEMES,
  themeById,
  type Theme
} from './catalog.js';
import { contrast, hexOf, rgbOf, type Hex, type Rgb } from './color.js';
import { DARK_THEME_IDS, LIGHT_THEME_IDS, THEME_ENTRIES } from './ids.js';
import {
  FIXED_TOKENS,
  PREVIEW_TOKENS,
  previewTokens,
  themeStylesheet,
  themeTokens,
  type ThemeOverrides,
  type ThemeTokenName
} from './tokens.js';

type Tokens = Readonly<Record<string, string>>;

/** The frozen Latte and Mocha tokens, by theme id. */
const fixture = JSON.parse(
  readFileSync(new URL('./catppuccin-tokens.fixture.json', import.meta.url), 'utf8')
) as Readonly<Record<'catppuccin-latte' | 'catppuccin-mocha', { readonly root: Tokens }>>;

/** The tokens the root sees under `theme`. */
function windowTokens(theme: Theme): Tokens {
  return { ...FIXED_TOKENS, ...themeTokens(theme) };
}

/** `value` with every `var()` replaced by what it names in `tokens`, all the way down. */
function substitute(value: string, tokens: Tokens, depth = 0): string {
  if (depth > 10) throw new Error(`var() cycle in ${value}`);
  return value.replace(/var\((--[a-z0-9-]+)\)/g, (_, name: string) => {
    const named = tokens[name];
    if (named === undefined) throw new Error(`${name} is not defined`);
    return substitute(named, tokens, depth + 1);
  });
}

/** `value` with every hex, `rgb()`, and `rgba()` colour written one way, so equal colours compare equal. */
function canonical(value: string): string {
  const channels = (r: number, g: number, b: number, alpha: number) =>
    `rgba(${r},${g},${b},${Math.round(alpha * 1000) / 1000})`;
  return value
    .replace(/#([0-9a-f]{3})\b/gi, (_, short: string) =>
      `#${[...short].map((digit) => digit + digit).join('')}`.toLowerCase()
    )
    .replace(/#[0-9a-f]{6}\b/gi, (hex) => {
      const { r, g, b } = rgbOf(hex.toLowerCase() as Hex);
      return channels(r, g, b, 1);
    })
    .replace(/rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)/g, (_, r, g, b, opacity) =>
      channels(Number(r), Number(g), Number(b), Number(opacity) / 100)
    )
    .replace(/rgba\((\d+), (\d+), (\d+), ([\d.]+)\)/g, (_, r, g, b, alpha) =>
      channels(Number(r), Number(g), Number(b), Number(alpha))
    )
    .replace(/\s+/g, ' ')
    .trim();
}

describe('the theme catalog', () => {
  it('names every theme once, in kebab case, with a complete terminal palette', () => {
    const ids = THEMES.map((theme) => theme.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const theme of THEMES) {
      expect(theme.id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      expect(theme.terminal.ansi).toHaveLength(16);
    }
  });

  it('defaults each appearance to a theme of that appearance', () => {
    expect(THEMES).toContain(DEFAULT_LIGHT_THEME);
    expect(THEMES).toContain(DEFAULT_DARK_THEME);
    expect(DEFAULT_LIGHT_THEME.appearance).toBe('light');
    expect(DEFAULT_DARK_THEME.appearance).toBe('dark');
  });

  it('holds a theme for every id the list names, of the appearance the list gives it', () => {
    expect(THEMES.map(({ id, name, appearance }) => ({ id, name, appearance }))).toEqual(
      THEME_ENTRIES
    );
    expect(LIGHT_THEME_IDS).toEqual([
      'catppuccin-latte',
      'github-light',
      'gruvbox-light',
      'one-light',
      'rose-pine-dawn',
      'solarized-light',
      'tokyo-night-day'
    ]);
    expect(DARK_THEME_IDS).toEqual([
      'catppuccin-frappe',
      'catppuccin-macchiato',
      'catppuccin-mocha',
      'dracula',
      'github-dark',
      'gruvbox-dark',
      'nord',
      'one-dark',
      'rose-pine',
      'solarized-dark',
      'tokyo-night'
    ]);
    expect(themeById('catppuccin-frappe').palette.base).toBe('#303446');
  });

  it('gives every theme the same tokens, in the same order', () => {
    const names = Object.keys(themeTokens(DEFAULT_LIGHT_THEME));
    for (const theme of THEMES) expect(Object.keys(themeTokens(theme))).toEqual(names);
    expect(names.filter((name) => name in FIXED_TOKENS)).toEqual([]);
  });

  it('gives every theme a preview scope of its own literal colours, whatever the window wears', () => {
    const sheet = themeStylesheet();
    for (const theme of THEMES) {
      const tokens = previewTokens(theme);
      expect(Object.keys(tokens)).toEqual([...PREVIEW_TOKENS]);
      // A preview paints with literal colours alone: a var() would resolve on the root.
      for (const value of Object.values(tokens)) expect(value).toMatch(/^#[0-9a-f]{6}$/);
      const block = `[data-theme-preview='${theme.id}'] {\n${Object.entries(tokens)
        .map(([name, value]) => `  ${name}: ${value};`)
        .join('\n')}\n}`;
      expect(sheet).toContain(`\n\n${block}`);
    }
  });
});

describe("an app's own tokens", () => {
  // An app token derived from the theme: its accent at 14%, and a hand-tuned
  // value for one theme by its id.
  const options = {
    banner: 'App tokens.',
    extraFixed: { '--app-knob': 'var(--switch-knob)' },
    extraTokens: (theme: Theme, tokens: Readonly<Record<string, string>>) => ({
      '--app-tint': theme.id === 'nord' ? '#123456' : `${tokens['--accent']}24`
    }),
    extraBlocks: { "[data-variant='compact']": { '--app-gap': '2px' } }
  };

  it('are written under the same selectors as the theme tokens they derive from', () => {
    const sheet = themeStylesheet(options);
    const latte = themeTokens(DEFAULT_LIGHT_THEME)['--accent'];
    expect(sheet.startsWith('/* App tokens. */\n\n:root {\n  color-scheme: light dark;\n')).toBe(
      true
    );
    expect(sheet).toContain(`  --app-knob: var(--switch-knob);\n  --bg: `);
    expect(sheet).toContain(`  --app-tint: ${latte}24;\n}`);
    expect(sheet).toContain("[data-variant='compact'] {\n  --app-gap: 2px;\n}");
    expect(sheet).toContain(
      `:root[data-dark-theme='nord'] {\n${Object.entries(themeTokens(themeById('nord')))
        .map(([name, value]) => `    ${name}: ${value};`)
        .join('\n')}\n    --app-tint: #123456;\n  }`
    );
    // A preview scope holds the preview tokens alone.
    expect(sheet).not.toMatch(/\[data-theme-preview='[a-z-]+'\] \{[^}]*--app-/);
  });

  it('can be written alone, for an app that imports @bigpixelrocket/uiok/styles.css', () => {
    const sheet = themeStylesheet({ ...options, includeUiokTokens: false });
    const declared = [...sheet.matchAll(/^\s*(--[a-z0-9-]+|color-scheme):/gm)].map(
      (match) => match[1]
    );
    expect(new Set(declared)).toEqual(new Set(['--app-knob', '--app-tint', '--app-gap']));
    // Two :root blocks, then every theme's block; no preview scope declares anything of the app's.
    expect(declared.filter((name) => name === '--app-tint')).toHaveLength(2 + THEMES.length);
    expect(sheet).not.toContain('data-theme-preview');
  });

  it('may not redefine a uiok token or name anything but a custom property', () => {
    expect(() => themeStylesheet({ extraFixed: { '--accent': '#000000' } })).toThrow(
      'extraFixed redefines --accent'
    );
    expect(() => themeStylesheet({ extraTokens: () => ({ '--chart-1': '#000000' }) })).toThrow(
      'extraTokens(catppuccin-latte) redefines --chart-1'
    );
    expect(() => themeStylesheet({ extraBlocks: { '.x': { color: 'red' } } })).toThrow(
      'not a kebab-case custom property'
    );
  });

  it('may not redefine a custom property @bigpixelrocket/uiok/styles.css declares or reads', () => {
    // The whole delivered sheet: the base, the theme tokens, every component's.
    const sheet = readStylesheet('src/styles.css').replace(/\/\*[\s\S]*?\*\//g, '');
    const names = new Set(
      [...sheet.matchAll(/(--[a-z0-9-]+)\s*:|var\(\s*(--[a-z0-9-]+)/g)].map(
        (match) => match[1] ?? match[2] ?? ''
      )
    );
    // A component's hook and the base sheet's tokens are among them.
    expect(names).toContain('--stripe-ground');
    expect(names).toContain('--z-tooltip');
    for (const name of names) {
      expect(() => themeStylesheet({ extraFixed: { [name]: '0' } })).toThrow(
        `extraFixed redefines ${name}`
      );
    }
  });

  it('may not end a declaration, rule, or comment early', () => {
    expect(() =>
      themeStylesheet({ extraTokens: () => ({ '--app-tone': 'red; --accent: red !important' }) })
    ).toThrow('extraTokens(catppuccin-latte) gives --app-tone a value');
    for (const value of ['a{', 'a}', 'a /* b', 'b */ a', 'url(a;b', '"a;b']) {
      expect(() => themeStylesheet({ extraFixed: { '--app-x': value } })).toThrow(
        'extraFixed gives --app-x a value'
      );
    }
    for (const selector of ['.a { color: red } .b', '.a;', '.a /* x */', '.a}']) {
      expect(() =>
        themeStylesheet({ extraBlocks: { [selector]: { '--app-gap': '2px' } } })
      ).toThrow(`extraBlocks['${selector}'] is a selector`);
    }
    expect(() => themeStylesheet({ banner: 'Covers src/**/*.css' })).toThrow('banner holds */');
    // A comment opener alone stays inside the banner's comment.
    expect(themeStylesheet({ banner: 'See /* here' })).toMatch(/^\/\* See \/\* here \*\//);
  });

  it('read CSS escapes and raw newlines as CSS does, so a quote cannot hide a separator', () => {
    for (const value of [
      '"a\\"b"; --accent: red !important; --app-y: "c\\"d"',
      "'a\\'b'; --accent: red !important; --app-y: 'c\\'d'",
      '"\\"";--accent:red !important;"',
      '"x\n;--accent:red !important;\n"',
      'a"',
      'url("data:image/svg+xml;utf8,<svg>\n</svg>")'
    ]) {
      expect(() => themeStylesheet({ extraFixed: { '--app-x': value } }), value).toThrow(
        'extraFixed gives --app-x a value'
      );
    }
    const selector = '[a="\\""]{--accent:red}[b="';
    expect(() => themeStylesheet({ extraBlocks: { [selector]: { '--app-gap': '2px' } } })).toThrow(
      'is a selector that would end its rule early'
    );
  });

  it('may hold separators inside a string or url()', () => {
    const png = 'url(data:image/png;base64,AAAA)';
    const svg = 'url("data:image/svg+xml;utf8,<svg/>")';
    const sheet = themeStylesheet({
      extraFixed: { '--app-png': png, '--app-svg': svg },
      extraBlocks: { "[data-x='a;b']": { '--app-gap': '2px' } }
    });
    expect(sheet).toContain(`  --app-png: ${png};\n`);
    expect(sheet).toContain(`  --app-svg: ${svg};\n`);
    expect(sheet).toContain("[data-x='a;b'] {\n  --app-gap: 2px;\n}");
  });

  it('may hold escaped quotes, a ) in a quoted url(), and a value over two lines', () => {
    const values = [
      '"a\\"b"',
      'url("a)b.png")',
      `url("data:image/svg+xml;utf8,<svg><g transform='rotate(45)'/></svg>")`,
      'var(--app-w, 1px) !important',
      '0 1px 2px var(--app-a),\n  0 2px 4px var(--app-b)'
    ];
    const sheet = themeStylesheet({
      extraFixed: Object.fromEntries(values.map((value, index) => [`--app-v${index}`, value])),
      extraBlocks: { '.md\\:wide': { '--app-gap': '2px' } }
    });
    values.forEach((value, index) => expect(sheet).toContain(`  --app-v${index}: ${value};\n`));
    expect(sheet).toContain('.md\\:wide {\n  --app-gap: 2px;\n}');
  });
});

describe('overrides', () => {
  const withOverrides = (overrides: ThemeOverrides): Theme => ({
    ...DEFAULT_DARK_THEME,
    overrides
  });

  it('derive each token that follows an overridden one from the override', () => {
    // A pale primary takes dark text, and a deep one white, whatever the rule's primary was.
    expect(themeTokens(withOverrides({ '--primary': '#f5f0a0' }))['--on-primary']).toBe(
      DEFAULT_DARK_THEME.palette.crust
    );
    expect(themeTokens(withOverrides({ '--primary': '#1d2a8a' }))['--on-primary']).toBe('#ffffff');
    // The accent carries the text on it, the cursor row's tint, and the terminal's selection.
    const accented = themeTokens(withOverrides({ '--accent': '#ff8000' }));
    expect(accented['--on-accent']).toBe(DEFAULT_DARK_THEME.palette.crust);
    expect(accented['--terminal-selection']).toBe('rgb(255 128 0 / 28%)');
    // A ground the theme tunes is the one the quiet text keeps its contrast on.
    const grounded = themeTokens(withOverrides({ '--bg-header': '#45495f' }));
    expect(contrast(grounded['--text-dim'] as Hex, '#45495f')).toBeGreaterThanOrEqual(4.5);
    expect(grounded['--text-dim']).not.toBe(themeTokens(DEFAULT_DARK_THEME)['--text-dim']);
  });

  it("draw a group hue from the theme's own colour, its ring following", () => {
    expect(themeTokens(DEFAULT_DARK_THEME)['--group-dot-ring']).toBe('none');
    const faint = themeTokens({ ...DEFAULT_DARK_THEME, groups: { green: '#202030' } });
    expect(faint['--group-green']).toBe('#202030');
    expect(faint['--group-blue']).toBe(DEFAULT_DARK_THEME.palette.blue);
    expect(faint['--group-dot-ring']).not.toBe('none');
  });

  it('take the kind of value each token holds', () => {
    const typed: ThemeOverrides = {
      '--primary': '#123456',
      '--tonal-hover-brightness': '1.05'
    };
    // @ts-expect-error A colour token takes a hex colour, not a compound value.
    const compoundColour: ThemeOverrides = { '--primary': 'rgb(0 0 0 / 50%)' };
    // @ts-expect-error A factor takes a number, not a colour.
    const colourFactor: ThemeOverrides = { '--tonal-hover-brightness': '#ffffff' };
    // @ts-expect-error A compound token follows its rule in every theme.
    const compound: ThemeOverrides = { '--row-lift': 'transparent' };
    // @ts-expect-error The text is drawn from the palette, which the quieter text and the terminal read too.
    const paletteDrawn: ThemeOverrides = { '--text': '#ffffff' };
    // @ts-expect-error The primary hue is drawn from the palette, which the primary and tonal text read too.
    const primaryHue: ThemeOverrides = { '--primary-hue': '#ffffff' };
    expect([typed, compoundColour, colourFactor, compound, paletteDrawn, primaryHue]).toHaveLength(
      6
    );
  });

  it('hold the danger colour at 4.5:1 on a panel where a palette red would fall short', () => {
    const faint: Theme = {
      ...DEFAULT_LIGHT_THEME,
      palette: { ...DEFAULT_LIGHT_THEME.palette, red: '#f08a9a' }
    };
    const danger = themeTokens(faint)['--danger'] as Hex;
    expect(contrast('#f08a9a', faint.palette.base)).toBeLessThan(4.5);
    expect(contrast(danger, faint.palette.base)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('Catppuccin Latte and Mocha', () => {
  it.each([
    ['catppuccin-latte', DEFAULT_LIGHT_THEME],
    ['catppuccin-mocha', DEFAULT_DARK_THEME]
  ] as const)('%s keeps every colour token it had before the catalog', (id, theme) => {
    expect(theme.id).toBe(id);
    const frozen = fixture[id];
    const generated = windowTokens(theme);

    expect(Object.keys(generated).sort()).toEqual(Object.keys(frozen.root).sort());

    const before = frozen.root;
    for (const name of Object.keys(before)) {
      expect(canonical(substitute(generated[name] ?? '', generated)), name).toBe(
        canonical(substitute(before[name] ?? '', before))
      );
    }
  });
});

/** A colour as the tests composite it: channels and an opacity, 0 to 1. */
interface Paint {
  readonly rgb: Rgb;
  readonly alpha: number;
}

/** What a token's colour value paints, for the forms the tokens use. */
function paint(value: string, tokens: Tokens): Paint {
  const text = substitute(value, tokens).trim();
  if (text === 'transparent') return { rgb: { r: 0, g: 0, b: 0 }, alpha: 0 };
  if (text === 'black') return { rgb: { r: 0, g: 0, b: 0 }, alpha: 1 };
  if (text === 'white') return { rgb: { r: 255, g: 255, b: 255 }, alpha: 1 };
  if (/^#[0-9a-f]{6}$/.test(text)) return { rgb: rgbOf(text as Hex), alpha: 1 };
  const translucent = /^rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)$/.exec(text);
  if (translucent !== null) {
    const [, r, g, b, opacity] = translucent.map(Number);
    return { rgb: { r: r ?? 0, g: g ?? 0, b: b ?? 0 }, alpha: (opacity ?? 0) / 100 };
  }
  const mixed = /^color-mix\(in srgb, (.+) (\d+)%, (.+)\)$/.exec(text);
  if (mixed !== null) {
    const a = paint(mixed[1] ?? '', tokens);
    const b = paint(mixed[3] ?? '', tokens);
    const share = Number(mixed[2]) / 100;
    const alpha = a.alpha * share + b.alpha * (1 - share);
    // color-mix mixes premultiplied channels, then divides by the mixed opacity.
    const channel = (key: keyof Rgb) =>
      alpha === 0 ? 0 : (a.rgb[key] * a.alpha * share + b.rgb[key] * b.alpha * (1 - share)) / alpha;
    return { rgb: { r: channel('r'), g: channel('g'), b: channel('b') }, alpha };
  }
  throw new Error(`Cannot paint ${text}`);
}

/** `value` laid over the opaque `ground`. */
function over(value: string, ground: Hex, tokens: Tokens): Hex {
  const { rgb, alpha } = paint(value, tokens);
  const channel = (key: keyof Rgb) => rgb[key] * alpha + rgbOf(ground)[key] * (1 - alpha);
  return hexOf({ r: channel('r'), g: channel('g'), b: channel('b') });
}

/** The grounds a pairing is drawn on, bottom layer first. */
const ON = {
  ground: ['var(--bg)'],
  panel: ['var(--bg-panel)'],
  header: ['var(--bg-header)'],
  listing: ['var(--bg-panel)', 'var(--file-list-bg)'],
  'the column strip': ['color-mix(in srgb, var(--bg-header) 40%, var(--bg-panel))'],
  'the cursor row': ['var(--bg-panel)', 'var(--cursor-row-bg)'],
  'a surface0 fill': ['var(--bg-panel)', 'var(--fill)'],
  'a hovered panel': ['var(--bg-panel)', 'var(--hover-wash)'],
  'a hovered ground': ['var(--bg)', 'var(--hover-wash)'],
  'a hovered header': ['var(--bg-header)', 'var(--hover-wash)'],
  'a marked row over the ground': ['var(--bg)', 'var(--marked-bg)'],
  'a marked row over a panel': ['var(--bg-panel)', 'var(--marked-bg)'],
  'a marked row under the cursor': ['var(--bg)', 'var(--marked-cursor-bg)'],
  'the current item over a panel': ['var(--bg-panel)', 'var(--current-bg)'],
  'the current item over the ground': ['var(--bg)', 'var(--current-bg)'],
  'the current item over the header': ['var(--bg-header)', 'var(--current-bg)'],
  'the accent wash over the header': ['var(--bg-header)', 'var(--accent-wash)'],
  'the strong accent wash over a panel': ['var(--bg-panel)', 'var(--accent-wash-strong)'],
  'the track over a panel': ['var(--bg-panel)', 'var(--control-track)'],
  'the track over the ground': ['var(--bg)', 'var(--control-track)'],
  'the track over the header': ['var(--bg-header)', 'var(--control-track)'],
  'a match over a listing': ['var(--bg-panel)', 'var(--file-list-bg)', 'var(--match-bg)'],
  'a match over the cursor row': ['var(--bg-panel)', 'var(--cursor-row-bg)', 'var(--match-bg)'],
  'selected text over a panel': ['var(--bg-panel)', 'var(--text-selection-bg)'],
  'the selection': ['var(--selected-bg)'],
  'the cursor on the selection': ['var(--selected-cursor-bg)'],
  'a match on the selection': ['var(--selection-hit)'],
  'the primary': ['var(--primary)'],
  'the primary on hover': ['var(--primary-hover)'],
  'the tonal fill': ['var(--tonal)'],
  'the tonal fill on hover': ['var(--tonal-hover)'],
  'the accent': ['var(--accent)'],
  'the danger fill': ['var(--danger)'],
  'the warning fill': ['var(--warning)'],
  'the success fill': ['var(--success)'],
  'the terminal': ['var(--terminal-bg)'],
  'the off track': ['var(--control-border)']
} as const satisfies Readonly<Record<string, readonly string[]>>;

type Ground = keyof typeof ON;

/** Every ground a word in a pane is drawn on. */
const WORD_GROUNDS: readonly Ground[] = [
  'ground',
  'panel',
  'header',
  'listing',
  'the column strip',
  'the cursor row',
  'a hovered panel',
  'a marked row over the ground',
  'a marked row over a panel',
  'the current item over a panel',
  'the current item over the ground',
  'the current item over the header'
];

/** `fg` at `floor` on each of `grounds`, as rows of the pairing table. */
const pairs = (
  fg: string,
  floor: number,
  grounds: readonly Ground[]
): (readonly [string, number, Ground, readonly string[]])[] =>
  grounds.map((on) => [fg, floor, on, ON[on]] as const);

const STATUSES = ['danger', 'warning', 'success'] as const;

/**
 * Every pairing the stylesheets draw, once each stylesheet reads the role
 * meant for it: a word at 4.5:1 and a mark, outline, or chart line at 3:1 on
 * every ground it sits on, in every theme. A token missing from this table
 * has no floor; add its pairings when a stylesheet first draws it.
 */
const PAIRINGS = [
  // Words.
  ...pairs('var(--text)', 4.5, [
    ...WORD_GROUNDS,
    'a surface0 fill',
    'a marked row under the cursor',
    'the track over a panel',
    'the track over the ground',
    'the track over the header',
    'a match over a listing',
    'a match over the cursor row',
    'selected text over a panel'
  ]),
  ...pairs('var(--current-text)', 4.5, [
    'the current item over a panel',
    'the current item over the ground',
    'the current item over the header'
  ]),
  ...pairs('var(--text-dim)', 4.5, [
    'ground',
    'panel',
    'header',
    'listing',
    'a hovered panel',
    'a hovered ground',
    'a hovered header'
  ]),
  ...pairs('var(--text-placeholder)', 4.5, ['ground', 'panel', 'header']),
  ...pairs('var(--text-on-surface)', 4.5, [
    'a surface0 fill',
    'the cursor row',
    'the track over a panel',
    'the track over the ground',
    'the track over the header'
  ]),
  ...pairs('var(--row-meta-text)', 4.5, ['listing', 'panel', 'header']),
  ...pairs('var(--accent-text)', 4.5, [
    ...WORD_GROUNDS,
    'the accent wash over the header',
    'the strong accent wash over a panel'
  ]),
  ...STATUSES.flatMap((status) => [
    ...pairs(`var(--${status}-text)`, 4.5, WORD_GROUNDS),
    ...(['ground', 'panel'] as const).flatMap((under) =>
      [`var(--${status}-wash)`, `var(--${status}-wash-strong)`].map(
        (wash) =>
          [
            `var(--${status}-text)`,
            4.5,
            `its wash over the ${under}`,
            [`var(--bg${under === 'panel' ? '-panel' : ''})`, wash]
          ] as const
      )
    )
  ]),
  ...pairs('var(--on-selected)', 4.5, [
    'the selection',
    'the cursor on the selection',
    'a match on the selection'
  ]),
  ...pairs('var(--on-selected-dim)', 4.5, ['the selection', 'the cursor on the selection']),
  ...pairs('var(--on-accent)', 4.5, ['the accent']),
  ...pairs('var(--on-primary)', 4.5, ['the primary', 'the primary on hover']),
  ...pairs('var(--on-tonal)', 4.5, ['the tonal fill', 'the tonal fill on hover']),
  ...pairs('var(--on-danger)', 4.5, ['the danger fill']),
  ...pairs('var(--on-warning)', 4.5, ['the warning fill']),
  ...pairs('var(--on-success)', 4.5, ['the success fill']),
  ...pairs('var(--terminal-fg)', 4.5, ['the terminal']),

  // Marks, outlines, and lines.
  ...[...Array(16).keys()].flatMap((index) =>
    pairs(`var(--terminal-ansi-${index})`, 3, ['the terminal'])
  ),
  ...pairs('var(--control-border)', 3, ['ground', 'panel', 'header', 'listing']),
  ...pairs('var(--scrollbar-thumb)', 3, ['ground', 'panel', 'header']),
  ...pairs('var(--bg-panel)', 3, ['the off track']),
  ...pairs('var(--idle-mark)', 3, ['listing', 'the cursor row', 'panel', 'ground']),
  ...STATUSES.flatMap((status) =>
    pairs(`var(--${status})`, 3, ['ground', 'panel', 'header', 'listing', 'the cursor row'])
  ),
  ...pairs('var(--success)', 3, ['the track over a panel', 'the track over the ground']),
  ...pairs('var(--danger)', 3, ['the track over a panel', 'the track over the ground']),
  ...pairs('var(--progress-idle)', 3, ['the track over a panel', 'the track over the ground']),
  ...pairs('var(--accent)', 3, [
    'ground',
    'panel',
    'header',
    'listing',
    'the cursor row',
    'the track over a panel',
    'the track over the ground'
  ]),
  ...pairs('var(--cursor-bar)', 3, ['the cursor row']),
  ...pairs('var(--marked-bar)', 3, [
    'a marked row over the ground',
    'a marked row over a panel',
    'a marked row under the cursor'
  ]),
  ...pairs('var(--primary-mark)', 3, ['listing', 'the cursor row', 'panel', 'ground']),
  ...pairs('var(--text-faint)', 3, ['ground', 'panel', 'header']),
  ...[1, 2, 3, 4, 5, 6, 7, 8].flatMap((index) =>
    pairs(`var(--chart-${index})`, 3, ['panel', 'ground'])
  ),
  // Hairlines: a divider and a frame stand apart from every bare ground.
  ...pairs('var(--border)', 1.15, ['ground', 'panel', 'header']),
  ...pairs('var(--border-strong)', 1.3, ['ground', 'panel', 'header'])
];

describe.each(THEMES.map((theme) => [theme.id, theme] as const))('%s', (_id, theme) => {
  const tokens = windowTokens(theme);
  const solid = (name: ThemeTokenName | string): Hex => over(`var(${name})`, '#000000', tokens);
  const ground = solid('--ground');
  const surface = solid('--surface');
  const header = solid('--surface-header');
  // A recessed surface, such as a tab behind the selected one: the panel at 45% over the ground.
  const recessed = over('color-mix(in srgb, var(--surface) 45%, transparent)', ground, tokens);
  const fileList = over('var(--file-list-bg)', surface, tokens);
  const ratio = (text: string, on: Hex) => contrast(over(`var(${text})`, on, tokens), on);

  it.each([
    ['--text', 'the ground', () => ground],
    ['--text', 'a panel', () => surface],
    ['--text', 'the header', () => header],
    ['--text-dim', 'the ground', () => ground],
    ['--text-dim', 'a panel', () => surface],
    ['--text-dim', 'the header', () => header],
    ['--text-on-surface', 'a surface0 fill', () => solid('--cursor-bg')],
    ['--text-on-surface', 'the cursor row', () => solid('--cursor-row-bg')],
    ['--on-accent', 'the accent', () => solid('--accent')],
    ['--on-primary', 'the primary', () => solid('--primary')],
    ['--on-tonal', 'the tonal fill', () => solid('--tonal')],
    ['--row-meta-text', 'a listing', () => fileList],
    ['--danger', 'a panel', () => surface]
  ] as const)('keeps %s at 4.5:1 on %s', (text, _on, on) => {
    expect(ratio(text, on())).toBeGreaterThanOrEqual(4.5);
  });

  /** `layers` laid over each other, bottom first; the bottom is opaque. */
  const layered = (layers: readonly string[]): Hex =>
    layers.reduce<Hex>((under, layer) => over(layer, under, tokens), '#000000');
  const ratioOn = (fg: string, layers: readonly string[]) => {
    const under = layered(layers);
    return contrast(over(fg, under, tokens), under);
  };

  it.each(PAIRINGS)('keeps %s at %s:1 on %s', (fg, floor, _on, layers) => {
    expect(ratioOn(fg, layers)).toBeGreaterThanOrEqual(floor);
  });

  it('draws the eight chart series apart from each other', () => {
    const series = [1, 2, 3, 4, 5, 6, 7, 8].map((index) => rgbOf(solid(`--chart-${index}`)));
    series.forEach((a, i) =>
      series.slice(i + 1).forEach((b, j) => {
        const distance = Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
        expect(distance, `--chart-${i + 1} and --chart-${i + j + 2}`).toBeGreaterThanOrEqual(48);
      })
    );
  });

  it('stands a marked row apart from the ground, or keeps the text and lets its bar carry the mark', () => {
    for (const on of ['var(--bg)', 'var(--bg-panel)']) {
      const tint = layered([on, 'var(--marked-bg)']);
      const apart = contrast(tint, layered([on])) >= 1.25;
      // Where the tint cannot stand 1.25:1 apart and keep the text, the text wins.
      const stronger = over('color-mix(in srgb, var(--accent) 1%, var(--marked-bg))', tint, tokens);
      expect(apart || contrast(over('var(--text)', stronger, tokens), stronger) < 4.6).toBe(true);
    }
  });

  it('keeps the text at 4.5:1 on every status tint', () => {
    for (const status of ['--success', '--warning', '--danger']) {
      const tint = over(`color-mix(in srgb, var(${status}) 16%, transparent)`, surface, tokens);
      expect(ratio('--text', tint), status).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('mutes a disabled control well apart from an enabled one, still readable', () => {
    // Its words fade to --disabled-opacity: at least 2.25:1 from the enabled
    // text (the quieter --text-dim can sit as close as 1:1), and at least
    // 2:1 on the ground, legible though exempt from the 4.5:1 rule.
    const share = Math.round(Number(tokens['--disabled-opacity']) * 100);
    for (const on of [ground, surface]) {
      const muted = over(`color-mix(in srgb, var(--text) ${share}%, transparent)`, on, tokens);
      expect(contrast(muted, over('var(--text)', on, tokens))).toBeGreaterThanOrEqual(2.25);
      expect(contrast(muted, on)).toBeGreaterThanOrEqual(2);
    }
  });

  it('draws the first four group hues four different colours', () => {
    // A new group takes the first hue no group wears: blue, green, purple, orange, then on.
    const first = (['blue', 'green', 'purple', 'orange'] as const).map((hue) =>
      solid(`--group-${hue}`)
    );
    expect(new Set(first).size).toBe(first.length);
  });

  it('rings the group marks wherever one falls under 3:1 on a recessed surface', () => {
    const faint = Object.keys(tokens)
      .filter((name) => /^--group-(?!dot-ring)/.test(name))
      .filter((name) => ratio(name, recessed) < 3);
    expect(tokens['--group-dot-ring'] === 'none').toBe(faint.length === 0);
  });
});
