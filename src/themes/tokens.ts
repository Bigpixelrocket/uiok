/**
 * The colour tokens, derived from a theme of the catalog, and the stylesheet
 * that delivers them (`themes.generated.css`, written by `themes.test.ts`).
 *
 * A token follows a rule wherever one gives the value: a palette role, a mix,
 * a choice by the theme's appearance, or the quietest tone that keeps its
 * contrast on what it sits on. A theme overrides a token only where it was
 * hand-tuned past what a rule gives (`Theme.overrides`), and a token derived
 * from an overridden one (`--on-primary` from `--primary`) is derived from
 * the override. A token other tokens read straight from the palette (the
 * panel, the text, the primary hue, the group hues) takes no override; a
 * theme sets it through its palette, or a group hue through `Theme.groups`.
 * Tokens that read the same in every theme (aliases, shadows, the disabled
 * opacity, the chart series) are fixed.
 *
 * An app that needs tokens of its own derives them from the same theme and
 * emits them through `themeStylesheet`'s options, so one stylesheet holds
 * both sets under the same selectors.
 */

import {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEMES,
  type GroupHue,
  type TerminalPalette,
  type Theme,
  type ThemePalette
} from './catalog.js';
import { contrast, luminance, mix, translucent, type Hex } from './color.js';
import { THEME_ATTRIBUTES, THEME_PREVIEW_ATTRIBUTE, type ThemeAppearance } from './ids.js';

const WHITE: Hex = '#ffffff';
const BLACK: Hex = '#000000';

/** Body text and anything read as words. */
const TEXT_CONTRAST = 4.5;
/** Marks read by shape alone: a dot, a glyph. */
const MARK_CONTRAST = 3;

/**
 * How opaque a control that cannot act right now is drawn (`--disabled-opacity`,
 * which the base stylesheet applies to every disabled control): its words,
 * icons, and fill fade together, far enough from enabled text to read as
 * unavailable at a glance in every theme, and near enough to stay legible.
 */
const DISABLED_OPACITY = 0.4;

/**
 * What a theme's appearance decides on its own, the same for every theme of
 * that appearance: how much each wash and lift shows over the grounds.
 */
const BY_APPEARANCE: Readonly<
  Record<
    ThemeAppearance,
    {
      /** The accent's share of the keyboard cursor row over `base`. */
      readonly cursorRow: number;
      /** A listing's lift off the ground: white over a light surface, the base tone over a dark one. */
      readonly rowLift: (palette: ThemePalette) => string;
      readonly glassEdge: string;
      readonly hoverWash: string;
      readonly tonalHoverBrightness: `${number}`;
      /** White's share over the panel under a listing; none in a dark theme. */
      readonly fileListLift: number;
      /** The accent's opacity under the terminal's selection. */
      readonly terminalSelection: number;
    }
  >
> = {
  light: {
    cursorRow: 10,
    rowLift: () => translucent(WHITE, 35),
    glassEdge: translucent(WHITE, 60),
    hoverWash: translucent(WHITE, 50),
    // A pale fill barely brightens, so its hover deepens a touch instead.
    tonalHoverBrightness: '0.97',
    fileListLift: 30,
    terminalSelection: 22
  },
  dark: {
    cursorRow: 14,
    rowLift: (palette) => translucent(palette.base, 50),
    glassEdge: translucent(WHITE, 10),
    hoverWash: translucent(WHITE, 6),
    tonalHoverBrightness: '1.12',
    fileListLift: 0,
    terminalSelection: 28
  }
};

/** Whether `tone` keeps `ratio` on every one of `grounds`. */
function legibleOnAll(tone: Hex, grounds: readonly Hex[], ratio: number): boolean {
  return grounds.every((ground) => contrast(tone, ground) >= ratio);
}

/**
 * The first of `candidates` that keeps `ratio` on every one of `grounds`,
 * else the last, the strongest.
 */
function firstLegible(candidates: readonly Hex[], grounds: readonly Hex[], ratio: number): Hex {
  return (
    candidates.find((tone) => legibleOnAll(tone, grounds, ratio)) ?? candidates.at(-1) ?? WHITE
  );
}

/**
 * `color` moved away from `grounds` (toward black over light grounds, white
 * over dark ones, judged by the first) a percent at a time until it keeps
 * `ratio` on every one of them.
 */
