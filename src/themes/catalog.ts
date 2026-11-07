/**
 * The theme catalog: every theme a page can wear, as a palette of named
 * source colours keyed by the ids `ids.ts` lists. `tokens.ts` derives the
 * colour tokens from a palette, and `themes.test.ts` writes them into
 * `themes.generated.css`; a host process that paints a window's ground
 * before the stylesheet loads can read it from the same entries.
 *
 * Pure data with no DOM or React dependency, so a generator and a host
 * import one copy. Components name themes through `ids.ts` and paint only
 * with the tokens, never with these colours (`test/colorLiterals.test.ts`).
 */

import { mix, type Hex } from './color.js';
import {
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  THEME_ENTRIES,
  type ThemeAppearance,
  type ThemeId
} from './ids.js';
import type { ThemeOverrides } from './tokens.js';

/**
 * A theme's source colours, by Catppuccin's role names, which the syntax
 * tokens (`--syntax-*`) already carry. Another
 * family maps its colours onto the roles by what each role means here, not
 * by its own names:
 *
 * - The accents, by hue: `rosewater` and `flamingo` (pale warm pinks, a
 *   cursor and string escapes), `pink`, `mauve` (purple: keywords), `red` (errors, danger), `maroon` (a softer red),
 *   `peach` (orange: numbers), `yellow` (warnings),
 *   `green` (success, strings), `teal`, `sky` and `sapphire` (two cyans),
 *   `blue` (the accent: selection, focus, links), and `lavender` (a
 *   blue-violet: the primary hue and the primary button).
 * - The neutrals, from the foreground to the deepest ground: `text` (body
 *   text), `subtext1` and `subtext0` (secondary text, each a step quieter),
 *   `overlay2`, `overlay1`, and `overlay0` (comments, hints, and inactive
 *   marks, each quieter still), `surface2`, `surface1`, and `surface0`
 *   (strong borders, borders, and hover fills), `base` (panels), `mantle`
 *   (the window's ground), and `crust` (the header bar). In a dark theme
 *   each ground is darker than the one before it; in a light theme the
 *   header still sits a step under the ground, as `crust` does in Latte.
 */
export interface ThemePalette {
  readonly rosewater: Hex;
  readonly flamingo: Hex;
  readonly pink: Hex;
  readonly mauve: Hex;
  readonly red: Hex;
  readonly maroon: Hex;
  readonly peach: Hex;
  readonly yellow: Hex;
  readonly green: Hex;
  readonly teal: Hex;
  readonly sky: Hex;
  readonly sapphire: Hex;
  readonly blue: Hex;
  readonly lavender: Hex;
  readonly text: Hex;
  readonly subtext1: Hex;
  readonly subtext0: Hex;
  readonly overlay2: Hex;
  readonly overlay1: Hex;
  readonly overlay0: Hex;
  readonly surface2: Hex;
  readonly surface1: Hex;
  readonly surface0: Hex;
  readonly base: Hex;
  readonly mantle: Hex;
  readonly crust: Hex;
}

/**
 * A theme's terminal colours: the 16 ANSI colours (SGR 30 to 37, then 90 to
 * 97) and the cursor, as the theme's own terminal port publishes them. The
 * terminal's ground and text are the palette's `base` and `text`, and its
 * selection is the accent, so neither is listed here.
 */
export interface TerminalPalette {
  /** Exactly 16, in SGR order. */
  readonly ansi: readonly Hex[];
  /** The terminal cursor's colour. */
  readonly cursor: Hex;
}

/**
 * The eight categorical hues (`--group-<hue>`), by plain name, for marks that
 * tell items of a set apart by colour alone: a group, a tag, a label. A hue
 * names a category, never a status.
 */
export type GroupHue = 'blue' | 'green' | 'purple' | 'orange' | 'teal' | 'pink' | 'yellow' | 'red';

/** A theme's colours: what the catalog holds for an id of `ids.ts`. */
interface ThemeColours {
  /** The source colours every token is derived from. */
  readonly palette: ThemePalette;
  /** The terminal's ANSI colours and cursor. */
  readonly terminal: TerminalPalette;
  /**
   * Group hues drawn in a colour other than their palette role's, where two
   * roles share one of the theme's few hues and their marks would look
   * alike. A group mark sits beside its item's name, so it may wear a colour
   * the theme's text could not; the marks' hairline ring follows these too.
   * Every other hue wears its role (`blue` the palette's blue, `purple` its
   * mauve, `orange` its peach).
   */
  readonly groups?: Readonly<Partial<Record<GroupHue, Hex>>>;
  /**
   * Tokens hand-tuned where no rule in `tokens.ts` gives the value the theme
   * was designed with, each with the reason it is tuned. Every other token
   * follows the rules, so a new theme needs no overrides to be legible; a
   * token derived from an overridden one follows the override.
   */
  readonly overrides?: ThemeOverrides;
}

/** One theme of the catalog: its entry in `ids.ts` and its colours. */
export interface Theme extends ThemeColours {
  /** The theme's id in `ids.ts`. */
  readonly id: ThemeId;
  /** The display name a theme picker shows. */
  readonly name: string;
  /** The appearance the theme is worn under. */
  readonly appearance: ThemeAppearance;
}

