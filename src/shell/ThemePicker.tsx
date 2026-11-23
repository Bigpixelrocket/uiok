import { useEffect, useId, useRef, useState } from 'react';
import type { KeyboardEvent, ReactElement } from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import type { AppearanceMode } from '../labels/settings.js';
import { SegmentedChoice } from '../segmented/SegmentedChoice.js';
import {
  THEME_ENTRIES,
  THEME_PREVIEW_ATTRIBUTE,
  type AppearanceThemes,
  type ThemeAppearance
} from '../themes/ids.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import { SettingsSubsection, SETTINGS_REVEAL_ATTRIBUTE } from './SettingsSubsection.js';
import { appearanceInUse, steppedIndex } from './ThemePicker.logic.js';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * Whether the system's appearance, as the page sees it, is dark now,
 * following each change. A page with no `matchMedia` reads as light.
 */
export function useSystemDark(): boolean {
  const [dark, setDark] = useState(() => window.matchMedia?.(DARK_QUERY).matches ?? false);

  useEffect(() => {
    const query = window.matchMedia?.(DARK_QUERY);

    if (!query) {
      return undefined;
    }

    const follow = (): void => setDark(query.matches);

    follow();
    query.addEventListener('change', follow);

    return () => query.removeEventListener('change', follow);
  }, []);

  return dark;
}

/**
 * A theme's miniature window, painted in that theme's own colours whatever
 * the page wears (the preview tokens under `data-theme-preview`): the
 * header strip with its window buttons, a sidebar with the cursor row lit,
 * and a panel with a line of text, a quieter line, a primary chip beside an
 * accent mark, and a row of the theme's ANSI colours. Drawn for the eye
 * only; the option's name says which theme it is.
 */
export function ThemePreview({ id }: { readonly id: string }): ReactElement {
  return (
    <span aria-hidden className="theme-preview" {...{ [THEME_PREVIEW_ATTRIBUTE]: id }}>
      <span className="theme-preview-header">
        <span className="theme-preview-lights">
          <span />
          <span />
          <span />
        </span>
      </span>
      <span className="theme-preview-body">
        <span className="theme-preview-sidebar">
          <span className="theme-preview-row lit" />
          <span className="theme-preview-row" />
          <span className="theme-preview-row" />
        </span>
        <span className="theme-preview-panel">
          <span className="theme-preview-line text" />
          <span className="theme-preview-line dim" />
          <span className="theme-preview-chips">
            <span className="theme-preview-chip primary" />
            <span className="theme-preview-chip accent" />
          </span>
          <span className="theme-preview-swatches">
            {[1, 2, 3, 4, 5, 6].map((index) => (
              <span className={`theme-preview-swatch ansi-${index}`} key={index} />
            ))}
          </span>
        </span>
      </span>
    </span>
  );
}

/** A theme a picker offers: its id and display name. */
export interface ThemeChoice {
  readonly id: string;
  readonly name: string;
}

/** Props for {@link ThemeChoices}. */
export interface ThemeChoicesProps {
  /** The themes, in the order the picker lists them. */
  readonly themes: readonly ThemeChoice[];
  /** The chosen theme's id. */
  readonly value: string;
  /** Hears a new choice, never the one already chosen. */
  readonly onChange: (id: string) => void;
  /** The id of the group's label; or `label` names it. */
  readonly labelId?: string;
  /** The group's name where no element labels it. */
  readonly label?: string;
  /** The ids of what describes the group (whether it is in use now, when it shows). */
  readonly describedBy?: string;
  /** Marks the chosen theme for `SettingsDialog` to bring into view as the page opens. */
  readonly reveal?: boolean;
}

/**
 * One appearance's themes as a radio group of miniatures (`ThemePreview`),
 * each with its name under it: one Tab stop (the chosen theme), the arrow
 * keys moving the choice through every theme, wrapping at the ends, with
 * the focus following it. A choice applies at once.
 */
export function ThemeChoices({
  themes,
  value,
  onChange,
  labelId,
  label,
  describedBy,
  reveal = false
}: ThemeChoicesProps): ReactElement {
  const group = useRef<HTMLDivElement>(null);

  const choose = (id: string): void => {
    if (id !== value) onChange(id);
  };

  const step = (event: KeyboardEvent): void => {
    const index = steppedIndex(
      event.key,
      themes.findIndex((theme) => theme.id === value),
      themes.length
    );
    const next = index === null ? undefined : themes[index];

    if (index === null || next === undefined) {
      return;
    }

    event.preventDefault();
    choose(next.id);
    group.current?.querySelectorAll<HTMLElement>('[role="radio"]')[index]?.focus();
  };

  return (
    <div
      aria-describedby={describedBy}
      aria-label={labelId === undefined ? label : undefined}
      aria-labelledby={labelId}
      className="theme-choices"
      onKeyDown={step}
      ref={group}
      role="radiogroup"
    >
      {themes.map((theme) => (
        <button
          aria-checked={theme.id === value}
          className="theme-choice"
          key={theme.id}
          onClick={() => choose(theme.id)}
          role="radio"
          tabIndex={theme.id === value ? 0 : -1}
          type="button"
          {...(reveal && theme.id === value ? { [SETTINGS_REVEAL_ATTRIBUTE]: '' } : {})}
        >
          <span className="theme-choice-frame">
            <ThemePreview id={theme.id} />
          </span>
          <span className="theme-choice-name" data-name={theme.name}>
            {theme.name}
          </span>
        </button>
      ))}
    </div>
  );
}

