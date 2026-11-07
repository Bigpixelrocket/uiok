/**
 * Themes: the theme list and its root attributes, the colour arithmetic, the
 * palettes, the rules that derive every colour token from a palette, the
 * stylesheet generator an app extends with tokens of its own, and the
 * attribute helpers a page wears its themes with. The generated stylesheet
 * itself ships inside `@bigpixelrocket/uiok/styles.css`.
 */

export { subscribeThemeChange, wearThemes } from './attributes.js';
export {
  DEFAULT_DARK_THEME,
  DEFAULT_LIGHT_THEME,
  THEMES,
  themeById,
  type GroupHue,
  type TerminalPalette,
  type Theme,
  type ThemePalette
} from './catalog.js';
export {
  contrast,
  hexOf,
  luminance,
  mix,
  rgbOf,
  translucent,
  type Hex,
  type Rgb
} from './color.js';
export {
  DARK_THEME_IDS,
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  isDarkThemeId,
  isLightThemeId,
  LIGHT_THEME_IDS,
  THEME_ATTRIBUTES,
  THEME_ENTRIES,
  THEME_PREVIEW_ATTRIBUTE,
  type AppearanceThemes,
  type DarkThemeId,
  type LightThemeId,
  type ThemeAppearance,
  type ThemeEntry,
  type ThemeId
} from './ids.js';
export {
  FIXED_TOKENS,
  PREVIEW_TOKENS,
  previewTokens,
  themeStylesheet,
  themeTokens,
  type ThemeOverrides,
  type ThemeStylesheetOptions,
  type ThemeTokenName,
  type ThemeTokens
} from './tokens.js';