function legibleOn(color: Hex, grounds: readonly Hex[], ratio: number): Hex {
  const away = luminance(grounds[0] ?? WHITE) > 0.18 ? BLACK : WHITE;
  for (let share = 100; share > 0; share -= 1) {
    const tone = mix(color, away, share);
    if (legibleOnAll(tone, grounds, ratio)) return tone;
  }
  return away;
}

/**
 * The text colour for a fill: white or the palette's darkest neutral,
 * whichever stands out more on it.
 */
function onFill(fill: Hex, palette: ThemePalette): Hex {
  const ink = luminance(palette.text) < luminance(palette.crust) ? palette.text : palette.crust;
  return contrast(WHITE, fill) >= contrast(ink, fill) ? WHITE : ink;
}

/**
 * The value a theme may override a token with, by what the token holds: a
 * hex colour for a colour, a number or a percentage for a factor. A token
 * written as a compound value (a translucent colour, a mix, a `var()`, a
 * shadow) follows its rule in every theme and takes no override.
 */
type OverrideValue<Value> = Value extends Hex
  ? Hex
  : Value extends `${number}%`
    ? `${number}%`
    : Value extends `${number}`
      ? `${number}`
      : never;

/**
 * Every token a theme sets, as `themeTokens` gives it, before it is written
 * into the stylesheet. `overrides` replaces a token where the theme was
 * hand-tuned, and each token the rules derive from it is derived from the
 * replacement.
 */
