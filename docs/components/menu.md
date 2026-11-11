# Menu (`@bigpixelrocket/uiok/menu`)

The parts every filtered menu and palette shares: a fuzzy matcher, the rules for a refused keystroke and the cursor's moves, the trail of levels opened in place, the visual bell, and the menu look. UIOK draws no menu component of its own; the caller renders the rows with these classes and owns the state. `Palette` ([palette](palette.md)) is built on the same parts.

## Example

```tsx
import {
  matchQuery,
  menuQueryRefused,
  moveMenuCursor,
  useBellBeat
} from '@bigpixelrocket/uiok/menu';
import { FilterIcon } from '@bigpixelrocket/uiok/filter';
import { MarkedText } from '@bigpixelrocket/uiok/text';

const rowsFor = (query: string) =>
  items.flatMap((item) => {
    const match = matchQuery(item.name, query);
    return match === null ? [] : [{ item, positions: match.positions, score: match.score }];
  });

function FolderMenu() {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<number | null>(0);
  const [bell, setBell] = useState(0);
  const beat = useBellBeat(bell);
  const rows = rowsFor(query);

  return (
    <div className="folder-menu" data-overlay>
      <div className={beat === null ? 'folder-menu-query' : `folder-menu-query bell-${beat}`}>
        <FilterIcon />
        <input
          aria-label="Filter"
          value={query}
          onChange={(event) => {
            const next = event.target.value;
            if (menuQueryRefused(query, next, rows.length, rowsFor(next).length)) {
              setBell((count) => count + 1);
              return;
            }
            setQuery(next);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') setCursor(moveMenuCursor(cursor, 1, rows.length));
            if (event.key === 'ArrowUp') setCursor(moveMenuCursor(cursor, -1, rows.length));
          }}
        />
      </div>
      <div className="folder-menu-options" role="listbox">
        {rows.map((row, index) => (
          <div
            className={index === cursor ? 'folder-menu-option cursor' : 'folder-menu-option'}
            key={row.item.id}
            role="option"
          >
            <span className="row-icon" />
            <span className="row-name">
              <MarkedText positions={row.positions} text={row.item.name} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
```

Draw it anywhere, positioned relative to what opened it; the menu look needs no scope.

## API

### Matching

- `matchQuery(candidate, query)`: a `FuzzyMatch` (`score`, `positions`) or null. fzf-style: whitespace-separated terms are ANDed; `!term` excludes, `'term` wants a contiguous run, `^term` a prefix, `term$` a suffix, `^term$` the whole candidate. A lowercase term ignores case; an uppercase character makes its term case-sensitive. Consecutive runs, word starts (after `/ \ - _ .` or a space), and camelCase starts score higher. An empty query matches everything at zero. `positions` are UTF-16 code unit indices, ascending, ready for `MarkedText`.
- `hasQueryTerms(query)`: whether the query holds a term once its operators are stripped.
- `hasNegativeTerms(query)`: whether it excludes with `!`.

### Menu rules (pure)

- `menuQueryRefused(previous, next, rowsBefore, rowsAfter)`: whether `next` should be refused because it would empty a list that `previous` filled. A shorter query, an excluding one, and a list with no rows yet are never refused.
- `moveMenuCursor(cursor, delta, length)`: the cursor moved and clamped; with none yet, down enters at the top and up at the bottom; null for an empty list.
- `pickableCursor(items, pointed)` and `movedPickableCursor(items, cursor, delta)`: the same over `PickableRow`s (`key`, `taken`), passing over taken rows; the cursor follows its row by key and moves on when that row becomes taken.
- Levels opened in place: `enteredLevel(trail, level, from)`, `trailLevel(trail)`, `leftLevel(trail)` (a `LevelReturn` with the row to land on, or null at the top), and `returnedCursor(keys, pointed)`. A `LevelStep` remembers the key of the row that opened it, so stepping back lands on that row at every depth.

### Visual bell

- `useBellBeat(bell)`: given a count of refused keystrokes, `0` or `1` (the count's parity) for 300 ms after each refusal, null at rest. Add `bell-0` or `bell-1` to `.folder-menu-query`: the field shakes and flashes the danger colour, and alternating the class restarts the animation for every refusal. Under `prefers-reduced-motion` only the colour flashes.

## Keyboard behaviour

The caller maps keys. The usual mapping: ↑ and ↓ move the cursor (`moveMenuCursor`), Return runs the cursor row, Escape clears a typed query and then closes. Keep the focus in the field (cancel `mousedown` on rows) so typing keeps filtering. A menu that floats over the page carries `data-overlay`, so the keyboard guard (`OVERLAY_SELECTOR`, `watchOverlays`) treats it as open.

## Styling

The rules weigh one class and need no scope, so a menu reads the same in a listing, a dialog, or a terminal; an app adjusts a piece with one scoped selector (`.listing-root .folder-menu`).

- `.folder-menu`: the floating surface, absolutely placed 4px below its offset parent on `--z-menu`, 300px wide by default, in monospace 13px, with the lit top edge and `--shadow-popover`.
- `.folder-menu-query`: the query row, with `.filter-icon`, an `input`, and `.folder-menu-count`; `bell-0` / `bell-1` ring it.
- `.folder-menu-options`: the scrolling list, nine whole rows tall at most, with a thin scrollbar; it fades the edge that has more rows on its own (the base sheet's scroll fade), so a caller adds nothing. Its `.folder-menu-option` rows sit on the icon column (`--icon-column`), the name, and an end column (a `KeyChord`, drawn as key caps, or a count). `.cursor` marks the cursor row with the cursor fill and a 2px accent bar at its leading edge; a row with `aria-disabled="true"` is faded and never takes the cursor's look.
- `.entry-menu-heading`: a group's name in the small uppercase heading (the base sheet's `.overline`) with a hairline after it, one row tall, so a list with headings still ends on a whole row.
- `.folder-menu-note`: a dim sentence in the interface face, its text over the rows' names, for an empty or loading list or a reason.
- The typed query is `--accent-text`, the caret `--accent`; the placeholder is the base sheet's.
- `.name-hit` ([text](text.md)) tints a matched character.

The keyframes `row-nudge-a`, `row-nudge-b`, `query-refused-a`, and `query-refused-b` are global, so an app's own filter field or cursor row can ring on them too.

## Labels read

None.
