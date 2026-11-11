# KeyChord (`@bigpixelrocket/uiok/keychord`)

A keyboard chord drawn as a row of key caps, with the whole chord in words as its accessible name.

## Example

```tsx
import { KeyChord } from '@bigpixelrocket/uiok/keychord';

<KeyChord chord={{ key: 'n', meta: true, shift: true }} /> // ⇧ ⌘ N, named "Shift Command N"
<KeyChord chord={{ key: 'Escape' }} />                     // esc
<KeyChord chord={{ key: 'k', meta: true }} omit={['meta']} /> // K, still named "Command K"
```

## Props (`KeyChordProps`)

| Prop        | Type                       | Meaning                                                                                                             |
| ----------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `chord`     | `Chord`                    | The chord; an empty `key` draws the modifiers alone                                                                 |
| `omit`      | `readonly LayerModifier[]` | Modifiers shown elsewhere (a legend's anchor), left out of the drawing but not the name                             |
| `tone`      | `KeyChordTone`             | `accent` (changed from its default), `lit` (the chord Return runs), `quiet` (cannot change); written as `data-tone` |
| `recording` | `boolean`                  | The chord is being recorded: `data-state="recording"`, an accent outline round the cap                              |

## Rendering

- A `<kbd class="keychord">` with one `.key` per part in macOS order.
- Modifiers, arrows, Return, Backspace, Tab, Home, End, Page Up/Down, and `/` are lucide icons (`.key-icon`) on one 12px grid.
- Escape and Space print their cap words (`.key-word`); any other key prints its capital (`.key-letter`).
- The chord has no frame of its own. Where it is drawn as a key, put `keycap` on any element around it: every `.keychord` inside becomes the library's one key cap, 18px tall and at least 20px wide, a `--border-strong` frame with a 2px foot and a 1px pad above it, on `--bg-panel`. The pad leaves an even 14px face, so the 12px glyph box sits on whole pixels at 1x as well as 2x. A lit cap (a held dock key, a dialog's lit Return) keeps its foot in `--key-foot-shade`, darker than its face in every theme. The key legend, a dialog legend's slots, and the filter's escape key use the same cap. The cap rule weighs one class, so a host's state rule (an accent layer) changes its colours without restating it.
- Tones, on a cap: `accent` is an `--accent-line` frame on `--accent-wash`; `lit` is the solid `--accent` face with `--on-accent` glyphs and the `--key-foot-shade` foot, the same as a dialog legend's primary cap; `quiet` sets the glyphs in `--text-dim` (outside a cap too); `recording` adds a 1px `--accent` outline 1px outside the frame. A host sets the prop instead of restating these.
- Icons are 12px (`--icon-sm`); letters and key words (esc, space) are both 10px (`--font-size-key`) mono.

## Labels read

`keys`: `modifiers` and `names` for the accessible name, `escapeCap` and `spaceCap` for the cap words. See [labels](../labels.md).
