# KeyChord (`@bigpixelrocket/uiok/keychord`)

A keyboard chord drawn as a row of key caps, with the whole chord in words as its accessible name, and the shortcut index that lists every key a window answers.

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
- Tones, on a cap: `accent` is a `--current-ring` frame on `--accent-wash` (the opaque accent ring, 3:1 on the panel, since the frame is the cap's only edge); `lit` is the solid `--accent` face with `--on-accent` glyphs and the `--key-foot-shade` foot, the same as a dialog legend's primary cap; `quiet` sets the glyphs in `--text-dim` (outside a cap too) and, on a cap, draws a key with no travel: a `--border` frame and no 2px foot, at the same height; `recording` adds a 1px `--accent` outline 1px outside the frame. A host sets the prop instead of restating these.
- Icons are 12px (`--icon-sm`); letters and key words (esc, space) are both 10px (`--font-size-key`) mono.

## Several chords (`KeyChords`)

Two or more chords that run one verb (`KeyChordsProps`: `chords`, `tone`), each its own `KeyChord`, parted by the `keys.or` word: drawn quiet between them (`.keychords-or`, `--text-dim` at the caption size) and read between their names, "Shift Command N or Command N", so two chords never run together as "⇧⌘N⌘N". They wrap whole, never inside a chord. One chord draws alone; none draws nothing. Put `keycap` on an element round it to draw each chord as a key cap.

```tsx
<span className="keycap">
  <KeyChords
    chords={[
      { key: 'n', meta: true, shift: true },
      { key: 'n', meta: true }
    ]}
  />
</span>
```

## Shortcut index (`ShortcutIndex`, `ShortcutGroup`, `ShortcutRow`)

Every key a window answers, in groups of verbs, each verb with the chords that run it now: the index a window opens on `?`. One grid runs down the whole index, each group and each row a subgrid of it, so the chords stand in one column at the index's end from the first group to the last, whatever each group's longest verb.

```tsx
import { ShortcutGroup, ShortcutIndex, ShortcutRow } from '@bigpixelrocket/uiok/keychord';

<ModalDialog
  frosted
  icon={Keyboard}
  labelId="keys"
  legend={{ leave: { label: 'Close' } }}
  onCancel={close}
  size="lg"
  title="Keyboard Shortcuts"
>
  <FieldBox aria-label="Find" glyph={Search} onChange={setQuery} type="search" value={query} />
  <ShortcutIndex label="Keyboard shortcuts">
    {groups.map((group) => (
      <ShortcutGroup key={group.id} title={group.title}>
        {group.rows.map((row) => (
          <ShortcutRow
            changed={row.custom}
            chords={row.chords}
            key={row.id}
            none="No shortcut"
            verb={row.label}
          />
        ))}
      </ShortcutGroup>
    ))}
  </ShortcutIndex>
</ModalDialog>;
```

| Part            | Props                                                                | Draws                                                                                                               |
| --------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `ShortcutIndex` | `label` (its accessible name, a region), `children`                  | `.shortcut-index`: the grid, a verb column taking the room left and the chord column at its widest chords           |
| `ShortcutGroup` | `title` (an overline, which names the group as a region), `children` | `section.shortcut-group` with `dl.shortcut-group-rows`, a hairline above every group but the first                  |
| `ShortcutRow`   | `verb`, `detail`, `chords` (`Chord[]`), `none`, `changed`, `dim`     | `.shortcut-row`: the verb (`dt`, its `detail` in a quieter line under it), the chords (`dd.shortcut-chords.keycap`) |

A row's chords are `KeyChords` on the library's key cap, at the column's end, several parted by "or" and wrapping within it; each is named in words for assistive technology. With no chord the column says `none` (".shortcut-none", dim). `changed` draws the caps in the `accent` tone (chords changed from the defaults); `dim` sets a verb not available where the index was opened a tone down (`.shortcut-row.dim`). A find field above the index and the narrowing it does are the host's; say "no match" with a `PageNote`.

## Labels read

`keys`: `modifiers` and `names` for the accessible name, `escapeCap` and `spaceCap` for the cap words, `or` between `KeyChords`' chords. See [labels](../labels.md).