/** Catppuccin Latte, the default light theme. */
const CATPPUCCIN_LATTE: ThemeColours = {
  palette: {
    rosewater: '#dc8a78',
    flamingo: '#dd7878',
    pink: '#ea76cb',
    mauve: '#8839ef',
    red: '#d20f39',
    maroon: '#e64553',
    peach: '#fe640b',
    yellow: '#df8e1d',
    green: '#40a02b',
    teal: '#179299',
    sky: '#04a5e5',
    sapphire: '#209fb5',
    blue: '#1e66f5',
    lavender: '#7287fd',
    text: '#4c4f69',
    subtext1: '#5c5f77',
    subtext0: '#6c6f85',
    overlay2: '#7c7f93',
    overlay1: '#8c8fa1',
    overlay0: '#9ca0b0',
    surface2: '#acb0be',
    surface1: '#bcc0cc',
    surface0: '#ccd0da',
    base: '#eff1f5',
    mantle: '#e6e9ef',
    crust: '#dce0e8'
  },
  terminal: {
    // Catppuccin's terminal port: subtext1, the six hues, surface2; then
    // subtext0, each hue a step brighter, and surface1.
    // prettier-ignore
    ansi: [
      '#5c5f77', '#d20f39', '#40a02b', '#df8e1d', '#1e66f5', '#ea76cb', '#179299', '#acb0be',
      '#6c6f85', '#de293e', '#49af3d', '#eea02d', '#456eff', '#fe85d8', '#2d9fa8', '#bcc0cc'
    ],
    cursor: '#dc8a78'
  },
  overrides: {
    // Lavender a step stronger than the primary hue itself, so the fill
    // carries white text at 4.7:1 where the hue stops at 3.2:1.
    '--primary': '#5468e4',
    // Indigo holds 5.1:1 on the tonal tint, where the primary itself holds
    // only 3.6:1 and lavender 2.5:1.
    '--on-tonal': '#3f51c7',
    // A blue hairline a step deeper than the tint, so the tonal button reads
    // as a button rather than as a highlighted row inside tables.
    '--tonal-border': '#b9c8ee'
  }
};

/**
 * Catppuccin Frappé, the softest of the dark flavors, from Catppuccin's
 * published palette (catppuccin/palette 1.8.0, `palette.json`).
 */
const CATPPUCCIN_FRAPPE: ThemeColours = {
  palette: {
    rosewater: '#f2d5cf',
    flamingo: '#eebebe',
    pink: '#f4b8e4',
    mauve: '#ca9ee6',
    red: '#e78284',
    maroon: '#ea999c',
    peach: '#ef9f76',
    yellow: '#e5c890',
    green: '#a6d189',
    teal: '#81c8be',
    sky: '#99d1db',
    sapphire: '#85c1dc',
    blue: '#8caaee',
    lavender: '#babbf1',
    text: '#c6d0f5',
    subtext1: '#b5bfe2',
    subtext0: '#a5adce',
    overlay2: '#949cbb',
    overlay1: '#838ba7',
    overlay0: '#737994',
    surface2: '#626880',
    surface1: '#51576d',
    surface0: '#414559',
    base: '#303446',
    mantle: '#292c3c',
    crust: '#232634'
  },
  terminal: {
    // Catppuccin's terminal port (`ansiColors`): surface1, the six hues,
    // subtext0; then surface2, each hue a step brighter, and subtext1.
    // prettier-ignore
    ansi: [
      '#51576d', '#e78284', '#a6d189', '#e5c890', '#8caaee', '#f4b8e4', '#81c8be', '#a5adce',
      '#626880', '#e67172', '#8ec772', '#d9ba73', '#7b9ef0', '#f2a4db', '#5abfb5', '#b5bfe2'
    ],
    cursor: '#f2d5cf'
  }
};

/**
 * Catppuccin Macchiato, between Frappé and Mocha, from Catppuccin's
 * published palette (catppuccin/palette 1.8.0, `palette.json`).
 */
const CATPPUCCIN_MACCHIATO: ThemeColours = {
  palette: {
    rosewater: '#f4dbd6',
    flamingo: '#f0c6c6',
    pink: '#f5bde6',
    mauve: '#c6a0f6',
    red: '#ed8796',
    maroon: '#ee99a0',
    peach: '#f5a97f',
    yellow: '#eed49f',
    green: '#a6da95',
    teal: '#8bd5ca',
    sky: '#91d7e3',
    sapphire: '#7dc4e4',
    blue: '#8aadf4',
    lavender: '#b7bdf8',
    text: '#cad3f5',
    subtext1: '#b8c0e0',
    subtext0: '#a5adcb',
    overlay2: '#939ab7',
    overlay1: '#8087a2',
    overlay0: '#6e738d',
    surface2: '#5b6078',
    surface1: '#494d64',
    surface0: '#363a4f',
    base: '#24273a',
    mantle: '#1e2030',
    crust: '#181926'
  },
  terminal: {
    // Catppuccin's terminal port (`ansiColors`): surface1, the six hues,
    // subtext0; then surface2, each hue a step brighter, and subtext1.
    // prettier-ignore
    ansi: [
      '#494d64', '#ed8796', '#a6da95', '#eed49f', '#8aadf4', '#f5bde6', '#8bd5ca', '#a5adcb',
      '#5b6078', '#ec7486', '#8ccf7f', '#e1c682', '#78a1f6', '#f2a9dd', '#63cbc0', '#b8c0e0'
    ],
    cursor: '#f4dbd6'
  }
};