function derivedTokens(
  palette: ThemePalette,
  terminal: TerminalPalette,
  appearance: ThemeAppearance,
  overrides: Readonly<Record<string, string | undefined>>,
  hues: Readonly<Partial<Record<GroupHue, Hex>>>
) {
  const look = BY_APPEARANCE[appearance];
  /**
   * `name`'s override where the theme has one, else what its rule gives.
   * `ThemeOverrides` holds an override to the kind of value its rule gives.
   */
  const tuned = <Value extends string>(name: string, rule: Value): Value =>
    (overrides[name] as Value | undefined) ?? rule;

  // The grounds: the window (mantle), panels (base), and the header bar (crust).
  const ground = tuned('--bg', palette.mantle);
  const panel = palette.base;
  const header = tuned('--bg-header', palette.crust);
  const surfaceFill = tuned('--cursor-bg', palette.surface0);
  // The accent: the blue, moved until the text on it keeps 4.5:1, as a
  // selected row's name sits on it.
  const accent = tuned(
    '--accent',
    legibleOn(palette.blue, [onFill(palette.blue, palette)], TEXT_CONTRAST)
  );
  // The neutral ramp from the quietest tone a word may wear to the text itself.
  const quiet: readonly Hex[] = [palette.subtext0, palette.subtext1, palette.text];
  // A recessed surface, such as a tab behind the selected one: the panel at
  // 45% over the ground. The group marks keep their ring rule against it.
  const recessed = mix(panel, ground, 45);
  // A listing's lift over the panel surface.
  const fileList = mix(WHITE, panel, look.fileListLift);
  // --text-dim sits on the ground, a panel, and the header bar.
  const textDim = tuned('--text-dim', firstLegible(quiet, [ground, panel, header], TEXT_CONTRAST));
  const rowMeta = tuned(
    '--row-meta-text',
    firstLegible([palette.overlay2, ...quiet], [fileList], TEXT_CONTRAST)
  );
  const cursorRow = tuned('--cursor-row-bg', mix(accent, panel, look.cursorRow));
  const primary = tuned(
    '--primary',
    legibleOn(palette.lavender, [onFill(palette.lavender, palette)], TEXT_CONTRAST)
  );
  // Each group hue's palette role, unless the theme draws it apart
  // (`Theme.groups`).
  const groups: Readonly<Record<GroupHue, Hex>> = {
    blue: hues.blue ?? palette.blue,
    green: hues.green ?? palette.green,
    purple: hues.purple ?? palette.mauve,
    orange: hues.orange ?? palette.peach,
    teal: hues.teal ?? palette.teal,
    pink: hues.pink ?? palette.pink,
    yellow: hues.yellow ?? palette.yellow,
    red: hues.red ?? palette.red
  };

  return {
    '--bg': ground,
    '--bg-panel': panel,
    '--bg-header': header,
    '--border': palette.surface0,
    // For outlines on surface0 fills, where --border vanishes.
    '--border-strong': palette.surface1,
    '--text': palette.text,
    // The quietest subtext that keeps 4.5:1 on the ground, a panel, and the header bar
    // (Latte's subtext0 misses it on mantle).
    '--text-dim': textDim,
    // The quietest subtext that keeps 4.5:1 on surface0 fills and on the
    // cursor row (Latte needs the text itself).
    '--text-on-surface': tuned(
      '--text-on-surface',
      firstLegible(quiet, [surfaceFill, cursorRow], TEXT_CONTRAST)
    ),
    // Selection, focus, and links.
    '--accent': accent,
    '--on-accent': tuned('--on-accent', onFill(accent, palette)),
    // The palette's lavender as is, for icons and marks drawn in the primary
    // hue; the primary fill and the tonal text derive from the same role.
    '--primary-hue': palette.lavender,
    // Primary actions wear the primary hue, moved until its text keeps
    // 4.5:1, so they stand apart from the accent that marks selection,
    // focus, and links.
    '--primary': primary,
    '--on-primary': tuned('--on-primary', onFill(primary, palette)),
    // The middle button tier (.button-tonal) for a row's routine positive
    // action such as Install: the cursor row's tint (--tonal) with text in
    // the primary hue and a hairline, a quiet step below the solid primary and
    // above the neutral outline; the hairline keeps it reading as a button,
    // not as a highlighted row, inside tables.
    '--on-tonal': tuned('--on-tonal', legibleOn(palette.lavender, [cursorRow], TEXT_CONTRAST)),
    '--tonal-border': tuned('--tonal-border', mix(accent, cursorRow, 25)),
    '--tonal-hover-brightness': tuned('--tonal-hover-brightness', look.tonalHoverBrightness),
    // Listings lift themselves off the ground, so rows read as a pane rather
    // than as the ground.
    '--row-lift': look.rowLift(palette),
    '--cursor-bg': surfaceFill,
    // The keyboard cursor row in listings: a whisper of the accent over the
    // panel, so the cursor reads apart from the surface0 hover fills.
    '--cursor-row-bg': cursorRow,
    // A listing row's attributes one tone under its name, as Finder's are, so
    // the names lead; a dialog's title strip names where it acts in the same
    // tone. The quietest tone from overlay2 up that keeps 4.5:1 on the
    // listing, which is lighter than the ground in a light theme.
    '--row-meta-text': rowMeta,
    // Glass: the specular hairline along a raised surface's top edge, and the
    // frosted wash every outlined control takes on hover.
    '--glass-edge': look.glassEdge,
    '--hover-wash': look.hoverWash,
    '--warning': tuned('--warning', palette.yellow),
    '--success': tuned('--success', palette.green),
    // Errors and destructive marks: the red, moved until it keeps 4.5:1 on a
    // panel, where error text sits.
    '--danger': tuned('--danger', legibleOn(palette.red, [panel], TEXT_CONTRAST)),

    // Eight categorical hues by plain name, for marks that tell the items of
    // a set apart (a group, a tag, a label). A group mark is never a status.
    // Where any hue falls under 3:1 on a recessed surface (Latte's yellow,
    // pink, orange, and green sit near 2:1), every mark wears a hairline of
    // the text colour, --group-dot-ring.
    '--group-blue': groups.blue,
    '--group-green': groups.green,
    '--group-purple': groups.purple,
    '--group-orange': groups.orange,
    '--group-teal': groups.teal,
    '--group-pink': groups.pink,
    '--group-yellow': groups.yellow,
    '--group-red': groups.red,
    '--group-dot-ring': Object.values(groups).some((hue) => contrast(hue, recessed) < MARK_CONTRAST)
      ? `inset 0 0 0 1px ${translucent(palette.text, 28)}`
      : 'none',

    // A terminal, which a terminal engine reads as literal colours, so each
    // is hex or rgb(): the theme's own terminal palette over its base, and
    // the accent under the selection, which is drawn over the cell colours.
    // The 256-colour cube and grey ramp derive from the 16.
    '--terminal-bg': palette.base,
    '--terminal-fg': palette.text,
    '--terminal-cursor': terminal.cursor,
    '--terminal-selection': translucent(accent, look.terminalSelection),
    ...(Object.fromEntries(
      terminal.ansi.map((color, index) => [`--terminal-ansi-${index}`, color])
    ) as Record<`--terminal-ansi-${number}`, Hex>),

    // Syntax highlighting: Shiki's Catppuccin theme maps each token colour to
    // its palette role, so a highlighter can follow these by the same names.
    '--syntax-rosewater': palette.rosewater,
    '--syntax-flamingo': palette.flamingo,
    '--syntax-pink': palette.pink,
    '--syntax-mauve': palette.mauve,
    '--syntax-red': palette.red,
    '--syntax-maroon': palette.maroon,
    '--syntax-peach': palette.peach,
    '--syntax-yellow': palette.yellow,
    '--syntax-green': palette.green,
    '--syntax-teal': palette.teal,
    '--syntax-sky': palette.sky,
    '--syntax-sapphire': palette.sapphire,
    '--syntax-blue': palette.blue,
    '--syntax-lavender': palette.lavender,
    '--syntax-subtext0': palette.subtext0,
    '--syntax-overlay2': palette.overlay2,

    // A listing's ground (.listing-root): a white lift over a light panel
    // with no second tint over the ground; nothing in a dark theme.
    '--file-list-bg': look.fileListLift > 0 ? translucent(WHITE, look.fileListLift) : 'transparent'
  };
}

