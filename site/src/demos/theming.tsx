/**
 * The theme switcher across every theme, as the library's theme picker
 * (miniatures painted through `data-theme-preview`, the same picker the
 * Shell page shows), and the tokens the worn theme sets, by role.
 */

import { useId } from 'react';

import {
  DARK_THEME_IDS,
  LIGHT_THEME_IDS,
  themeById,
  themeTokens,
  type ThemeId
} from '@bigpixelrocket/uiok';
import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';

import { useTheme, type AppearanceChoice } from '../theme';
import { ThemeChoices } from '../ThemePicker';

/**
 * Token roles; a name lands in the first role that claims it, so the
 * narrower roles (selection, status words) come before the broad ones.
 */
const ROLES: readonly { readonly role: string; readonly claims: (name: string) => boolean }[] = [
  {
    role: 'Selection and current',
    claims: (name) =>
      /^--(cursor|selected|selection|on-selected|marked|current|match|text-selection|row-hover|fill$)/.test(
        name
      )
  },
  {
    role: 'Grounds',
    claims: (name) => /^--(bg|ground|surface|card-bg|file-list-bg|row-lift)/.test(name)
  },
  { role: 'Lines', claims: (name) => name.startsWith('--border') },
  {
    role: 'Text',
    claims: (name) =>
      name.startsWith('--text') || name === '--row-meta-text' || name === '--cell-binary-text'
  },
  { role: 'Accent', claims: (name) => name.startsWith('--accent') || name === '--on-accent' },
  { role: 'Primary', claims: (name) => name.includes('primary') },
  { role: 'Tonal tier', claims: (name) => name.includes('tonal') },
  {
    role: 'Status',
    claims: (name) => /^--(on-)?(success|warning|danger)/.test(name) || name === '--idle-mark'
  },
  {
    role: 'Controls',
    claims: (name) =>
      /^--(control|progress|scrollbar|pressed|hover|switch|disabled|dragging|well)/.test(name)
  },
  {
    role: 'Depth and glass',
    claims: (name) => /^--(shadow|scrim|glass)/.test(name)
  },
  { role: 'Charts', claims: (name) => name.startsWith('--chart') },
  { role: 'Categorical', claims: (name) => name.startsWith('--group') },
  { role: 'Terminal', claims: (name) => name.startsWith('--terminal') },
  { role: 'Syntax', claims: (name) => name.startsWith('--syntax') },
  // A guard: every token belongs to a role above, so this stays empty; a new
  // token that lands here needs its role claimed.
  { role: 'Other', claims: () => true }
];

/** The roles in the order the page lists them, as docs/themes.md does. */
const SHOWN: readonly string[] = [
  'Grounds',
  'Lines',
  'Text',
  'Accent',
  'Primary',
  'Tonal tier',
  'Status',
  'Controls',
  'Selection and current',
  'Depth and glass',
  'Charts',
  'Categorical',
  'Terminal',
  'Syntax',
  'Other'
];

const isColour = (value: string): boolean => CSS.supports('color', value);

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

  const wear = (id: ThemeId) => {
    const { appearance } = themeById(id);
    const keepsSystem = theme.choice.appearance === 'system' && theme.appearance === appearance;
    theme.setChoice({
      ...theme.choice,
      [appearance]: id,
      appearance: keepsSystem ? 'system' : appearance
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
          <ThemeChoices
            chosen={theme.choice[appearance]}
            ids={appearance === 'light' ? LIGHT_THEME_IDS : DARK_THEME_IDS}
            label={appearance === 'light' ? 'Light themes' : 'Dark themes'}
            onChoose={wear}
          />
        </section>
      ))}
      <h3 className="demo-subhead">Tokens of {themeById(theme.worn).name}</h3>
      <div className="token-roles">
        {SHOWN.filter((role) => groups.has(role)).map((role) => (
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
