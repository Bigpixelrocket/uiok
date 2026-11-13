# Labels

UIOK ships no i18n runtime. Copy reaches components two ways:

- **Per-instance copy** (a dialog's title, a button's words, a filter's "Clear filter") is a prop. The app translates it at the call site.
- **Shared chrome strings** that every instance of a component repeats (key names, and later verbs such as Cancel and More) come from one typed `UiokLabels` object that `UiokProvider` supplies. English is the default, so an app that sets nothing still renders readable controls.

## The provider

Mount `UiokProvider` once near the root, next to `TooltipLayer`:

```tsx
import '@bigpixelrocket/uiok/styles.css';
import { TooltipLayer, UiokProvider } from '@bigpixelrocket/uiok';

export function Root({ children }: { children: React.ReactNode }) {
  return (
    <UiokProvider labels={labels}>
      {children}
      <TooltipLayer />
    </UiokProvider>
  );
}
```

`labels` is any part of `UiokLabels` (`UiokLabelsOverride`). It merges over the defaults record by record at any depth, so `{ keys: { names: { Enter: 'Enter' } } }` changes one key name and keeps every other. A field set to `undefined` keeps the default. A function label is replaced whole, never merged.

A provider inside another merges its labels over the outer one's, so a subtree can override one group alone.

Keep the `labels` object's identity stable (build it once per language, for example in a `useMemo` keyed by the locale). A new object on every render makes every component that reads labels render again.

Components read labels with `useLabels()`. Code outside React that needs the same strings (a keymap that prints chords into a menu) calls `mergeLabels(DEFAULT_LABELS, override)` and passes the group on, as in `chordSpoken(chord, labels.keys)`.

## Groups and defaults

| Group       | Interface         | Default                     | Read by                                                                                 |
| ----------- | ----------------- | --------------------------- | --------------------------------------------------------------------------------------- |
| `keys`      | `KeyLabels`       | `DEFAULT_KEY_LABELS`        | `KeyChord`, `FilterEscape`, and, given it, `chordSpoken`, `chordGlyphs`, `modifierName` |
| `charts`    | `ChartLabels`     | `DEFAULT_CHART_LABELS`      | `LineChart`, `ScatterChart`, `ResultChart`, and, given it, `tokenColour`, `svgPng`      |
| `dateTime`  | `DateTimeLabels`  | `DEFAULT_DATE_TIME_LABELS`  | `DateTimePicker`                                                                        |
| `dialog`    | `DialogLabels`    | `DEFAULT_DIALOG_LABELS`     | `ConfirmDialog`, `DialogItems`, and, given it, `filterLeaveLabel`                       |
| `legend`    | `LegendLabels`    | `DEFAULT_LEGEND_LABELS`     | `KeyLegendStrip`, and, given it, `moreLabel`                                            |
| `listing`   | `ListingLabels`   | `DEFAULT_LISTING_LABELS`    | `Strip` and `Listing`, for a column label that sorts                                    |
| `pager`     | `PagerLabels`     | `DEFAULT_PAGER_LABELS`      | `Pager`                                                                                 |
| `palette`   | `PaletteLabels`   | `DEFAULT_PALETTE_LABELS`    | `PaletteQuery`: the level chip and a refused keystroke                                  |
| `selectAll` | `SelectAllLabels` | `DEFAULT_SELECT_ALL_LABELS` | `SelectAllBar`                                                                          |
| `terminal`  | `TerminalLabels`  | `DEFAULT_TERMINAL_LABELS`   | `Terminal` (`@bigpixelrocket/uiok/terminal`): its menu, its failure line, its input     |

### `keys`

| Field            | Type                              | English default                                                                                                      |
| ---------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `modifiers`      | `Record<LayerModifier, string>`   | `ctrl` Control, `alt` Option, `shift` Shift, `meta` Command                                                          |
| `names`          | `Partial<Record<string, string>>` | By `KeyboardEvent.key`: `ArrowUp` Up, `Enter` Return, `' '` Space, `?` Question Mark, and the rest of the named keys |
| `modifierGlyphs` | `Record<LayerModifier, string>`   | ⌃ ⌥ ⇧ ⌘                                                                                                              |
| `keyGlyphs`      | `Partial<Record<string, string>>` | `Enter` ↩, `Backspace` ⌫, `Escape` ⎋, arrows, `PageUp` ⇞, and so on                                                  |
| `spaceCap`       | `string`                          | `space`                                                                                                              |
| `escapeCap`      | `string`                          | `esc`                                                                                                                |

A key missing from `names` is spoken as its capital ("N"); one missing from `keyGlyphs` is written as its capital.

The defaults are macOS's names and glyphs. An app on Windows or Linux supplies its own, for example `modifiers: { alt: 'Alt', meta: 'Windows' }` and `modifierGlyphs: { ctrl: 'Ctrl+', alt: 'Alt+', shift: 'Shift+', meta: 'Win+' }`. Modifier order (Control, Option, Shift, Command) and the icons `KeyChord` draws for modifiers stay macOS's in this version.

### `charts`

| Field                 | Type                                                          | English default                                       |
| --------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| `chart`               | `string`                                                      | Chart (an untitled `ResultChart`'s name)              |
| `noValue`             | `string`                                                      | no value                                              |
| `points`              | `(count: number) => string`                                   | 1 point, 10 points                                    |
| `pointsShown`         | `(shown: number, count: number) => string`                    | 3 of 10 points                                        |
| `resetZoom`           | `string`                                                      | Reset zoom                                            |
| `time`                | `(time: string) => string`                                    | Time: 10:42:05                                        |
| `seriesValue`         | `(series: string, value: string) => string`                   | reads: 12                                             |
| `seriesCategoryValue` | `(series: string, category: string, value: string) => string` | sales, Tue: 5                                         |
| `coloursUnreadable`   | `string`                                                      | The theme’s colors could not be read for the picture. |
| `drawFailed`          | `string`                                                      | The picture could not be drawn.                       |

Counts arrive as numbers, so the app formats them for its locale and picks the plural; the English defaults group digits as en-US does (1,024). Values and moments arrive already written by the chart's `format` and `timeText` props. `tokenColour` and `svgPng` run outside React, so they take the group as an argument (`useLabels().charts`) and fall back to English.

### `dateTime`

| Field           | Type     | English default                                                                   |
| --------------- | -------- | --------------------------------------------------------------------------------- |
| `locale`        | `string` | `en-US`: the BCP 47 locale month and weekday names are written in, through `Intl` |
| `previousMonth` | `string` | Previous month                                                                    |
| `nextMonth`     | `string` | Next month                                                                        |
| `hour`          | `string` | Hour                                                                              |
| `minute`        | `string` | Minute                                                                            |
| `second`        | `string` | Second                                                                            |
| `millisecond`   | `string` | Millisecond (a fraction of up to 3 digits)                                        |
| `microsecond`   | `string` | Microsecond (4 to 6 digits)                                                       |
| `today`         | `string` | Today                                                                             |
| `now`           | `string` | Now                                                                               |
| `done`          | `string` | Done                                                                              |

### `dialog`

| Field           | Type                        | English default  |
| --------------- | --------------------------- | ---------------- |
| `cancel`        | `string`                    | `Cancel`         |
| `clear`         | `string`                    | `Clear`          |
| `affectedItems` | `(count: number) => string` | `Affected items` |
| `moreItems`     | `(count: number) => string` | `+3 more`        |
| `itemCount`     | `(count: number) => string` | `3 items`        |

`cancel` is a confirmation's leave verb unless the caller names another; `filterLeaveLabel` picks `clear` while a filter holds text. `affectedItems` names a confirmation's item list (one without a group label), given how many it holds. `moreItems` is that list's last row when it stops short, given how many items it leaves out (`DialogItems`). `itemCount` is the count a screen reader hears after the lead and before the names.

### `legend`

| Field     | Type                                      | English default                        |
| --------- | ----------------------------------------- | -------------------------------------- |
| `label`   | `string`                                  | `Keyboard shortcuts`                   |
| `verbs`   | `string`                                  | `Verbs`                                |
| `capName` | `(chord: string, verb: string) => string` | `` `${chord} ${verb}` ``: "Up Move Up" |
| `more`    | `(count: number) => string`               | `1 more shortcut`, `3 more shortcuts`  |

A folded pair's label ("Up/Down") is not a label here: the app owns its pair vocabulary and passes the labels to `KeyLegendStrip` (`docs/components/legend.md`).

### `listing`

| Field    | Type                                                   | English default                                                                     |
| -------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `sortBy` | `(column: string, direction: SortDirection) => string` | "Sort by Size", "Sort by Size, sorted ascending", "Sort by Size, sorted descending" |

`SortDirection` is `'asc' | 'desc' | null`; null is a column the listing is not sorted by.

### `pager`

| Field                              | Type                                        | English default                                        |
| ---------------------------------- | ------------------------------------------- | ------------------------------------------------------ |
| `begin`, `previous`, `next`, `end` | `string`                                    | Begin, Previous, Next, End (a step's word and tooltip) |
| `pages`                            | `(kind: string) => string`                  | "Pages of rows" (the pager's accessible name)          |
| `page`                             | `(kind: string) => string`                  | "Page of rows" (the page menu's accessible name)       |
| `step`                             | `(step: PagerStep, kind: string) => string` | "Next page of rows"                                    |
| `pageOption`                       | `(page: number, pages: number) => string`   | "3 of 1,200", English digit grouping                   |

`kind` is the `Pager`'s prop, "items" by default. An app whose language inflects the noun by its sentence passes a code (`kind="rows"`) and maps it inside these functions. `PagerStep` is `'begin' | 'previous' | 'next' | 'end'`.

### `palette`

| Field            | Type                        | English default                                                               |
| ---------------- | --------------------------- | ----------------------------------------------------------------------------- |
| `back`           | `string`                    | Back (the level chip's tooltip)                                               |
| `backFrom`       | `(level: string) => string` | "Back from Formats" (the level chip's accessible name)                        |
| `nothingMatches` | `(query: string) => string` | "nothing matches “dox”" (said in the count's place after a refused keystroke) |

### `selectAll`

| Field      | Type                                         | English default                                                 |
| ---------- | -------------------------------------------- | --------------------------------------------------------------- |
| `checkAll` | `string`                                     | Check all                                                       |
| `selected` | `(checked: number, total: number) => string` | "3 of 8 selected" (before the bulk actions)                     |
| `label`    | `string`                                     | With selected (the bar's accessible name when it is given none) |

### `terminal`

| Field         | Type     | English default                                                                  |
| ------------- | -------- | -------------------------------------------------------------------------------- |
| `menu`        | `string` | Terminal (the menu's accessible name)                                            |
| `copy`        | `string` | Copy                                                                             |
| `paste`       | `string` | Paste                                                                            |
| `startFailed` | `string` | Could not start the terminal.                                                    |
| `input`       | `string` | Terminal input (the input element's name when the engine is started without one) |
| `scrollback`  | `string` | Scrollback (the scrollbar's accessible name)                                     |

A terminal's own name is its `ariaLabel` prop, and the chords its menu shows are its `menuChords` prop (`docs/components/terminal.md`).

## Mapping an app's i18n

Build the override from the app's translation function once per language:

```ts
import type { UiokLabelsOverride } from '@bigpixelrocket/uiok';

export function uiokLabels(t: (key: string) => string): UiokLabelsOverride {
  return {
    keys: {
      modifiers: {
        ctrl: t('key.modifier.control'),
        alt: t('key.modifier.option'),
        shift: t('key.modifier.shift'),
        meta: t('key.modifier.command')
      },
      names: {
        Enter: t('key.name.return'),
        ' ': t('key.name.space')
        // ...one entry per named key the app translates
      },
      spaceCap: t('key.cap.space')
    }
  };
}
```

Labels with a count or a value in them are functions (`affectedItems: (count) => t('dialog.affectedItems', { count })`), so the app's plural rules apply.

## Adding a group

Each area that shows shared chrome adds one group:

1. Create `src/labels/<area>.ts` with an exported `<Area>Labels` interface (every field documented) and `DEFAULT_<AREA>_LABELS` with the English values. Use strings, records of strings, and functions for interpolated or plural copy. Avoid arrays: overrides replace them whole.
2. In `src/labels/UiokLabels.ts`, add one field to `UiokLabels` and one to `DEFAULT_LABELS`.
3. Export the interface and default from `src/labels/index.ts`.
4. Read the group with `useLabels().<area>` and add a row to the tables above.

Each area's group lives in its own file, so parallel work touches only the three composition lines.