/** Catppuccin Mocha, the default dark theme. */
const CATPPUCCIN_MOCHA: ThemeColours = {
  palette: {
    rosewater: '#f5e0dc',
    flamingo: '#f2cdcd',
    pink: '#f5c2e7',
    mauve: '#cba6f7',
    red: '#f38ba8',
    maroon: '#eba0ac',
    peach: '#fab387',
    yellow: '#f9e2af',
    green: '#a6e3a1',
    teal: '#94e2d5',
    sky: '#89dceb',
    sapphire: '#74c7ec',
    blue: '#89b4fa',
    lavender: '#b4befe',
    text: '#cdd6f4',
    subtext1: '#bac2de',
    subtext0: '#a6adc8',
    overlay2: '#9399b2',
    overlay1: '#7f849c',
    overlay0: '#6c7086',
    surface2: '#585b70',
    surface1: '#45475a',
    surface0: '#313244',
    base: '#1e1e2e',
    mantle: '#181825',
    crust: '#11111b'
  },
  terminal: {
    // Catppuccin's terminal port: surface1, the six hues, subtext0; then
    // surface2, each hue a step brighter, and subtext1.
    // prettier-ignore
    ansi: [
      '#45475a', '#f38ba8', '#a6e3a1', '#f9e2af', '#89b4fa', '#f5c2e7', '#94e2d5', '#a6adc8',
      '#585b70', '#f37799', '#89d88b', '#ebd391', '#74a8fc', '#f2aede', '#6bd7ca', '#bac2de'
    ],
    cursor: '#f5e0dc'
  },
  overrides: {
    // Lavender saturated a step past the primary hue, so a primary button
    // stands apart from marks drawn in that hue beside it.
    '--primary': '#9aa5ff',
    // A blue hairline a step lighter than the tint, so the tonal button reads
    // as a button rather than as a highlighted row inside tables.
    '--tonal-border': '#45507a'
  }
};

/** Black, the far end of a dark theme's grounds and of a darkened tone. */
const BLACK: Hex = '#000000';

/**
 * A dark theme's window ground and header bar where the theme publishes no
 * ground darker than its panels: the panel's colour darkened by Mocha's own
 * steps (mantle about 80% of base, crust about 58%), so every dark theme's
 * grounds step down alike.
 */
const darkerGrounds = (base: Hex): { readonly mantle: Hex; readonly crust: Hex } => ({
  mantle: mix(base, BLACK, 80),
  crust: mix(base, BLACK, 58)
});

/**
 * GitHub Light, from Primer's published colours (@primer/primitives 7.17.1,
 * `dist/json/colors/light.json`): the canvas, its grey scale, and the
 * accent, success, attention, severe, danger, done, and sponsors colours;
 * the terminal is Primer's own `ansi` set.
 */
const GITHUB_LIGHT: ThemeColours = {
  palette: {
    rosewater: '#fd8c73', // coral.3, the active tab's top border
    flamingo: '#e85aad', // pink.4
    pink: '#bf3989', // sponsors
    mauve: '#8250df', // done
    red: '#cf222e', // danger
    maroon: '#fa4549', // red.4
    peach: '#bc4c00', // severe
    yellow: '#9a6700', // attention
    green: '#1a7f37', // success
    teal: '#1b7c83', // ansi cyan
    sky: '#3192aa', // ansi bright cyan
    sapphire: '#218bff', // blue.4
    blue: '#0969da', // accent
    lavender: '#54aeff', // blue.3, the colour of a folder in a repository's file list
    text: '#1f2328', // fg.default
    subtext1: '#424a53', // gray.7
    subtext0: '#57606a', // gray.6
    overlay2: '#656d76', // fg.muted
    overlay1: '#6e7781', // gray.5
    overlay0: '#8c959f', // gray.4
    surface2: '#afb8c1', // gray.3
    // Primer has no grey between gray.2 and gray.3; mixed halfway.
    surface1: mix('#d0d7de', '#afb8c1', 50),
    surface0: '#d0d7de', // border.default
    base: '#ffffff', // canvas.default
    mantle: '#f6f8fa', // canvas.subtle
    crust: '#eaeef2' // gray.1
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#24292f', '#cf222e', '#116329', '#4d2d00', '#0969da', '#8250df', '#1b7c83', '#6e7781',
      '#57606a', '#a40e26', '#1a7f37', '#633c01', '#218bff', '#a475f9', '#3192aa', '#8c959f'
    ],
    cursor: '#0969da'
  },
  overrides: {
    // GitHub's own primary button, green with white text (4.5:1), rather
    // than a darkened light blue that would read as the accent.
    '--primary': '#1f883d'
  }
};

/**
 * GitHub Dark, from Primer's published colours (@primer/primitives 7.17.1,
 * `dist/json/colors/dark.json`, GitHub's dark default); the terminal is
 * Primer's own `ansi` set.
 */
const GITHUB_DARK: ThemeColours = {
  palette: {
    rosewater: '#ffa28b', // coral.2
    flamingo: '#ff9bce', // pink.2
    pink: '#f778ba', // pink.3
    mauve: '#bc8cff', // purple.3, ansi magenta
    red: '#ff7b72', // red.3, ansi red
    maroon: '#ffa198', // red.2
    peach: '#ffa657', // orange.2
    yellow: '#d29922', // attention.fg
    green: '#3fb950', // success.fg
    teal: '#39c5cf', // ansi cyan
    sky: '#56d4dd', // ansi bright cyan
    sapphire: '#79c0ff', // blue.2
    blue: '#58a6ff', // blue.3
    lavender: '#a5d6ff', // blue.1
    text: '#e6edf3', // fg.default
    subtext1: '#c9d1d9', // gray.1
    subtext0: '#b1bac4', // gray.2
    overlay2: '#8b949e', // gray.3
    overlay1: '#848d97', // fg.muted
    overlay0: '#6e7681', // gray.4
    surface2: '#484f58', // gray.5
    // Primer has no grey between gray.5 and gray.6; mixed halfway.
    surface1: mix('#484f58', '#30363d', 50),
    surface0: '#30363d', // border.default
    base: '#0d1117', // canvas.default
    // Between the canvas and the inset ground GitHub's header wears.
    mantle: mix('#0d1117', '#010409', 50),
    crust: '#010409' // canvas.inset
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#484f58', '#ff7b72', '#3fb950', '#d29922', '#58a6ff', '#bc8cff', '#39c5cf', '#b1bac4',
      '#6e7681', '#ffa198', '#56d364', '#e3b341', '#79c0ff', '#d2a8ff', '#56d4dd', '#ffffff'
    ],
    cursor: '#2f81f7'
  },
  overrides: {
    // GitHub's own selection and focus blue (accent.emphasis), which carries
    // white text at 4.6:1, rather than the lighter link blue the rule keeps.
    '--accent': '#1f6feb',
    // GitHub's own primary button, green with white text (4.6:1).
    '--primary': '#238636'
  }
};

