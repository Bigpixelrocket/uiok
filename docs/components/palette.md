# Palette (`@bigpixelrocket/uiok/palette`)

A command palette as components: `Palette`, the modal box over a backdrop, `PaletteQuery`, its query row, and its rows: `PaletteList` of `PaletteOption`s under `PaletteHeading`s, a `PaletteNote` for an empty list, and `PaletteNotes` with notes and a `PaletteFailure` under the list. The caller supplies the items, filters them, and keeps the cursor with the menu rules ([menu](menu.md)); every part is a component with props, so a palette needs no class name or raw element.

## Example

```tsx
import {
  Palette,
  PaletteList,
  PaletteNote,
  PaletteOption,
  PaletteQuery
} from '@bigpixelrocket/uiok/palette';
import { matchQuery, menuQueryRefused, moveMenuCursor } from '@bigpixelrocket/uiok/menu';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';
import { MarkedText } from '@bigpixelrocket/uiok/text';

const rowsFor = (query: string) =>
  commands
    .flatMap((command) => {
      const match = matchQuery(command.label, query);
      return match === null ? [] : [{ command, ...match }];
    })
    .sort((a, b) => b.score - a.score);

function CommandPalette({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<number | null>(0);
  const [bell, setBell] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = rowsFor(query);

  useLayoutEffect(() => inputRef.current?.focus(), []);

  return (
    <Palette label="Commands" onClose={onClose}>
      <PaletteQuery
        activeId={cursor === null ? undefined : `${listId}-${cursor}`}
        bell={bell}
        count={query === '' ? null : `${rows.length} of ${commands.length}`}
        inputRef={inputRef}
        label="Filter commands"
        listId={listId}
        placeholder="Type a command"
        refused={refused}
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          if (menuQueryRefused(query, next, rows.length, rowsFor(next).length)) {
            setBell((count) => count + 1);
            setRefused(next);
            return;
          }
          setRefused(null);
          setQuery(next);
          setCursor(0);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') setCursor(moveMenuCursor(cursor, 1, rows.length));
          if (event.key === 'ArrowUp') setCursor(moveMenuCursor(cursor, -1, rows.length));
          if (event.key === 'Enter' && cursor !== null) rows[cursor]?.command.run();
          // Nothing else in the palette takes the focus.
          if (event.key === 'Tab') event.preventDefault();
        }}
      />
      <PaletteList id={listId} label="Commands">
        {rows.map((row, index) => (
          <PaletteOption
            context={row.command.hint}
            cursor={index === cursor}
            id={`${listId}-${index}`}
            key={row.command.id}
            label={row.command.label}
            mark={<row.command.icon aria-hidden size={ICON_MD} />}
            name={<MarkedText positions={row.positions} text={row.command.label} />}
            onPick={row.command.run}
            onPoint={() => setCursor(index)}
            trail={<KeyChord chord={row.command.chord} />}
          />
        ))}
        {rows.length === 0 && <PaletteNote>No command matches.</PaletteNote>}
      </PaletteList>
    </Palette>
  );
}
```

The backdrop is `position: fixed` on `--z-dialog`. The box carries the listing scope (`.listing-root`), so a `Listing` or `Row` drawn inside keeps its look wherever the palette mounts.

## Props

### `Palette` (`PaletteProps`)

- `label`: the dialog's accessible name.
- `onClose`: called on Escape inside the box and on a press on the backdrop.
- `className`: classes added after `folder-menu palette listing-root`.
- `busy`: sets `aria-busy` while the palette waits on a request.
- `children`: the query row, the list, notes, and a legend.

### `PaletteQuery` (`PaletteQueryProps`)

- `inputRef`, `value`, `onChange`, `onKeyDown`: the field. The caller focuses it on open and maps its keys.
- `label`, `placeholder`: the field's accessible name and placeholder.
- `listId`, `activeId`: the listbox the field controls and the cursor row's id (`aria-activedescendant`).
- `count`: the count while a query narrows the list ("3 of 12"); null draws none.
- `refused`: the query the last refused keystroke would have made; while set, the row says why in the count's place.
- `bell`: the number of refused keystrokes so far; each increase rings the visual bell (`useBellBeat`).
- `level` (`PaletteLevel`: `title`, `onBack`, `disabled`): the level below the first the palette stands in, drawn as a chip before the field; a click steps back.
- `aside`: a tag at the field's end, such as what the rows act on.

### `PaletteList` (`PaletteListProps`)

- `id`: the listbox's id, which `PaletteQuery`'s `listId` names.
- `label`: the list's accessible name ("Runtimes", "PHP versions").
- `children`: `PaletteOption`s, `PaletteHeading`s, and a `PaletteNote` while it is empty.

### `PaletteOption` (`PaletteOptionProps`)