/** A colour token a theme sets. */
export type ThemeTokenName = keyof ReturnType<typeof derivedTokens>;

/** Every colour token a theme sets, by name, as `themeTokens` gives them. */
export type ThemeTokens = Readonly<Record<ThemeTokenName, string>>;

/**
 * Tokens that take no override: each is a palette role other tokens are
 * derived from straight from the palette (the panel's colour under the
 * terminal and the listings' lift, the text in the quieter-text ramp and the
 * terminal, the primary hue in the primary and tonal text, the group hues in
 * their marks' ring), so an override would leave those behind. A theme
 * changes them through its palette, and a group hue through `Theme.groups`.
 */
type PaletteDrawnToken = '--bg-panel' | '--text' | '--primary-hue' | `--group-${GroupHue}`;

/**
 * The tokens a theme may override, each with the kind of value it holds: a
 * colour token takes a six-digit hex colour, a factor its number or
 * percentage. A token drawn straight from the palette (the panel, the text,
 * the primary hue, the group hues) and a compound token (a shadow, a
 * translucent colour) take none.
 */
export type ThemeOverrides = {
  readonly [
    Name in Exclude<ThemeTokenName, PaletteDrawnToken> as [
      OverrideValue<ReturnType<typeof derivedTokens>[Name]>
    ] extends [never]
      ? never
      : Name
  ]?: OverrideValue<ReturnType<typeof derivedTokens>[Name]>;
};

/** Every colour token `theme` sets, in the stylesheet's order, its overrides applied. */
export function themeTokens(theme: Theme): ThemeTokens {
  const tokens: ThemeTokens = derivedTokens(
    theme.palette,
    theme.terminal,
    theme.appearance,
    theme.overrides ?? {},
    theme.groups ?? {}
  );
  return { ...tokens, ...theme.overrides };
}

/**
 * The colour tokens every theme shares: names for the grounds by role, mixes
 * of a theme's tokens, shadows, the chart series, and the colours that hold
 * in every theme by what they sit on.
 */
