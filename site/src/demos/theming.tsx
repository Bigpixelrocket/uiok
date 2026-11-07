/**
 * The theme switcher across every theme, each drawn as a miniature through
 * `data-theme-preview`, and the tokens the worn theme sets, by role.
 */

import { useId } from 'react';

import {
  THEME_ENTRIES,
  THEME_PREVIEW_ATTRIBUTE,
  themeById,
  themeTokens,
  type ThemeEntry
} from '@bigpixelrocket/uiok';
import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';

import { useTheme, type AppearanceChoice } from '../theme';

/** Token roles, in the order docs/themes.md lists them; a name lands in the first role that claims it. */
const ROLES: readonly { readonly role: string; readonly claims: (name: string) => boolean }[] = [
  { role: 'Grounds', claims: (name) => name.startsWith('--bg') },
  { role: 'Lines', claims: (name) => name.startsWith('--border') },
  { role: 'Text', claims: (name) => name.startsWith('--text') || name === '--row-meta-text' },
  { role: 'Accent', claims: (name) => name.endsWith('accent') },
  { role: 'Primary', claims: (name) => name.includes('primary') },
  { role: 'Tonal tier', claims: (name) => name.includes('tonal') },
  { role: 'Listings', claims: (name) => /^--(row-lift|file-list-bg|cursor)/.test(name) },
  { role: 'Glass and hover', claims: (name) => name === '--glass-edge' || name === '--hover-wash' },
  { role: 'Status', claims: (name) => ['--success', '--warning', '--danger'].includes(name) },
  { role: 'Categorical', claims: (name) => name.startsWith('--group') },
  { role: 'Terminal', claims: (name) => name.startsWith('--terminal') },
  { role: 'Syntax', claims: (name) => name.startsWith('--syntax') },
  { role: 'Other', claims: () => true }
];

const isColour = (value: string): boolean => CSS.supports('color', value);

/** One theme's miniature, a button that wears it. */
function ThemeTile({
  entry,
  worn,
  onWear
}: {
  readonly entry: ThemeEntry;
  readonly worn: boolean;
  readonly onWear: () => void;
}) {
  return (
    <button
      aria-pressed={worn}
      className="theme-tile"
      onClick={onWear}
      type="button"
      {...{ [THEME_PREVIEW_ATTRIBUTE]: entry.id }}
    >
      <span className="theme-tile-window" aria-hidden="true">
        <span className="theme-tile-bar" />
        <span className="theme-tile-body">
          <span className="theme-tile-line strong" />
          <span className="theme-tile-line" />
          <span className="theme-tile-chips">
            <span className="chip chip-1" />
            <span className="chip chip-2" />
            <span className="chip chip-3" />
            <span className="chip chip-4" />
            <span className="chip chip-5" />
            <span className="chip chip-6" />
          </span>
          <span className="theme-tile-button" />
        </span>
      </span>
      <span className="theme-tile-name">{entry.name}</span>
    </button>
  );
}

const APPEARANCES: readonly AppearanceChoice[] = ['system', 'light', 'dark'];
const WORDS: Readonly<Record<AppearanceChoice, string>> = {
  system: 'Auto',
  light: 'Light',
  dark: 'Dark'
};

/** The theming page's demo. */
export function ThemingDemo() {
  const theme = useTheme();
  const appearanceLabel = useId();
  const tokens = themeTokens(themeById(theme.worn));
  const groups = new Map<string, string[]>();
  for (const name of Object.keys(tokens)) {
    const role = ROLES.find((candidate) => candidate.claims(name))?.role ?? 'Other';
    groups.set(role, [...(groups.get(role) ?? []), name]);
  }

  const wear = (entry: ThemeEntry) => {
    const keepsSystem =
      theme.choice.appearance === 'system' && theme.appearance === entry.appearance;
    theme.setChoice({
      ...theme.choice,
      [entry.appearance]: entry.id,
      appearance: keepsSystem ? 'system' : entry.appearance
    });
  };

  return (
    <div className="theming-demo">
      <div className="demo-row">
        <span className="demo-label" id={appearanceLabel}>
          Appearance
        </span>
        <SegmentedChoice
          choices={APPEARANCES}
          labelId={appearanceLabel}
          onChange={(appearance) => theme.setChoice({ ...theme.choice, appearance })}
          render={(choice) => WORDS[choice]}
          value={theme.choice.appearance}
        />
        <code className="demo-readout">
          data-light-theme=&quot;{theme.choice.light}&quot; data-dark-theme=&quot;
          {theme.choice.dark}&quot;
        </code>
      </div>
      {(['light', 'dark'] as const).map((appearance) => (
        <section
          key={appearance}
          aria-label={`${appearance === 'light' ? 'Light' : 'Dark'} themes`}
        >
          <h3 className="demo-subhead">
            {appearance === 'light' ? 'Light themes' : 'Dark themes'}
          </h3>
          <div className="theme-tiles">
            {THEME_ENTRIES.filter((entry) => entry.appearance === appearance).map((entry) => (
              <ThemeTile
                entry={entry}
                key={entry.id}
                onWear={() => wear(entry)}
                worn={theme.choice[appearance] === entry.id && theme.appearance === appearance}
              />
            ))}
          </div>
        </section>
      ))}
      <h3 className="demo-subhead">Tokens of {themeById(theme.worn).name}</h3>
      <div className="token-roles">
        {ROLES.filter(({ role }) => groups.has(role)).map(({ role }) => (
          <section className="token-role" key={role}>
            <h4>{role}</h4>
            <ul>
              {(groups.get(role) ?? []).map((name) => {
                const value = tokens[name as keyof typeof tokens];
                return (
                  <li className="token" key={name}>
                    <span
                      aria-hidden="true"
                      className={isColour(value) ? 'token-swatch' : 'token-swatch none'}
                      style={isColour(value) ? { background: `var(${name})` } : undefined}
                    />
                    <code className="token-name">{name}</code>
                    <code className="token-value">{value}</code>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