- `id`: the row's id, the field's `activeId` while it is the cursor.
- `name`: words, or `MarkedText` with the query's matches.
- The row's accessible name is every word it draws, in the order drawn: its `name`, its `context`, then its trail (a `KeyChord` by its words, `current`'s value after it), so the name a voice user speaks is the text on screen (WCAG 2.5.3). `label` stands in for the drawn name's words alone, its context and trail still read after it: pass it whenever `name` is `MarkedText`, which a screen reader may read split at the highlights.
- `mark`: the icon column's glyph (a `ProductMark`, a lucide icon).
- `context` and `contextKind` (`'sentence'` by default, `'path'`, `'command'`): what the row says after its name, one line, cut with an ellipsis and whole in its tooltip; a path gives way at its start.
- `trail`: the end column, a version or a count in the meta tone, or a `KeyChord`.
- `current`: draws a `CurrentDot` after the trail, its value what current means ("Installed").
- `checked`: the row is one of several picked together (the scripts a project includes). `true` draws the check mark in the icon column, the same mark a menu's setting wears, and `false` leaves the column empty; either way the row is an `option` with `aria-checked`, and `mark` is not drawn, so the column holds the tick alone. A press calls `onPick`, which toggles it. Absent, the row is a plain option.
- `cursor`: the cursor fill and bar.
- `disabled`: dimmed (`aria-disabled`), passed over by the pointer, its press refused; say why in `description`.
- `description`: read after the name (`aria-description`), for what the row does not draw, such as why it is disabled. The name already reads the context, the trail, and `current`, so a description never repeats them.
- `onPick`, `onPoint`: a press, and the pointer moving onto it (move the cursor there). Neither runs while it is disabled.
- `ref`: the row's element, to scroll the cursor row into view.

### `PaletteHeading`, `PaletteNote`, `PaletteNotes`, `PaletteFailure`

- `PaletteHeading` (`children`: the group's name): one row tall, drawn and not listed (`role="presentation"`).
- `PaletteNote` (`children`): a note in the interface face over the rows' names, two lines at most. In the list it says why the list is empty; in `PaletteNotes` it speaks for the list as a whole.
- `PaletteNotes` (`children`): the notes ruled off under the list; draw it only while it has something to say.
- `PaletteFailure` (`message`, `detail`): a failed pick under the list, the danger glyph, the message in strong words and its detail after, announced as an alert.

## Behaviour

- The box is `role="dialog"` with `aria-modal="true"`, so `MODAL_SELECTOR` and `watchOverlays` count it as open while it shows.
- Escape anywhere in the box calls `onClose`, except during an input method's composition. A field handler that wants Escape to clear a query first calls `preventDefault()` and `stopPropagation()`.
- Return in the query field (`PaletteQuery`) has its default cancelled before the caller's `onKeyDown` runs, outside an input method's composition, so a caller that runs a command and closes on Return, handing the focus back to the button that opened the palette, does not see that button clicked by the same key and the palette opened again. Return on a button inside the palette still presses it.
- A press on the backdrop itself closes; a press inside the box (a row, the chip, a legend slot) is cancelled so the focus stays in the field. A press in the field is left alone, so the caret lands where it is pressed.
- The level chip takes no focus (`tabIndex={-1}`); its tooltip names ← as the key that steps back, which the caller maps.
- Checkable rows: Return toggles the cursor row, as a press does, and leaves the palette open, so the caller's `onKeyDown` calls the row's `onPick` for Return whether the row runs or ticks. Space cannot toggle: the field holds the focus and Space types into the query. The palette's own verb over the ticked rows (Add, Install) is a row of its own after them, or a chord such as ⌘Return in its legend, never Return.
- Tab is not contained: the frame leaves Tab alone, so from the field (the box's only stop) it would move the focus behind the palette. The caller's `onKeyDown` prevents Tab, as in the example, or contains it when it adds more stops.

## Styling

On top of the menu look ([menu](menu.md)):

- `.palette-backdrop`: the full-window backdrop, `--scrim` frosted with `--frost` (a palette replaces the page for a moment, as a frosted dialog does), the box anchored 104px from the top.
- `.folder-menu.palette`: 600px wide, with the lit top edge and `--shadow-modal`; the options list grows to seventeen whole rows and fades the edge that has more rows on its own.
- `.palette-text` holds a row's `.row-name` and `.palette-context`, which gives way at its start (a path) or, with `.palette-sentence`, at its end (a sentence, in the interface face), or with `.palette-command` at its end in the monospace face (a command line). Wrap a path's text in `<bdi>`.
- `.palette-trail` and `.palette-meta`: a row's end; `.palette-meta` is in the meta tone, and on the cursor row it and `.palette-context` take `--text-on-surface`. Put a `KeyChord` in `.palette-trail` for a command's chord; it is drawn as key caps.
- `.palette-notes` with `.folder-menu-note` lines under the list; `.palette-failure` a status line: the danger glyph in the icon column, then words in the text colour.
- `.palette-refused`: the refusal where the count stands, in the count's own `--text-dim`; the bell beat says it was refused, so the words take no tone. The notes under the list (`.folder-menu-note`, `.palette-failure`) can be selected and copied.
- `.palette-level`: the level chip, an accent wash with an accent line, deeper on hover; while held it takes the base sheet's pressed look, which outranks hover.
- A dialog's key legend (`.dialog-legend`) placed last in the box runs its hairline to the box's edges.

## Labels read

`palette.back`, `palette.backFrom(level)`, and `palette.nothingMatches(query)` ([labels](../labels.md)).
