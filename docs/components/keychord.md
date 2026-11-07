# KeyChord (`uiok/keychord`)

A keyboard chord drawn as a row of key caps, with the whole chord in words as its accessible name.

## Example

```tsx
import { KeyChord } from 'uiok/keychord';

<KeyChord chord={{ key: 'n', meta: true, shift: true }} /> // ⇧ ⌘ N, named "Shift Command N"
<KeyChord chord={{ key: 'Escape' }} />                     // esc
<KeyChord chord={{ key: 'k', meta: true }} omit={['meta']} /> // K, still named "Command K"
```

## Props (`KeyChordProps`)

| Prop    | Type                       | Meaning                                                                                 |
| ------- | -------------------------- | --------------------------------------------------------------------------------------- |
| `chord` | `Chord`                    | The chord; an empty `key` draws the modifiers alone                                     |
| `omit`  | `readonly LayerModifier[]` | Modifiers shown elsewhere (a legend's anchor), left out of the drawing but not the name |

## Rendering

- A `<kbd class="keychord">` with one `.key` per part in macOS order.
- Modifiers, arrows, Return, Backspace, Tab, Home, End, Page Up/Down, and `/` are lucide icons (`.key-icon`) on one 12px grid.
- Escape and Space print their cap words (`.key-word`); any other key prints its capital (`.key-letter`).
- The chord has no frame of its own; a surface that wants a key cap draws the border around `.keychord`.

## Labels read

`keys`: `modifiers` and `names` for the accessible name, `escapeCap` and `spaceCap` for the cap words. See [labels](../labels.md).