/** The themes of one appearance from the catalog, in its order. */
export const themesOf = (appearance: ThemeAppearance): readonly ThemeChoice[] =>
  THEME_ENTRIES.filter((entry) => entry.appearance === appearance);

/** The appearances whose themes the page lists, in its order. */
const APPEARANCES: readonly ThemeAppearance[] = ['light', 'dark'];

/** The appearance choices, in the segmented control's order. */
const MODES: readonly AppearanceMode[] = ['system', 'light', 'dark'];

/** Props for {@link AppearanceSettings}. */
export interface AppearanceSettingsProps {
  /** Which appearance the windows wear, as last saved. */
  readonly mode: AppearanceMode;
  /** Saves and applies a new appearance. */
  readonly onModeChange: (mode: AppearanceMode) => void;
  /** The theme each appearance wears, as last saved. */
  readonly themes: AppearanceThemes;
  /** Saves the theme one appearance wears; `id` is always one of that appearance's themes. */
  readonly onThemeChange: (appearance: ThemeAppearance, id: string) => void;
  /** The subsection's id in the page's `subsections`; `theme` unless given. */
  readonly subsectionId?: string;
}

/**
 * The Appearance page's Theme subsection: which appearance the windows wear
 * (System follows the operating system's), its note following the choice
 * and the system, then each appearance's theme as a grid of miniatures
 * (`ThemeChoices`), the band in use now marked so a dark theme picked while
 * the window is light reads as waiting rather than ignored. When a band
 * shows is the label's tooltip, read with the themes. The host holds every
 * value and saves each change, which applies at once. Words from
 * `UiokLabels.settings.appearance`.
 */
export function AppearanceSettings({
  mode,
  onModeChange,
  themes,
  onThemeChange,
  subsectionId = 'theme'
}: AppearanceSettingsProps): ReactElement {
  const labels = useLabels().settings.appearance;
  const systemDark = useSystemDark();
  const inUse = appearanceInUse(mode, systemDark);
  const ids = useId();
  const modeLabelId = `${ids}-mode`;

  return (
    <SettingsSubsection id={subsectionId} title={labels.title}>
      <div className="field-grid">
        <span className="field-label" id={modeLabelId}>
          {labels.mode}
        </span>
        <div className="field-value">
          <div className="field-option">
            <SegmentedChoice
              choices={MODES}
              labelId={modeLabelId}
              onChange={onModeChange}
              render={(choice) => labels.modes[choice]}
              value={mode}
            />
          </div>
          <p className="field-note">{labels.modeNote(mode, systemDark)}</p>
        </div>
        {APPEARANCES.map((appearance) => {
          const labelId = `${ids}-${appearance}`;
          const noteId = `${labelId}-note`;
          const note = appearance === 'light' ? labels.lightNote : labels.darkNote;
          const used = inUse === appearance;

          return (
            <ThemeBand
              describedBy={used ? `${labelId}-in-use ${noteId}` : noteId}
              inUse={used ? labels.inUse : null}
              key={appearance}
              label={appearance === 'light' ? labels.lightTheme : labels.darkTheme}
              labelId={labelId}
              note={note}
              noteId={noteId}
              onChange={(id) => onThemeChange(appearance, id)}
              themes={themesOf(appearance)}
              value={themes[appearance]}
            />
          );
        })}
      </div>
    </SettingsSubsection>
  );
}

/** One appearance's band: its label, marked while in use, and its themes. */
function ThemeBand({
  label,
  labelId,
  inUse,
  note,
  noteId,
  describedBy,
  themes,
  value,
  onChange
}: {
  readonly label: string;
  readonly labelId: string;
  readonly inUse: string | null;
  readonly note: string;
  readonly noteId: string;
  readonly describedBy: string;
  readonly themes: readonly ThemeChoice[];
  readonly value: string;
  readonly onChange: (id: string) => void;
}): ReactElement {
  return (
    <>
      <span className="field-label" {...tooltip(note)}>
        <span id={labelId}>{label}</span>
        {inUse === null ? null : (
          <span className="settings-label-detail" id={`${labelId}-in-use`}>
            {inUse}
          </span>
        )}
      </span>
      <div className="field-value">
        <ThemeChoices
          describedBy={describedBy}
          labelId={labelId}
          onChange={onChange}
          reveal={inUse !== null}
          themes={themes}
          value={value}
        />
        <p className="visually-hidden" id={noteId}>
          {note}
        </p>
      </div>
    </>
  );
}
