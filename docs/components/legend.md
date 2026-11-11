# Key legend (`@bigpixelrocket/uiok/legend`)

A strip along a window's bottom edge that names what the keyboard does now: a dock of fn and the four modifiers at the left, lit while held, then every verb the app offers under its chord. Each verb is also a button that runs it. The logic behind it (`legendUnits`, `fittingUnits`, `moreLabel`, `moreListAction`) is exported for an app that draws a legend of its own.

## Example

```tsx
import { KeyLegendStrip, type LegendPair, type LegendVerb } from '@bigpixelrocket/uiok/legend';

// The app's pair vocabulary, translated by the app each time the strip asks,
// so a language switch reaches the pair labels too.
const PAIR_LABEL_KEYS: Record<string, string> = {
  upDown: 'legend.pair.upDown', // "Up/Down"
  previousNextPage: 'legend.pair.previousNextPage' // "Previous/Next Page"
};
const pairLabel = (pair: LegendPair) => {
  const key = PAIR_LABEL_KEYS[pair];

  return key === undefined ? pair : t(key);
};

const verbs: LegendVerb[] = [
  { label: t('verb.up'), chord: { key: 'ArrowUp' }, run: moveUp, pair: 'upDown' },
  { label: t('verb.down'), chord: { key: 'ArrowDown' }, run: moveDown, pair: 'upDown' },
  { label: t('verb.copy'), chord: { key: 'c', meta: true }, run: copy }
];

<KeyLegendStrip pairLabel={pairLabel} verbs={verbs} />;
// [fn ⇧ ⌃ ⌥ ⌘] | [↑][↓] Up/Down   [⌘C] Copy
```

## Props (`KeyLegendStripProps`)

| Prop        | Type                           | Meaning                                                                                       |
| ----------- | ------------------------------ | --------------------------------------------------------------------------------------------- |
| `verbs`     | `readonly LegendVerb[]`        | The verbs, left to right, as the strip draws them; the app decides which and in which order   |
| `pairLabel` | `(pair: LegendPair) => string` | The shared label of a folded pair ("Up/Down"), in the language in use. Without it, none folds |

A `LegendVerb` is `{ label, chord, run, pair? }`: the words, the `Chord` that runs it, what a click runs, and the pair it is one direction of.

## Pairs

Two verbs that are one action's opposite directions can share a place: both key caps, each its own button, and one label. `LegendPair` is a plain string, so the app owns the vocabulary (`upDown`, `previousNextPage`, `backForward`, whatever its actions need) and supplies each pair's label. Neighbours fold into one place only when all of these hold:

- they sit next to each other in `verbs`;
- both name the same `pair`;
- they hold the same modifiers on opposite keys, in this order: ↑ then ↓, ← then →, Page Up then Page Down, Home then End, `[` then `]`.

So a custom chord that moves one verb onto another key, or a verb listed between them, leaves both in places of their own. Two verbs that only happen to sit on opposite keys never fold.

A pair's label is a message of its own in every language ("Up/Down", "Haut/Bas"), never the two verbs' labels joined, so a pair folds the same way whatever words its verbs take. `legendUnits(entries, { pairLabel, pairOf })` takes the same `pairLabel`; its `pairOf` reads the pair from somewhere other than each entry's `pair` field, such as a keymap.

## Behaviour

- Every verb button is out of the Tab order (`tabIndex={-1}`); its chord is the keyboard's way to it. A press keeps the focus where it was, so a click leaves the keyboard on whatever it was driving.
- A plain place's accessible name is the chord in words, then the verb ("Command C Copy"). A paired cap shows no label of its own, so its name comes from `legend.capName` ("Up Move Up") and its tooltip names the verb and the chord.
- The dock reads the modifiers from every key down and up on the window and lets go of all of them when the window loses focus, since a switch to another app never sends the key up.
- The strip lists every layer at once, so each verb shows its whole chord. A legend that shows one layer at a time sets `data-layer` and `data-fn` on `.keylegend` itself so its caps take the accent with the held layer; `KeyLegendStrip` leaves them at rest (`none`, `false`).

## Overflow helpers

`KeyLegendStrip` drops whole places that do not fit: the verbs wrap onto a second line the strip never shows, so it always ends on a complete key and verb. A legend of the app's own that collapses the tail into a chip can use:

- `fittingUnits(widths, available, chipWidth)`: how many places fit from the left, beside a chip of `chipWidth` once they do not all fit.
- `moreLabel(count, labels.legend)`: the chip's text (`+3`) and spoken name ("3 more shortcuts").
- `moreListAction(key, cursor, rows)`: what a key does in the chip's list: ↑ ↓ Home End move the cursor, Return or Space runs the row, Escape or Tab closes, a Command chord is left to the menu bar.

## Styling

The strip is 34px tall on `--surface-header` with a top border, inset 8px on both sides to line up with pane rows. Its caps and dock keys are the shared key cap (`docs/components/keychord.md`); with a layer held, the caps take `--accent-text` on `--accent-wash` in an `--accent-line` frame. Slots answer hover and press with the base sheet's quiet control recipe. Classes: `.keylegend`, `.keylegend-dock` with `.keylegend-key` (`.held` while down) and `.keylegend-dock-fn`, `.keylegend-row`, `.keylegend-verbs`, `.keylegend-pair` with `.keylegend-cap` and `.keylegend-pair-label`. The rules are unscoped, so the strip looks the same inside or outside the listing scope. The dock draws macOS's modifier icons in this version.

## Labels read

`legend`: `label` (the strip's name, "Keyboard shortcuts"), `verbs` (the verb group's name, "Verbs"), `capName(chord, verb)` for a paired cap, and `more(count)` through `moreLabel`. `keys` for chords in words and glyphs. Pair labels and verb labels are the app's, through props. See [labels](../labels.md).