export const FIXED_TOKENS: Readonly<Record<string, string>> = {
  // Surfaces: the three grounds by role. The body paints the ground once, a
  // panel paints --surface, and what sits inside a panel paints no ground of
  // its own. Surfaces that float over other content add --frost (the base
  // stylesheet) so what scrolls under them blurs.
  '--ground': 'var(--bg)',
  '--surface': 'var(--bg-panel)',
  '--surface-header': 'var(--bg-header)',
  '--tonal': 'var(--cursor-row-bg)',
  // The glass-edge hover every button shares: a frosted ring for outlined
  // controls and a lit top edge for filled ones.
  '--hover-frost': 'inset 0 1px 0 var(--glass-edge), inset 0 0 0 1px var(--border-strong)',
  '--hover-lit': `inset 0 1px 0 ${translucent(WHITE, 40)}, inset 0 -1px 0 ${translucent(BLACK, 12)}`,
  // A fill a step darker or lighter for a state laid over it: the cursor on
  // a selection and a fuzzy match's characters over it darken the accent,
  // and a primary fill lifts on hover.
  '--selection-cursor': 'color-mix(in srgb, var(--accent) 80%, black)',
  '--selection-hit': 'color-mix(in srgb, var(--accent) 70%, black)',
  '--primary-hover': 'color-mix(in srgb, var(--primary) 88%, white)',
  // A disabled control's opacity (DISABLED_OPACITY), the same in every theme.
  '--disabled-opacity': `${DISABLED_OPACITY}`,

  // Shadows by what casts them. Black in every theme, since a shadow only
  // darkens the ground it falls on.
  '--shadow-menu': `0 10px 24px ${translucent(BLACK, 18)}`,
  '--shadow-dialog': `0 24px 60px ${translucent(BLACK, 28)}, 0 2px 8px ${translucent(BLACK, 12)}`,
  '--shadow-notice': `0 6px 20px ${translucent(BLACK, 14)}`,
  '--shadow-card': `0 8px 24px ${translucent(BLACK, 25)}`,
  '--shadow-card-hover': `0 10px 28px ${translucent(BLACK, 30)}`,
  '--shadow-segment': `0 1px 2px ${translucent(BLACK, 12)}`,
  '--shadow-pressed': `inset 0 1px 2px ${translucent(BLACK, 18)}`,
  '--shadow-knob': `0 1px 1px ${translucent(BLACK, 25)}`,

  // A colour that holds in every theme by what it sits on: a switch's knob
  // is white on its track.
  '--switch-knob': WHITE,

  // The chart series colours, in the order a chart assigns them, from the
  // syntax palette.
  '--chart-1': 'var(--syntax-blue)',
  '--chart-2': 'var(--syntax-peach)',
  '--chart-3': 'var(--syntax-green)',
  '--chart-4': 'var(--syntax-mauve)',
  '--chart-5': 'var(--syntax-teal)',
  '--chart-6': 'var(--syntax-red)',
  '--chart-7': 'var(--syntax-yellow)',
  '--chart-8': 'var(--syntax-pink)'
};

/**
 * The tokens a theme's preview paints with (a theme picker's miniature
 * window per theme): its grounds, hairline, text and quieter text, accent,
 * primary, and six of its terminal colours. Each holds a literal colour in
 * every theme, so a preview scope that sets them shows that theme whatever
 * the page wears. A token that names another (`--surface` is
 * `var(--bg-panel)`) is resolved where it is declared, on the root, so a
 * preview paints with these names alone.
 */
export const PREVIEW_TOKENS = [
  '--bg',
  '--bg-panel',
  '--bg-header',
  '--border',
  '--text',
  '--text-dim',
  '--accent',
  '--primary',
  '--terminal-ansi-1',
  '--terminal-ansi-2',
  '--terminal-ansi-3',
  '--terminal-ansi-4',
  '--terminal-ansi-5',
  '--terminal-ansi-6'
] as const satisfies readonly (ThemeTokenName | `--terminal-ansi-${number}`)[];

/** The tokens `theme`'s preview scope sets: `PREVIEW_TOKENS`, as the theme sets them. */
export function previewTokens(theme: Theme): Readonly<Record<string, string>> {
  const tokens: Readonly<Record<string, string>> = themeTokens(theme);
  return Object.fromEntries(PREVIEW_TOKENS.map((name) => [name, tokens[name] ?? '']));
}

/**
 * What an app adds to the theme stylesheet: tokens of its own, derived from
 * the same themes and written under the same selectors, so it ships one
 * stylesheet rather than a second copy of every theme block. Each extra
 * token must be a custom property (`--name`) that uiok does not define. No
 * value or selector may hold a semicolon, a brace, or a comment delimiter
 * outside a string or url(), nor the banner a comment's end, since each would
 * end its declaration, rule, or comment early.
 */
