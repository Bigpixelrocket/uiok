# Palette (`@bigpixelrocket/uiok/palette`)

A command palette's frame: `Palette`, the modal box over a backdrop, and `PaletteQuery`, its query row. The caller supplies the commands, filters them, keeps the cursor, and draws the rows, any notes, and a key legend inside, using the menu parts ([menu](menu.md)).

## Example

```tsx
import { Palette, PaletteQuery } from '@bigpixelrocket/uiok/palette';
import { matchQuery, menuQueryRefused, moveMenuCursor } from '@bigpixelrocket/uiok/menu';
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
      <div className="folder-menu-options" id={listId} role="listbox">
        {rows.map((row, index) => (
          <div
            aria-selected={index === cursor}
            className={index === cursor ? 'folder-menu-option cursor' : 'folder-menu-option'}
            id={`${listId}-${index}`}
            key={row.command.id}
            onClick={row.command.run}
            role="option"
          >
            <span className="row-icon">{row.command.icon}</span>
            <span className="palette-text">
              <span className="row-name">
                <MarkedText positions={row.positions} text={row.command.label} />
              </span>
              <span className="palette-context palette-sentence">{row.command.hint}</span>
            </span>
            <span className="palette-trail">
              <span className="palette-meta">{row.command.chord}</span>
            </span>
          </div>
        ))}
      </div>
    </Palette>
  );
}
```

The backdrop is `position: fixed` on `--z-dialog`; the palette needs no scope.

## Props

### `Palette` (`PaletteProps`)

- `label`: the dialog's accessible name.
- `onClose`: called on Escape inside the box and on a press on the backdrop.
- `className`: classes added after `folder-menu palette`.
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

## Behaviour

- The box is `role="dialog"` with `aria-modal="true"`, so `MODAL_SELECTOR` and `watchOverlays` count it as open while it shows.
- Escape anywhere in the box calls `onClose`, except during an input method's composition. A field handler that wants Escape to clear a query first calls `preventDefault()` and `stopPropagation()`.
- A press on the backdrop itself closes; a press inside the box (a row, the chip, a legend slot) is cancelled so the focus stays in the field. A press in the field is left alone, so the caret lands where it is pressed.
- The level chip takes no focus (`tabIndex={-1}`); its tooltip names ← as the key that steps back, which the caller maps.
- Tab is not contained: the frame leaves Tab alone, so from the field (the box's only stop) it would move the focus behind the palette. The caller's `onKeyDown` prevents Tab, as in the example, or contains it when it adds more stops.

## Styling

On top of the menu look ([menu](menu.md)):

- `.palette-backdrop`: the full-window backdrop, `--scrim` frosted with `--frost` (a palette replaces the page for a moment, as a frosted dialog does), the box anchored 104px from the top.
- `.folder-menu.palette`: 600px wide, with the lit top edge and `--shadow-modal`; the options list grows to seventeen whole rows. Add `.scroll-fade` to the list to fade the edge that has more rows.
- `.palette-text` holds a row's `.row-name` and `.palette-context`, which gives way at its start (a path) or, with `.palette-sentence`, at its end (a sentence). Wrap a path's text in `<bdi>`.
- `.palette-trail` and `.palette-meta`: a row's end, in the meta tone; on the cursor row they and `.palette-context` take `--text-on-surface`. Put a `KeyChord` in `.palette-trail` for a command's chord.
- `.palette-notes` with `.folder-menu-note` lines under the list; `.palette-failure` in `--danger-text`.
- `.palette-refused`: the refusal where the count stands, in `--warning-text`.
- `.palette-level`: the level chip, an accent wash with an accent line, deeper on hover; it takes the base sheet's pressed look.
- A dialog's key legend (`.dialog-legend`) placed last in the box runs its hairline to the box's edges.

## Labels read

`palette.back`, `palette.backFrom(level)`, and `palette.nothingMatches(query)` ([labels](../labels.md)).