/** Solarized's sixteen colours, from Ethan Schoonover's README (altercation/solarized). */
const SOLARIZED = {
  base03: '#002b36',
  base02: '#073642',
  base01: '#586e75',
  base00: '#657b83',
  base0: '#839496',
  base1: '#93a1a1',
  base2: '#eee8d5',
  base3: '#fdf6e3',
  yellow: '#b58900',
  orange: '#cb4b16',
  red: '#dc322f',
  magenta: '#d33682',
  violet: '#6c71c4',
  blue: '#268bd2',
  cyan: '#2aa198',
  green: '#859900'
} as const satisfies Record<string, Hex>;

/**
 * Solarized's terminal port (the README's table): base02, the six accents,
 * base2; then base03, orange, base01, base00, base0, violet, base1, base3.
 * Both appearances share it.
 */
// prettier-ignore
const SOLARIZED_ANSI: readonly Hex[] = [
  SOLARIZED.base02, SOLARIZED.red, SOLARIZED.green, SOLARIZED.yellow,
  SOLARIZED.blue, SOLARIZED.magenta, SOLARIZED.cyan, SOLARIZED.base2,
  SOLARIZED.base03, SOLARIZED.orange, SOLARIZED.base01, SOLARIZED.base00,
  SOLARIZED.base0, SOLARIZED.violet, SOLARIZED.base1, SOLARIZED.base3
];

/**
 * Solarized's accents by role. Solarized has no pink, maroon, pale pink, or
 * second cyan, so the nearest accent stands in.
 */
const SOLARIZED_ACCENTS = {
  rosewater: SOLARIZED.orange,
  flamingo: SOLARIZED.magenta,
  pink: SOLARIZED.magenta,
  mauve: SOLARIZED.violet,
  red: SOLARIZED.red,
  maroon: SOLARIZED.magenta,
  peach: SOLARIZED.orange,
  yellow: SOLARIZED.yellow,
  green: SOLARIZED.green,
  teal: SOLARIZED.cyan,
  sky: SOLARIZED.cyan,
  sapphire: SOLARIZED.cyan,
  blue: SOLARIZED.blue,
  lavender: SOLARIZED.violet
} as const;

/**
 * Solarized Light: base3 panels on a base2 ground. Solarized has six
 * content tones where the ramp needs nine, so the steps between are mixed;
 * its emphasized text (base01) holds only 3.9:1 on the header, so the text
 * is base01 moved 21% toward base02, the least that holds 4.5:1 there and
 * on a hover fill. base01 and base00 follow as the quieter tones, but only a
 * row's attributes, on the lighter file list, keep 4.5:1 in base01, so the
 * quieter text on the ground and the header wears the text's own tone.
 */
const SOLARIZED_LIGHT: ThemeColours = {
  palette: {
    ...SOLARIZED_ACCENTS,
    text: mix(SOLARIZED.base01, SOLARIZED.base02, 79),
    subtext1: SOLARIZED.base01,
    subtext0: SOLARIZED.base00,
    overlay2: mix(SOLARIZED.base00, SOLARIZED.base0, 50),
    overlay1: SOLARIZED.base0,
    overlay0: SOLARIZED.base1,
    surface2: mix(SOLARIZED.base1, SOLARIZED.base2, 55),
    surface1: mix(SOLARIZED.base1, SOLARIZED.base2, 35),
    surface0: mix(SOLARIZED.base1, SOLARIZED.base2, 22),
    base: SOLARIZED.base3,
    mantle: SOLARIZED.base2,
    crust: mix(SOLARIZED.base2, SOLARIZED.base1, 85)
  },
  terminal: { ansi: SOLARIZED_ANSI, cursor: SOLARIZED.base01 }
};

/**
 * Solarized Dark: base03 panels, with the grounds under them darkened from
 * base03 (Solarized has none darker), base1 as the text and base0 as the
 * quieter text, and the steps between base01 and base02 mixed.
 */
const SOLARIZED_DARK: ThemeColours = {
  palette: {
    ...SOLARIZED_ACCENTS,
    text: SOLARIZED.base1,
    subtext1: mix(SOLARIZED.base1, SOLARIZED.base0, 50),
    subtext0: SOLARIZED.base0,
    overlay2: mix(SOLARIZED.base0, SOLARIZED.base01, 60),
    overlay1: SOLARIZED.base01,
    overlay0: mix(SOLARIZED.base01, SOLARIZED.base02, 70),
    surface2: mix(SOLARIZED.base01, SOLARIZED.base02, 45),
    surface1: mix(SOLARIZED.base01, SOLARIZED.base02, 22),
    surface0: SOLARIZED.base02,
    base: SOLARIZED.base03,
    ...darkerGrounds(SOLARIZED.base03)
  },
  terminal: { ansi: SOLARIZED_ANSI, cursor: SOLARIZED.base1 }
};

