# Themes

Every colour UIOK paints is a CSS custom property (a token) such as `var(--accent)`. A theme is a palette of source colours; fixed rules turn that palette into the full token set, and a generated stylesheet declares the tokens for every theme. Switching theme swaps token values only, so no component changes.

## How it works

```text
src/themes/ids.ts           theme ids, names, appearances, root attributes (no colours)
src/themes/catalog.ts       one palette per theme (26 Catppuccin role names, 16 ANSI colours)
src/themes/tokens.ts        the rules: palette -> tokens, and themeStylesheet()
src/themes/themes.generated.css   the output, committed; shipped inside uiok/styles.css
```

1. `uiok/styles.css` imports `themes.generated.css`. Its `:root` wears Catppuccin Latte, and Catppuccin Mocha under `prefers-color-scheme: dark`. `:root` also declares `color-scheme: light dark`, so native controls and scrollbars follow the same appearance.
2. A page picks other themes with two attributes on its root element. The light theme's block applies while the system appearance is light, and the dark theme's block while it is dark.
3. Code that reads token values in script (a canvas or a chart) re-reads them when `subscribeThemeChange` calls.

The 18 themes are Catppuccin (Latte, Frappé, Macchiato, Mocha), GitHub Light and Dark, Gruvbox Light and Dark, One Light and Dark, Rosé Pine and Rosé Pine Dawn, Solarized Light and Dark, Tokyo Night and Tokyo Night Day, Nord, and Dracula. Each palette's comment in `catalog.ts` credits its upstream source.

## The attribute contract

| Attribute                       | On                          | Effect                                                                                                                  |
| ------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `data-light-theme="<light id>"` | the root element (`<html>`) | that theme's tokens while the appearance is light                                                                       |
| `data-dark-theme="<dark id>"`   | the root element            | that theme's tokens while the appearance is dark                                                                        |
| `data-theme-preview="<any id>"` | any element                 | that theme's preview tokens (`PREVIEW_TOKENS`) inside the element, whatever the page wears; for theme-picker miniatures |

Without an attribute the defaults apply. Ids are listed in `THEME_ENTRIES`, `LIGHT_THEME_IDS`, and `DARK_THEME_IDS`; validate saved values with `isLightThemeId` and `isDarkThemeId`.

```ts
import { subscribeThemeChange, wearThemes } from 'uiok';

wearThemes(document.documentElement, { light: 'solarized-light', dark: 'nord' });
const stop = subscribeThemeChange(() => redrawCanvas());
```

`wearThemes` leaves an attribute alone when it already names the theme, so observers do not fire for no change. Set the attributes before first paint where you can (server-rendered markup, an inline script, or a preload) to avoid a flash of the default theme.

## Tokens by role

Theme tokens differ per theme; fixed tokens are the same in every theme and live on `:root` only.

