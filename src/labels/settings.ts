/**
 * The words the Settings dialog and its shared pages repeat in every app:
 * the dialog's title and its one verb, the sidebar's name, and the
 * Appearance page's choices, notes, and bands (`SettingsDialog`,
 * `AppearanceSettings`). A page's title and its own rows are the app's.
 */

/** Which appearance the windows wear: the system's, or one of the two always. */
export type AppearanceMode = 'system' | 'light' | 'dark';

/** The Appearance page's words (`AppearanceSettings`). */
export interface AppearanceLabels {
  /** The subsection's name: "Theme". */
  readonly title: string;
  /** The appearance choice's label: "Appearance". */
  readonly mode: string;
  /** Each appearance choice's name: System, Light, Dark. */
  readonly modes: Readonly<Record<AppearanceMode, string>>;
  /**
   * The note under the appearance choice: what it does, and, while it
   * follows the system, what that gives now ("Follows the system, which is
   * light now.").
   */
  readonly modeNote: (mode: AppearanceMode, systemDark: boolean) => string;
  /** The light themes' band: "Light theme". */
  readonly lightTheme: string;
  /** When the light band's theme shows: "Shown while the appearance is light." */
  readonly lightNote: string;
  /** The dark themes' band: "Dark theme". */
  readonly darkTheme: string;
  /** When the dark band's theme shows: "Shown while the appearance is dark." */
  readonly darkNote: string;
  /** The mark on the band the window wears now: "In use now". */
  readonly inUse: string;
}

/** The Settings dialog's shared words. */
export interface SettingsLabels {
  /** The dialog's title: "Settings". */
  readonly title: string;
  /** The sidebar's accessible name: "Settings pages". */
  readonly sidebar: string;
  /** The dialog's one verb, on Return and Escape: "Done". */
  readonly done: string;
  /** The Appearance page's words. */
  readonly appearance: AppearanceLabels;
}

/** English Settings words: the `settings` group `UiokProvider` starts from. */
export const DEFAULT_SETTINGS_LABELS: SettingsLabels = {
  title: 'Settings',
  sidebar: 'Settings pages',
  done: 'Done',
  appearance: {
    title: 'Theme',
    mode: 'Appearance',
    modes: { system: 'System', light: 'Light', dark: 'Dark' },
    modeNote: (mode, systemDark) =>
      mode === 'system'
        ? systemDark
          ? 'Follows the system, which is dark now.'
          : 'Follows the system, which is light now.'
        : mode === 'light'
          ? 'Light whatever the system uses.'
          : 'Dark whatever the system uses.',
    lightTheme: 'Light theme',
    lightNote: 'Shown while the appearance is light.',
    darkTheme: 'Dark theme',
    darkNote: 'Shown while the appearance is dark.',
    inUse: 'In use now'
  }
};