export interface ThemeStylesheetOptions {
  /**
   * The comment the stylesheet opens with, without its delimiters: what
   * generated the file and how to regenerate it. Defaults to uiok's own.
   */
  readonly banner?: string;
  /**
   * Whether the stylesheet holds uiok's own tokens as well as the app's (the
   * default). An app that imports `@bigpixelrocket/uiok/styles.css`, which already carries
   * them, sets `false` to write its own tokens alone under the same
   * selectors, so no token is declared twice; a block left with nothing to
   * declare is dropped.
   */
  readonly includeUiokTokens?: boolean;
  /** Tokens that read the same in every theme, added to `:root` after `FIXED_TOKENS`. */
  readonly extraFixed?: Readonly<Record<string, string>>;
  /**
   * Tokens derived from each theme, added after uiok's own wherever a theme's
   * tokens are written: the defaults on `:root` and each theme's block.
   * `tokens` are the theme's uiok tokens with its overrides applied; the
   * theme's palette, appearance, and id are on `theme`, so an app can tune a
   * token for one theme by its id.
   */
  readonly extraTokens?: (theme: Theme, tokens: ThemeTokens) => Readonly<Record<string, string>>;
  /**
   * Rules of tokens by selector, written after the default `:root` block and
   * outside any query, such as tokens an attribute switches on the element
   * that carries it (`[data-variant='compact']`).
   */
  readonly extraBlocks?: Readonly<Record<string, Readonly<Record<string, string>>>>;
}

/** uiok's own banner: what writes `themes.generated.css` and how the attributes select a theme. */
const BANNER = [
  'Generated from the theme catalog (src/themes/) by src/themes/themes.test.ts;',
  'do not edit. Regenerate with',
  'UPDATE_THEMES=1 npx vitest run src/themes/themes.test.ts',
  '',
  ':root wears the default themes, Catppuccin Latte while light and',
  'Catppuccin Mocha while dark. A page wears other themes through the',
  'data-light-theme and data-dark-theme attributes on its root element,',
  "each selecting its theme's block below under its own appearance. An",
  "element with data-theme-preview set to a theme's id paints that theme's",
  'preview tokens whatever the page wears.'
].join('\n');

/** `tokens` as declarations, one a line at `indent`. */
function declarations(tokens: Readonly<Record<string, string>>, indent: string): string {
  return Object.entries(tokens)
    .map(([name, value]) => `${indent}${name}: ${value};`)
    .join('\n');
}

/** A rule of `tokens` under `selector`, nested `depth` levels deep. */
function rule(selector: string, tokens: Readonly<Record<string, string>>, depth = 0): string {
  const indent = '  '.repeat(depth);
  return `${indent}${selector} {\n${declarations(tokens, `${indent}  `)}\n${indent}}`;
}

/**
 * The custom properties `@bigpixelrocket/uiok/styles.css` declares or reads beside the theme
 * tokens: the base sheet's on `:root`, and the hooks a component stylesheet
 * declares or reads (the activity stripes' colour, a dialog's tone and
 * pinned top), which an app token on `:root` would otherwise reach.
 */
const BASE_TOKEN_NAMES = [
  '--frost',
  '--font-mono',
  '--font-ui',
  '--z-panel',
  '--z-dialog',
  '--z-tooltip',
  '--stripe-ink',
  '--stripe-ground',
  '--dialog-tone',
  '--dialog-icon',
  '--dialog-top',
  '--pane-columns-height',
  '--pane-path-height',
  '--pane-column-gap',
  '--pane-row-inset',
  '--pane-grid',
  '--warning-text'
] as const;

/** Every token name uiok defines: the fixed tokens, those a theme sets, and the stylesheet's own. */
const UIOK_TOKEN_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(FIXED_TOKENS),
  ...Object.keys(themeTokens(DEFAULT_LIGHT_THEME)),
  ...BASE_TOKEN_NAMES
]);

/**
 * Whether `text` holds a sequence that would end a declaration, rule, or
 * comment early. It masks what CSS reads as one token: a quoted string,
 * which honours backslash escapes and ends at a raw newline (so a quoted
 * `url("…")` may hold a `)`), an unquoted `url(…)` (a data URI's
 * `;base64`), and an escaped character outside a string (`\:` in a
 * selector). A separator, quote, lone backslash, or comment delimiter left
 * over is unsafe; a raw newline outside a string is not.
 */
