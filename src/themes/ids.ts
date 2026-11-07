/**
 * The themes of the catalog by id: each one's name and the appearance it is
 * worn under, with no colours. A theme picker, saved settings, and any code
 * that passes a theme choice around read themes through this list; only the
 * catalog (`catalog.ts`) holds their palettes, keyed by these ids, so code can
 * name a theme without shipping or painting with its colours.
 */

/** Whether a theme is worn under the system's light or dark appearance. */
export type ThemeAppearance = 'light' | 'dark';

/**
 * The attribute on a page's root element that names the theme each
 * appearance wears; the generated stylesheet's block for that theme takes
 * over under its appearance, and the page wears the default without one.
 */
export const THEME_ATTRIBUTES: Readonly<Record<ThemeAppearance, string>> = {
  light: 'data-light-theme',
  dark: 'data-dark-theme'
};

/**
 * The attribute that has an element paint one theme's preview, whatever
 * the page wears: the generated stylesheet sets that theme's preview
 * tokens (`PREVIEW_TOKENS` in `tokens.ts`) under it, so a theme picker draws
 * each theme's miniature by naming its id alone.
 */
export const THEME_PREVIEW_ATTRIBUTE = 'data-theme-preview';

/** A theme as the list names it. */
export interface ThemeEntry {
  /** Kebab-case, unique in the list, and stable: saved settings name it. */
  readonly id: string;
  /** The display name a theme picker shows. */
  readonly name: string;
  /** The appearance the theme is worn under. */
  readonly appearance: ThemeAppearance;
}

/**
 * Every theme, light themes first, each appearance's in the order a theme
 * picker lists them.
 */
export const THEME_ENTRIES = [
  { id: 'catppuccin-latte', name: 'Catppuccin Latte', appearance: 'light' },
  { id: 'github-light', name: 'GitHub Light', appearance: 'light' },
  { id: 'gruvbox-light', name: 'Gruvbox Light', appearance: 'light' },
  { id: 'one-light', name: 'One Light', appearance: 'light' },
  { id: 'rose-pine-dawn', name: 'Rosé Pine Dawn', appearance: 'light' },
  { id: 'solarized-light', name: 'Solarized Light', appearance: 'light' },
  { id: 'tokyo-night-day', name: 'Tokyo Night Day', appearance: 'light' },
  { id: 'catppuccin-frappe', name: 'Catppuccin Frappé', appearance: 'dark' },
  { id: 'catppuccin-macchiato', name: 'Catppuccin Macchiato', appearance: 'dark' },
  { id: 'catppuccin-mocha', name: 'Catppuccin Mocha', appearance: 'dark' },
  { id: 'dracula', name: 'Dracula', appearance: 'dark' },
  { id: 'github-dark', name: 'GitHub Dark', appearance: 'dark' },
  { id: 'gruvbox-dark', name: 'Gruvbox Dark', appearance: 'dark' },
  { id: 'nord', name: 'Nord', appearance: 'dark' },
  { id: 'one-dark', name: 'One Dark', appearance: 'dark' },
  { id: 'rose-pine', name: 'Rosé Pine', appearance: 'dark' },
  { id: 'solarized-dark', name: 'Solarized Dark', appearance: 'dark' },
  { id: 'tokyo-night', name: 'Tokyo Night', appearance: 'dark' }
] as const satisfies readonly ThemeEntry[];

type Entry = (typeof THEME_ENTRIES)[number];

/** The id of any theme of the catalog. */
export type ThemeId = Entry['id'];

/** The id of a theme worn under the light appearance. */
export type LightThemeId = Extract<Entry, { readonly appearance: 'light' }>['id'];

/** The id of a theme worn under the dark appearance. */
export type DarkThemeId = Extract<Entry, { readonly appearance: 'dark' }>['id'];

/** Every light theme's id, in the list's order. */
export const LIGHT_THEME_IDS: readonly LightThemeId[] = THEME_ENTRIES.filter(
  (entry): entry is Extract<Entry, { readonly appearance: 'light' }> => entry.appearance === 'light'
).map((entry) => entry.id);

/** Every dark theme's id, in the list's order. */
export const DARK_THEME_IDS: readonly DarkThemeId[] = THEME_ENTRIES.filter(
  (entry): entry is Extract<Entry, { readonly appearance: 'dark' }> => entry.appearance === 'dark'
).map((entry) => entry.id);

/** The theme the light appearance wears until the user picks another. */
export const DEFAULT_LIGHT_THEME_ID: LightThemeId = 'catppuccin-latte';

/** The theme the dark appearance wears until the user picks another. */
export const DEFAULT_DARK_THEME_ID: DarkThemeId = 'catppuccin-mocha';

/** Whether `value` names a light theme of the catalog. */
export const isLightThemeId = (value: unknown): value is LightThemeId =>
  (LIGHT_THEME_IDS as readonly unknown[]).includes(value);

/** Whether `value` names a dark theme of the catalog. */
export const isDarkThemeId = (value: unknown): value is DarkThemeId =>
  (DARK_THEME_IDS as readonly unknown[]).includes(value);

/** The theme each appearance wears: one light theme and one dark theme. */
export interface AppearanceThemes {
  /** The theme worn while the system appearance is light. */
  readonly light: LightThemeId;
  /** The theme worn while the system appearance is dark. */
  readonly dark: DarkThemeId;
}