/**
 * One Light, from Atom's one-light-syntax (`styles/colors.less`: its mono
 * tones, hues, and accent) and one-light-ui (the sidebar a step under the
 * editor). Its oranges are the pair Atom shipped first (hue 41), which the
 * VS Code port and Shiki still draw, rather than Atom's later hue 35 pair
 * (`#b76b01`, `#cb7701`). The steps between Atom's three mono tones are
 * mixed. Atom publishes no terminal port, so the terminal follows
 * onedark.vim's slots (joshdick/onedark.vim) with One Light's colours.
 */
const ONE_LIGHT: ThemeColours = {
  palette: {
    rosewater: '#e45649', // red 1
    flamingo: '#ca1243', // red 2
    pink: '#a626a4', // purple
    mauve: '#a626a4',
    red: '#e45649',
    maroon: '#ca1243',
    peach: '#986801', // orange 1
    yellow: '#c18401', // orange 2
    green: '#50a14f',
    teal: '#0184bc', // cyan
    sky: '#0184bc',
    sapphire: '#0184bc',
    blue: '#4078f2',
    lavender: '#526fff', // the syntax accent: cursor, focus, and buttons
    text: '#383a42', // mono 1
    subtext1: mix('#383a42', '#696c77', 67),
    subtext0: mix('#383a42', '#696c77', 33),
    overlay2: '#696c77', // mono 2
    overlay1: mix('#696c77', '#a0a1a7', 50),
    overlay0: '#a0a1a7', // mono 3
    surface2: mix('#a0a1a7', '#fafafa', 70),
    surface1: mix('#a0a1a7', '#fafafa', 50),
    surface0: mix('#a0a1a7', '#fafafa', 34),
    base: '#fafafa', // the editor
    mantle: '#eaeaeb', // the sidebar
    crust: '#dbdbdc' // the UI border, a step under the sidebar
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#383a42', '#e45649', '#50a14f', '#c18401', '#4078f2', '#a626a4', '#0184bc', '#a0a1a7',
      '#696c77', '#ca1243', '#50a14f', '#986801', '#4078f2', '#a626a4', '#0184bc', '#fafafa'
    ],
    cursor: '#526fff'
  }
};

/**
 * One Dark, from Atom's one-dark-syntax (`styles/colors.less`) and
 * one-dark-ui (the sidebar a step under the editor), with onedark.vim's
 * greys (joshdick/onedark.vim) for the borders. The steps between Atom's
 * three mono tones are mixed. Atom publishes no terminal port, so the
 * terminal is onedark.vim's.
 */
const ONE_DARK: ThemeColours = {
  palette: {
    rosewater: '#e06c75', // red 1
    flamingo: '#be5046', // red 2
    pink: '#c678dd', // purple
    mauve: '#c678dd',
    red: '#e06c75',
    maroon: '#be5046',
    peach: '#d19a66', // orange 1
    yellow: '#e5c07b', // orange 2
    green: '#98c379',
    teal: '#56b6c2', // cyan
    sky: '#56b6c2',
    sapphire: '#56b6c2',
    blue: '#61afef',
    lavender: '#528bff', // the syntax accent: cursor and focus
    text: '#abb2bf', // mono 1
    subtext1: mix('#abb2bf', '#828997', 67),
    subtext0: mix('#abb2bf', '#828997', 33),
    overlay2: '#828997', // mono 2
    overlay1: mix('#828997', '#5c6370', 50),
    overlay0: '#5c6370', // mono 3
    surface2: '#4b5263', // onedark.vim gutter grey
    surface1: mix('#4b5263', '#3e4452', 50),
    surface0: '#3e4452', // onedark.vim visual grey
    base: '#282c34', // the editor
    mantle: '#21252b', // the sidebar
    // Atom has no ground under the sidebar; darkened a step from it.
    crust: mix('#21252b', BLACK, 85)
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#282c34', '#e06c75', '#98c379', '#e5c07b', '#61afef', '#c678dd', '#56b6c2', '#abb2bf',
      '#3e4452', '#be5046', '#98c379', '#d19a66', '#61afef', '#c678dd', '#56b6c2', '#5c6370'
    ],
    cursor: '#528bff'
  }
};

/**
 * Gruvbox Light, medium contrast, from Pavel Pertsev's palette
 * (morhetz/gruvbox, `colors/gruvbox.vim`): the light grounds and dark
 * foregrounds, with the faded accents gruvbox draws on a light ground.
 */
const GRUVBOX_LIGHT: ThemeColours = {
  palette: {
    rosewater: '#d65d0e', // neutral orange
    flamingo: '#b16286', // neutral purple
    pink: '#b16286',
    mauve: '#8f3f71', // faded purple
    red: '#9d0006', // faded red
    maroon: '#cc241d', // neutral red
    peach: '#af3a03', // faded orange
    yellow: '#b57614', // faded yellow
    green: '#79740e', // faded green
    teal: '#427b58', // faded aqua
    sky: '#689d6a', // neutral aqua
    sapphire: '#458588', // neutral blue
    blue: '#076678', // faded blue
    lavender: '#458588',
    text: '#3c3836', // dark1, the foreground
    subtext1: mix('#3c3836', '#504945', 50),
    subtext0: '#504945', // dark2
    overlay2: '#665c54', // dark3
    overlay1: '#7c6f64', // dark4
    overlay0: '#928374', // gray
    surface2: '#a89984', // light4
    surface1: '#bdae93', // light3
    surface0: '#d5c4a1', // light2
    base: '#fbf1c7', // light0
    mantle: '#f2e5bc', // light0_soft
    crust: '#ebdbb2' // light1
  },
  terminal: {
    // gruvbox's terminal port: light0, the neutral accents, dark4; then
    // gray, the faded accents, and dark1.
    // prettier-ignore
    ansi: [
      '#fbf1c7', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#7c6f64',
      '#928374', '#9d0006', '#79740e', '#b57614', '#076678', '#8f3f71', '#427b58', '#3c3836'
    ],
    cursor: '#3c3836'
  },
  overrides: {
    // gruvbox marks selection and the active tab in aqua, not blue.
    '--accent': '#427b58'
  }
};