function breaksOut(text: string): boolean {
  const bare = text.replace(
    /"(?:[^"\\\n\r\f]|\\[^\n\r\f])*"|'(?:[^'\\\n\r\f]|\\[^\n\r\f])*'|url\((?!\s*["'])[^)"'\\]*\)|\\[^\n\r\f]/g,
    ''
  );
  return /[;{}"'\\]|\/\*|\*\//.test(bare);
}

/**
 * `extra`, checked to add only custom properties uiok leaves undefined, each
 * with a value confined to its declaration, so an app token can never
 * silently replace a token uiok's components read.
 */
function extraTokens(
  extra: Readonly<Record<string, string>>,
  source: string
): Readonly<Record<string, string>> {
  for (const [name, value] of Object.entries(extra)) {
    if (!/^--[a-z0-9-]+$/.test(name)) {
      throw new Error(`${source} names ${name}, which is not a kebab-case custom property.`);
    }
    if (UIOK_TOKEN_NAMES.has(name)) {
      throw new Error(`${source} redefines ${name}, a token uiok defines.`);
    }
    if (breaksOut(value)) {
      throw new Error(`${source} gives ${name} a value that would end its declaration early.`);
    }
  }
  return extra;
}

/**
 * The stylesheet of every colour token: the default themes on `:root` (light
 * outside any query, dark under `prefers-color-scheme: dark`), a block per
 * theme that `data-light-theme` or `data-dark-theme` on the root element
 * selects under its appearance, and a preview scope per theme
 * (`PREVIEW_TOKENS` under `data-theme-preview`) outside any query. `:root`
 * also declares `color-scheme: light dark`, so native controls and scrollbars
 * follow the appearance the tokens follow. `options` adds an app's own
 * tokens to the same blocks, or writes those alone.
 */
export function themeStylesheet(options: ThemeStylesheetOptions = {}): string {
  const { banner = BANNER, includeUiokTokens = true, extraFixed = {}, extraBlocks = {} } = options;
  if (banner.includes('*/')) {
    throw new Error('banner holds */, which would end its comment early.');
  }
  const own = (tokens: Readonly<Record<string, string>>) => (includeUiokTokens ? tokens : {});
  const tokensOf = (theme: Theme): Readonly<Record<string, string>> => {
    const tokens = themeTokens(theme);
    const extra = options.extraTokens?.(theme, tokens) ?? {};
    return { ...own(tokens), ...extraTokens(extra, `extraTokens(${theme.id})`) };
  };
  /** A rule, or none where it would declare nothing. */
  const block = (selector: string, tokens: Readonly<Record<string, string>>, depth = 0) =>
    Object.keys(tokens).length === 0 ? [] : [rule(selector, tokens, depth)];
  /** `rules` under a media query, or nothing where there are none. */
  const media = (condition: string, rules: readonly string[]) =>
    rules.length === 0 ? [] : [`@media ${condition} {\n${rules.join('\n\n')}\n}`];
  const themed = (appearance: ThemeAppearance) =>
    THEMES.filter((theme) => theme.appearance === appearance).flatMap((theme) =>
      block(`:root[${THEME_ATTRIBUTES[appearance]}='${theme.id}']`, tokensOf(theme), 1)
    );

  return [
    `/* ${banner
      .split('\n')
      .map((line, index) => (index === 0 || line === '' ? line : `   ${line}`))
      .join('\n')} */`,
    ...block(':root', {
      ...own({ 'color-scheme': 'light dark', ...FIXED_TOKENS }),
      ...extraTokens(extraFixed, 'extraFixed'),
      ...tokensOf(DEFAULT_LIGHT_THEME)
    }),
    ...Object.entries(extraBlocks).flatMap(([selector, tokens]) => {
      if (breaksOut(selector)) {
        throw new Error(`extraBlocks['${selector}'] is a selector that would end its rule early.`);
      }
      return block(selector, extraTokens(tokens, `extraBlocks['${selector}']`));
    }),
    ...media('(prefers-color-scheme: dark)', block(':root', tokensOf(DEFAULT_DARK_THEME), 1)),
    ...media('(prefers-color-scheme: light)', themed('light')),
    ...media('(prefers-color-scheme: dark)', themed('dark')),
    ...THEMES.flatMap((theme) =>
      block(`[${THEME_PREVIEW_ATTRIBUTE}='${theme.id}']`, own(previewTokens(theme)))
    )
  ]
    .join('\n\n')
    .concat('\n');
}