| Role             | Tokens                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Grounds          | `--bg` (window), `--bg-panel` (panels), `--bg-header` (header bar); aliases `--ground`, `--surface`, `--surface-header` (fixed)                                   |
| Lines            | `--border`, `--border-strong` (outlines on `--cursor-bg` fills)                                                                                                   |
| Text             | `--text`, `--text-dim` (4.5:1 on every ground), `--text-on-surface` (4.5:1 on fills and the cursor row), `--row-meta-text` (a listing row's attributes)           |
| Accent           | `--accent` (selection, focus, links), `--on-accent`; fixed `--selection-cursor`, `--selection-hit`                                                                |
| Primary          | `--primary-hue` (the raw lavender role, for icons), `--primary` (button fill), `--on-primary`; fixed `--primary-hover`                                            |
| Tonal tier       | `--on-tonal`, `--tonal-border`, `--tonal-hover-brightness`; fixed `--tonal` (alias of `--cursor-row-bg`)                                                          |
| Listings         | `--row-lift`, `--file-list-bg`, `--cursor-bg` (hover fill), `--cursor-row-bg` (keyboard cursor row)                                                               |
| Glass and hover  | `--glass-edge`, `--hover-wash`; fixed `--hover-frost`, `--hover-lit`                                                                                              |
| Status           | `--success`, `--warning`, `--danger` (4.5:1 on a panel)                                                                                                           |
| Categorical      | `--group-blue`, `-green`, `-purple`, `-orange`, `-teal`, `-pink`, `-yellow`, `-red`, and `--group-dot-ring` (a hairline when any hue is under 3:1, else `none`)   |
| Terminal         | `--terminal-bg`, `--terminal-fg`, `--terminal-cursor`, `--terminal-selection`, `--terminal-ansi-0` to `-15` (hex or `rgb()`, so a terminal engine can parse them) |
| Syntax           | `--syntax-<role>` for rosewater, flamingo, pink, mauve, red, maroon, peach, yellow, green, teal, sky, sapphire, blue, lavender, subtext0, overlay2                |
| Charts (fixed)   | `--chart-1` to `--chart-8`, in assignment order, from the syntax hues                                                                                             |
| Disabled (fixed) | `--disabled-opacity` (0.4); `uiok/styles.css` fades every disabled control to it                                                                                  |
| Shadows (fixed)  | `--shadow-menu`, `--shadow-dialog`, `--shadow-notice`, `--shadow-card`, `--shadow-card-hover`, `--shadow-segment`, `--shadow-pressed`, `--shadow-knob`            |
| Fixed colour     | `--switch-knob` (white on its track in every theme)                                                                                                               |

`src/themes/tokens.test.ts` enforces the contrast ratios above in every theme, keeps Latte and Mocha equal to a frozen fixture (`catppuccin-tokens.fixture.json`), and checks that every theme yields the same token names in the same order.

## Changing a theme or a rule

Edit `catalog.ts` or `tokens.ts`, then regenerate the stylesheet:

```sh
UPDATE_THEMES=1 npx vitest run src/themes/themes.test.ts
```

`themes.test.ts` fails while the committed file is stale. A theme overrides a token (`overrides` in its catalog entry) only where it was hand-tuned past what the rule gives, with a comment saying why; `ThemeOverrides` types each override by the kind of value the token holds. Tokens drawn straight from the palette (`--bg-panel`, `--text`, `--primary-hue`, `--group-*`) take no override; change the palette, or `groups` for a group hue. Never regenerate the fixture to make a test pass.

`test/colorLiterals.test.ts` fails on a colour literal anywhere in `src/` outside the token blocks of `themes.generated.css` and the catalog modules.

## Adding an app's own tokens

An app with tokens UIOK does not define (a brand colour, a build-channel tag) derives them from the same themes and writes them through the same generator, so they follow every theme and both appearances under the same selectors:

```ts
import { themeStylesheet, type Theme, type ThemeTokens } from 'uiok';

const css = themeStylesheet({
  includeUiokTokens: false, // the app imports uiok/styles.css, which already has them
  banner: 'Generated by scripts/app-tokens.test.ts; do not edit.',
  extraFixed: { '--brand': '#ff6600' },
  extraTokens: (theme: Theme, tokens: ThemeTokens) => ({
    '--brand-tint': `color-mix(in srgb, var(--brand) 14%, ${tokens['--bg']})`,
    '--release-tag': theme.appearance === 'light' ? theme.palette.mauve : theme.palette.pink
  }),
  extraBlocks: { "[data-channel='beta']": { '--channel': 'var(--release-tag)' } }
});
```

| Option                       | What it adds                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `extraFixed`                 | tokens on `:root` that are the same in every theme                                                                                                                                     |
| `extraTokens(theme, tokens)` | tokens per theme, in the default `:root` blocks and in every theme block; `tokens` are the theme's UIOK tokens with overrides applied, and `theme.id` lets the app hand-tune one theme |
| `extraBlocks`                | rules by selector outside any query, after the default `:root`                                                                                                                         |
| `includeUiokTokens`          | `true` (default) writes one combined sheet; `false` writes the app's tokens alone, dropping blocks that would be empty                                                                 |
| `banner`                     | the opening comment                                                                                                                                                                    |

An extra token must be a kebab-case custom property UIOK does not define; the generator throws otherwise, so an app cannot silently change a token UIOK's components read. No value or selector may hold `;`, `{`, `}`, `/*`, or `*/` outside a string or `url()`, nor a string that spans lines, nor the banner `*/`, since each would end its declaration, rule, or comment early. Commit the output and keep it fresh with a staleness test like `src/themes/themes.test.ts`.

## Migrating from the app tokens

Apps moving onto UIOK's themes rename these tokens in their CSS and script, and rename the catalog field `tabGroups` to `groups` and the type `TabGroupHue` to `GroupHue`:

| Old                    | New                |
| ---------------------- | ------------------ |
| `--tab-group-blue`     | `--group-blue`     |
| `--tab-group-green`    | `--group-green`    |
| `--tab-group-purple`   | `--group-purple`   |
| `--tab-group-orange`   | `--group-orange`   |
| `--tab-group-teal`     | `--group-teal`     |
| `--tab-group-pink`     | `--group-pink`     |
| `--tab-group-yellow`   | `--group-yellow`   |
| `--tab-group-red`      | `--group-red`      |
| `--tab-group-dot-ring` | `--group-dot-ring` |
| `--folder-icon`        | `--primary-hue`    |

Values are unchanged; `--primary` and `--on-tonal` still derive from the same palette role.

These tokens are not in UIOK and move to the app's own layer through `themeStylesheet` options: `--channel-*` and the `[data-channel]` blocks, `--plate*`, `--ls-*`, `--bell-mark`, `--brand-mark-mix`, `--tab-active-bg`, `--letterbox`, `--shadow-splash`, `--shadow-dragging-tab`, `--shadow-dragging-header`, and `--shadow-lens`. Their rules can be rebuilt from `theme.palette` and the UIOK `tokens` passed to `extraTokens`, with values that were hand-tuned per theme keyed by `theme.id`. The app's `color-scheme: light dark` on `:root` and its disabled-control rule can go, since `uiok/styles.css` now declares both.