/**
 * Gruvbox Dark, medium contrast, from Pavel Pertsev's palette
 * (morhetz/gruvbox, `colors/gruvbox.vim`): the dark grounds and light
 * foregrounds, with the bright accents gruvbox draws on a dark ground. The
 * window's ground is mixed halfway to dark0_hard, which the header wears.
 */
const GRUVBOX_DARK: ThemeColours = {
  palette: {
    rosewater: '#fe8019', // bright orange
    flamingo: '#d3869b', // bright purple
    pink: '#d3869b',
    mauve: '#d3869b',
    red: '#fb4934', // bright red
    maroon: '#cc241d', // neutral red
    peach: '#fe8019',
    yellow: '#fabd2f', // bright yellow
    green: '#b8bb26', // bright green
    teal: '#8ec07c', // bright aqua
    sky: '#83a598', // bright blue
    sapphire: '#458588', // neutral blue
    blue: '#83a598',
    lavender: '#83a598',
    text: '#ebdbb2', // light1, the foreground
    subtext1: '#d5c4a1', // light2
    subtext0: '#bdae93', // light3
    overlay2: '#a89984', // light4
    overlay1: '#928374', // gray
    overlay0: '#7c6f64', // dark4
    surface2: '#665c54', // dark3
    surface1: '#504945', // dark2
    surface0: '#3c3836', // dark1
    base: '#282828', // dark0
    mantle: mix('#282828', '#1d2021', 50),
    crust: '#1d2021' // dark0_hard
  },
  terminal: {
    // gruvbox's terminal port: dark0, the neutral accents, light4; then
    // gray, the bright accents, and light1.
    // prettier-ignore
    ansi: [
      '#282828', '#cc241d', '#98971a', '#d79921', '#458588', '#b16286', '#689d6a', '#a89984',
      '#928374', '#fb4934', '#b8bb26', '#fabd2f', '#83a598', '#d3869b', '#8ec07c', '#ebdbb2'
    ],
    cursor: '#ebdbb2'
  },
  overrides: {
    // gruvbox marks selection and the active tab in aqua, not blue: the
    // neutral aqua its editor ports use, quieter than the bright one.
    '--accent': '#689d6a'
  }
};

/**
 * Tokyo Night Day, from folke/tokyonight.nvim's day palette
 * (`extras/lua/tokyonight_day.lua`) and its Ghostty port
 * (`extras/ghostty/tokyonight_day`). Its blue foreground holds only 4.0:1
 * on the sidebar ground the header wears, so the text is that blue moved 16%
 * toward black, the least that holds 4.5:1 there, on a hover fill, and on
 * the status tints, and the quieter text is fg_dark moved 21%, the least
 * that holds 4.5:1 on the header; dark5, comment, and dark3 follow as hints.
 */
const TOKYO_NIGHT_DAY: ThemeColours = {
  palette: {
    rosewater: '#c64343', // red1
    flamingo: '#d20065', // magenta2
    pink: '#d20065',
    mauve: '#9854f1', // magenta
    red: '#f52a65',
    maroon: '#c64343',
    peach: '#b15c00', // orange
    yellow: '#8c6c3e',
    green: '#587539',
    teal: '#118c74',
    sky: '#007197', // cyan
    sapphire: '#07879d', // blue2
    blue: '#2e7de9',
    lavender: '#7890dd', // blue0
    text: mix('#3760bf', BLACK, 84),
    subtext1: mix('#6172b0', BLACK, 79),
    subtext0: '#6172b0', // fg_dark
    overlay2: '#68709a', // dark5
    overlay1: '#848cb5', // comment
    overlay0: '#8990b3', // dark3
    surface2: '#a1a6c5', // terminal_black
    surface1: '#a8aecb', // fg_gutter
    surface0: '#c4c8da', // bg_highlight
    base: '#e1e2e7', // bg
    mantle: mix('#e1e2e7', '#d0d5e3', 50),
    crust: '#d0d5e3' // bg_dark, the sidebar
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#b4b5b9', '#f52a65', '#587539', '#8c6c3e', '#2e7de9', '#9854f1', '#007197', '#6172b0',
      '#a1a6c5', '#ff4774', '#5c8524', '#a27629', '#358aff', '#a463ff', '#007ea8', '#3760bf'
    ],
    cursor: '#3760bf'
  }
};

/**
 * Tokyo Night, from folke/tokyonight.nvim's night palette
 * (`extras/lua/tokyonight_night.lua`, the colours of enkia's original
 * theme) and its Ghostty port (`extras/ghostty/tokyonight_night`). dark5
 * holds only 4.1:1 on the editor, so the quieter text is mixed halfway
 * from it to fg_dark.
 */
