# Labels

UIOK ships no i18n runtime. Copy reaches components two ways:

- **Per-instance copy** (a dialog's title, a button's words, a filter's "Clear filter") is a prop. The app translates it at the call site.
- **Shared chrome strings** that every instance of a component repeats (key names, and later verbs such as Cancel and More) come from one typed `UiokLabels` object that `UiokProvider` supplies. English is the default, so an app that sets nothing still renders readable controls.

## The provider

Mount `UiokProvider` once near the root, next to `TooltipLayer`:

```tsx
import 'uiok/styles.css';
import { TooltipLayer, UiokProvider } from 'uiok';

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

| Group    | Interface      | Default                 | Read by                                                                                 |
| -------- | -------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `keys`   | `KeyLabels`    | `DEFAULT_KEY_LABELS`    | `KeyChord`, `FilterEscape`, and, given it, `chordSpoken`, `chordGlyphs`, `modifierName` |
| `legend` | `LegendLabels` | `DEFAULT_LEGEND_LABELS` | `KeyLegendStrip`, and, given it, `moreLabel`                                            |

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

### `legend`

| Field     | Type                                      | English default                        |
| --------- | ----------------------------------------- | -------------------------------------- |
| `label`   | `string`                                  | `Keyboard shortcuts`                   |
| `verbs`   | `string`                                  | `Verbs`                                |
| `capName` | `(chord: string, verb: string) => string` | `` `${chord} ${verb}` ``: "Up Move Up" |
| `more`    | `(count: number) => string`               | `1 more shortcut`, `3 more shortcuts`  |

A folded pair's label ("Up/Down") is not a label here: the app owns its pair vocabulary and passes the labels to `KeyLegendStrip` (`docs/components/legend.md`).

## Mapping an app's i18n

Build the override from the app's translation function once per language:

```ts
import type { UiokLabelsOverride } from 'uiok';

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
