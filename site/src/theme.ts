/**
 * The theme the site wears: a light theme, a dark theme, and the appearance
 * that picks between them. The light and dark themes go on the root through
 * the library's own contract (`wearThemes`), so in System appearance the
 * stylesheet alone follows the computer. Light or Dark forces one appearance
 * whatever the computer says: the stylesheet selects a theme block by
 * `prefers-color-scheme`, which a page cannot override, so the site writes
 * that theme's tokens (`themeTokens`) inline on the root instead.
 */

import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';

import {
  DEFAULT_DARK_THEME_ID,
  DEFAULT_LIGHT_THEME_ID,
  isDarkThemeId,
  isLightThemeId,
  themeById,
  themeTokens,
  wearThemes,
  type DarkThemeId,
  type LightThemeId,
  type ThemeAppearance
} from '@bigpixelrocket/uiok';

/** Which appearance the site wears: the computer's, or one forced. */
export type AppearanceChoice = 'system' | ThemeAppearance;

/** The site's theme choice, as the header's switcher sets it. */
export interface ThemeChoice {
  readonly appearance: AppearanceChoice;
  readonly light: LightThemeId;
  readonly dark: DarkThemeId;
}

const STORAGE_KEY = 'uiok-site-theme';

const DEFAULT_CHOICE: ThemeChoice = {
  appearance: 'system',
  light: DEFAULT_LIGHT_THEME_ID,
  dark: DEFAULT_DARK_THEME_ID
};

/** The saved choice, or the default when storage is empty, blocked, or holds something else. */
function savedChoice(): ThemeChoice {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (typeof raw !== 'object' || raw === null) return DEFAULT_CHOICE;
    const { appearance, light, dark } = raw as Record<string, unknown>;
    return {
      appearance:
        appearance === 'light' || appearance === 'dark' || appearance === 'system'
          ? appearance
          : DEFAULT_CHOICE.appearance,
      light: isLightThemeId(light) ? light : DEFAULT_CHOICE.light,
      dark: isDarkThemeId(dark) ? dark : DEFAULT_CHOICE.dark
    };
  } catch {
    return DEFAULT_CHOICE;
  }
}

function save(choice: ThemeChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice));
  } catch {
    // A private window or blocked storage keeps the choice for this visit only.
  }
}

const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');

/** The computer's appearance, followed live. */
function useSystemAppearance(): ThemeAppearance {
  return useSyncExternalStore(
    (listener) => {
      darkQuery.addEventListener('change', listener);
      return () => darkQuery.removeEventListener('change', listener);
    },
    () => (darkQuery.matches ? 'dark' : 'light')
  );
}

let forcedNames: readonly string[] = [];

/** Wears `choice` on the root element. */
export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement;
  wearThemes(root, { light: choice.light, dark: choice.dark });
  for (const name of forcedNames) root.style.removeProperty(name);
  forcedNames = [];
  if (choice.appearance === 'system') {
    root.style.removeProperty('color-scheme');
    return;
  }
  const tokens = themeTokens(themeById(choice[choice.appearance]));
  for (const [name, value] of Object.entries(tokens)) root.style.setProperty(name, value);
  forcedNames = Object.keys(tokens);
  root.style.setProperty('color-scheme', choice.appearance);
}

/** Wears the saved choice before the first render, so the page never flashes the default. */
export function applySavedTheme(): void {
  applyTheme(savedChoice());
}

/** The theme state the site shares: the choice, its setter, and what is worn now. */
export interface SiteTheme {
  readonly choice: ThemeChoice;
  readonly setChoice: (choice: ThemeChoice) => void;
  /** The appearance worn now, forced or the computer's. */
  readonly appearance: ThemeAppearance;
  /** The id of the theme worn now. */
  readonly worn: LightThemeId | DarkThemeId;
}

/** Holds the site's theme choice, wears it, and saves it. Call once, in the shell. */
export function useSiteTheme(): SiteTheme {
  const [choice, setChoice] = useState(savedChoice);
  const system = useSystemAppearance();
  useEffect(() => {
    applyTheme(choice);
    save(choice);
  }, [choice]);
  const appearance = choice.appearance === 'system' ? system : choice.appearance;
  return { choice, setChoice, appearance, worn: choice[appearance] };
}

/** Carries the shell's theme state to the pages that show or change it. */
export const SiteThemeContext = createContext<SiteTheme | null>(null);

/** The shell's theme state; only inside the shell. */
export function useTheme(): SiteTheme {
  const theme = useContext(SiteThemeContext);
  if (theme === null) throw new Error('useTheme needs the site shell.');
  return theme;
}