const TOKYO_NIGHT: ThemeColours = {
  palette: {
    rosewater: '#c0caf5', // fg, the cursor
    flamingo: '#ff007c', // magenta2
    pink: '#ff007c',
    mauve: '#bb9af7', // magenta
    red: '#f7768e',
    maroon: '#db4b4b', // red1
    peach: '#ff9e64', // orange
    yellow: '#e0af68',
    green: '#9ece6a',
    teal: '#73daca', // green1
    sky: '#7dcfff', // cyan
    sapphire: '#2ac3de', // blue1
    blue: '#7aa2f7',
    lavender: '#9d7cd8', // purple
    text: '#c0caf5', // fg
    subtext1: '#a9b1d6', // fg_dark
    subtext0: mix('#a9b1d6', '#737aa2', 50),
    overlay2: '#737aa2', // dark5
    overlay1: '#565f89', // comment
    overlay0: '#545c7e', // dark3
    surface2: '#414868', // terminal_black
    surface1: '#3b4261', // fg_gutter
    surface0: '#292e42', // bg_highlight
    base: '#1a1b26', // bg
    mantle: '#16161e', // bg_dark, the sidebar
    crust: '#0c0e14' // bg_dark1
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#15161e', '#f7768e', '#9ece6a', '#e0af68', '#7aa2f7', '#bb9af7', '#7dcfff', '#a9b1d6',
      '#414868', '#ff899d', '#9fe044', '#faba4a', '#8db0ff', '#c7a9ff', '#a4daff', '#c0caf5'
    ],
    cursor: '#c0caf5'
  }
};

/**
 * Rosé Pine Dawn, from Rosé Pine's published palette (rose-pine/palette,
 * `palette.json`, whose dawn text the ports and Shiki still draw as
 * `#575279`) and its Alacritty port (rose-pine/alacritty,
 * `dist/rose-pine-dawn.toml`). Its panels are the base, on the overlay as
 * the ground; the steps between its muted, subtle, and text tones are
 * mixed. Rosé Pine has no orange, green, or blue but pine and foam, so gold,
 * pine, and foam stand in by hue.
 */
const ROSE_PINE_DAWN: ThemeColours = {
  palette: {
    rosewater: '#d7827e', // rose
    flamingo: '#d7827e',
    pink: '#d7827e',
    mauve: '#907aa9', // iris
    red: '#b4637a', // love
    maroon: '#b4637a',
    peach: '#ea9d34', // gold
    yellow: '#ea9d34',
    green: '#286983', // pine
    teal: '#56949f', // foam
    sky: '#56949f',
    sapphire: '#56949f',
    blue: '#286983',
    lavender: '#907aa9',
    text: '#575279',
    subtext1: mix('#575279', '#797593', 60),
    subtext0: mix('#575279', '#797593', 25),
    overlay2: '#797593', // subtle
    overlay1: mix('#797593', '#9893a5', 50),
    overlay0: '#9893a5', // muted
    surface2: '#cecacd', // highlight high
    surface1: mix('#cecacd', '#dfdad9', 50),
    surface0: '#dfdad9', // highlight med
    base: '#faf4ed', // base
    mantle: '#f2e9e1', // overlay
    crust: mix('#f2e9e1', '#dfdad9', 50)
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#f2e9e1', '#b4637a', '#286983', '#ea9d34', '#56949f', '#907aa9', '#d7827e', '#575279',
      '#9893a5', '#b4637a', '#286983', '#ea9d34', '#56949f', '#907aa9', '#d7827e', '#575279'
    ],
    cursor: '#cecacd'
  },
  // Pine stands in for both blue and green, so a group's blue dot wears
  // foam, as the terminal port's blue does, apart from the green one.
  groups: { blue: '#56949f' }
};

/**
 * Rosé Pine, from Rosé Pine's published palette (rose-pine/palette,
 * `palette.json`) and its Alacritty port (rose-pine/alacritty,
 * `dist/rose-pine.toml`). Its panels are the base, with the grounds under
 * them darkened from it (Rosé Pine has none darker); the steps between its
 * muted, subtle, and text tones are mixed. Rosé Pine has no orange, green,
 * or blue, so gold and foam stand in by hue; pine holds only 3.3:1 on the
 * base, too faint for strings and file names, so it stays in the terminal.
 */
const ROSE_PINE: ThemeColours = {
  palette: {
    rosewater: '#ebbcba', // rose
    flamingo: '#ebbcba',
    pink: '#ebbcba',
    mauve: '#c4a7e7', // iris
    red: '#eb6f92', // love
    maroon: '#eb6f92',
    peach: '#f6c177', // gold
    yellow: '#f6c177',
    green: '#9ccfd8', // foam
    teal: '#9ccfd8',
    sky: '#9ccfd8',
    sapphire: '#9ccfd8',
    blue: '#9ccfd8',
    lavender: '#c4a7e7',
    text: '#e0def4',
    subtext1: mix('#e0def4', '#908caa', 50),
    subtext0: '#908caa', // subtle
    overlay2: mix('#908caa', '#6e6a86', 50),
    overlay1: '#6e6a86', // muted
    overlay0: mix('#6e6a86', '#524f67', 50),
    surface2: '#524f67', // highlight high
    surface1: '#403d52', // highlight med
    surface0: '#26233a', // overlay
    base: '#191724', // base
    ...darkerGrounds('#191724')
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#26233a', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4',
      '#6e6a86', '#eb6f92', '#31748f', '#f6c177', '#9ccfd8', '#c4a7e7', '#ebbcba', '#e0def4'
    ],
    cursor: '#524f67'
  },
  // Foam stands in for both blue and green, so a group's green dot wears
  // pine, as the terminal port's green does, apart from the blue one.
  groups: { green: '#31748f' },
  overrides: {
    // Rosé Pine marks links and selection in iris and fills its buttons
    // with rose.
    '--accent': '#c4a7e7',
    '--primary': '#ebbcba'
  }
};

/**
 * Nord, from Arctic Ice Studio's palette (nord0 to nord15) and its
 * Alacritty port (nordtheme/alacritty, `src/nord.yaml`). The grounds under
 * the polar night panels are darkened from nord0 (Nord has none darker),
 * and the steps between nord4 and the comment grey Nord's editor ports use
 * (`#616e88`) are mixed.
 */
const NORD: ThemeColours = {
  palette: {
    rosewater: '#d08770', // nord12
    flamingo: '#b48ead', // nord15
    pink: '#b48ead',
    mauve: '#b48ead',
    red: '#bf616a', // nord11
    maroon: '#bf616a',
    peach: '#d08770', // nord12
    yellow: '#ebcb8b', // nord13
    green: '#a3be8c', // nord14
    teal: '#8fbcbb', // nord7
    sky: '#88c0d0', // nord8
    sapphire: '#81a1c1', // nord9
    blue: '#88c0d0', // nord8, Nord's accent
    lavender: '#81a1c1', // nord9
    text: '#d8dee9', // nord4
    subtext1: mix('#d8dee9', '#616e88', 82),
    subtext0: mix('#d8dee9', '#616e88', 64),
    overlay2: mix('#d8dee9', '#616e88', 44),
    overlay1: mix('#d8dee9', '#616e88', 22),
    overlay0: '#616e88',
    surface2: '#4c566a', // nord3
    surface1: '#434c5e', // nord2
    surface0: '#3b4252', // nord1
    base: '#2e3440', // nord0
    ...darkerGrounds('#2e3440')
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#3b4252', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#88c0d0', '#e5e9f0',
      '#4c566a', '#bf616a', '#a3be8c', '#ebcb8b', '#81a1c1', '#b48ead', '#8fbcbb', '#eceff4'
    ],
    cursor: '#d8dee9'
  }
};

/**
 * Dracula, from its specification (spec.draculatheme.com: the colours and
 * the background shades) and its Alacritty port (dracula/alacritty). Dracula
 * has no blue, so purple, its accent, takes the blue roles as its terminal
 * port does, and pink takes the keywords' purple; the steps between the
 * comment colour and the foreground are mixed.
 */
const DRACULA: ThemeColours = {
  palette: {
    rosewater: '#ffb86c', // orange
    flamingo: '#ff79c6', // pink
    pink: '#ff79c6',
    mauve: '#ff79c6',
    red: '#ff5555',
    maroon: '#ff6e6e', // bright red
    peach: '#ffb86c',
    yellow: '#f1fa8c',
    green: '#50fa7b',
    teal: '#8be9fd', // cyan
    sky: '#8be9fd',
    sapphire: '#8be9fd',
    blue: '#bd93f9', // purple
    lavender: '#bd93f9',
    text: '#f8f8f2', // foreground
    subtext1: mix('#f8f8f2', '#6272a4', 80),
    subtext0: mix('#f8f8f2', '#6272a4', 60),
    overlay2: mix('#f8f8f2', '#6272a4', 30),
    overlay1: '#6272a4', // comment
    overlay0: mix('#6272a4', '#44475a', 50),
    surface2: '#44475a', // current line
    surface1: '#424450', // background lighter
    surface0: '#343746', // background light
    base: '#282a36', // background
    mantle: '#21222c', // background dark
    crust: '#191a21' // background darker
  },
  terminal: {
    // prettier-ignore
    ansi: [
      '#21222c', '#ff5555', '#50fa7b', '#f1fa8c', '#bd93f9', '#ff79c6', '#8be9fd', '#f8f8f2',
      '#6272a4', '#ff6e6e', '#69ff94', '#ffffa5', '#d6acff', '#ff92df', '#a4ffff', '#ffffff'
    ],
    cursor: '#f8f8f2'
  },
  overrides: {
    // Dracula's pink fills the primary button, so it stands apart from
    // the purple that marks selection and focus.
    '--primary': '#ff79c6'
  }
};

/** Each theme's colours by its id; a theme `ids.ts` lists without colours fails to compile. */
const COLOURS: Readonly<Record<ThemeId, ThemeColours>> = {
  'catppuccin-latte': CATPPUCCIN_LATTE,
  'catppuccin-frappe': CATPPUCCIN_FRAPPE,
  'catppuccin-macchiato': CATPPUCCIN_MACCHIATO,
  'catppuccin-mocha': CATPPUCCIN_MOCHA,
  'github-light': GITHUB_LIGHT,
  'github-dark': GITHUB_DARK,
  'gruvbox-light': GRUVBOX_LIGHT,
  'gruvbox-dark': GRUVBOX_DARK,
  'one-light': ONE_LIGHT,
  'one-dark': ONE_DARK,
  'rose-pine-dawn': ROSE_PINE_DAWN,
  'rose-pine': ROSE_PINE,
  'solarized-light': SOLARIZED_LIGHT,
  'solarized-dark': SOLARIZED_DARK,
  'tokyo-night-day': TOKYO_NIGHT_DAY,
  'tokyo-night': TOKYO_NIGHT,
  nord: NORD,
  dracula: DRACULA
};

/**
 * Every theme, in the order `ids.ts` lists them (light themes first, the
 * order a theme picker lists them in).
 */
export const THEMES: readonly Theme[] = THEME_ENTRIES.map((entry) => ({
  ...entry,
  ...COLOURS[entry.id]
}));

/** The theme of the catalog with `id`. */
export function themeById(id: ThemeId): Theme {
  const theme = THEMES.find((candidate) => candidate.id === id);
  if (theme === undefined) throw new Error(`No theme ${id} in the catalog.`);
  return theme;
}

/** The theme a light appearance wears until the user picks another. */
export const DEFAULT_LIGHT_THEME: Theme = themeById(DEFAULT_LIGHT_THEME_ID);

/** The theme a dark appearance wears until the user picks another. */
export const DEFAULT_DARK_THEME: Theme = themeById(DEFAULT_DARK_THEME_ID);
