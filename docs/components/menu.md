# Menu (`@bigpixelrocket/uiok/menu`)

`Menu`, a menu of verbs or places opened at a point or dropped from an element, and the parts every filtered menu and palette shares: a fuzzy matcher, the rules for a refused keystroke and the cursor's moves, the trail of levels opened in place, the visual bell, and the menu look. `Palette` ([palette](palette.md)) is built on the same parts, and `PanePathBar`'s `siblings` ([pane](pane.md)) opens a `Menu` from the last crumb.

## Menu

```tsx
import { Menu } from '@bigpixelrocket/uiok/menu';
import { Copy, Trash2 } from 'lucide-react';

function RowActions({ at, onClose }: { at: { x: number; y: number }; onClose: () => void }) {
  return (
    <Menu
      at={at}
      compact
      entries={[
        { id: 'copy', label: 'Copy Path', icon: Copy, chord: { key: 'c', meta: true, alt: true } },
        { id: 'stop', label: 'Stop', disabled: true, tip: 'Not running' },
        { kind: 'separator' },
        { id: 'remove', label: 'Remove…', icon: Trash2, danger: true }
      ]}
      label="Actions"
      onClose={onClose}
      onPick={(id) => {
        run(id);
        onClose();
      }}
    />
  );
}
```

| Prop      | Type                                    | Use                                                                                                                                     |
| --------- | --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `label`   | `string`                                | The menu's accessible name                                                                                                              |
| `entries` | `readonly MenuEntry[]`                  | Items, `{ kind: 'submenu', … }`, `{ kind: 'separator' }`, and `{ kind: 'heading', label }`, in order                                    |
| `at`      | `MenuPoint` (`x`, `y`)                  | Opens at a point in window coordinates (a secondary click)                                                                              |
| `anchor`  | `HTMLElement \| null`                   | Drops from an element, under its leading edge, when `at` is absent; a press on the element does not close the menu, so it can toggle it |
| `initial` | `string \| null`                        | The item the cursor starts on (the current place), in the menu itself, not a submenu; the first that can run when absent                |
| `compact` | `boolean`                               | The small size, for short commands (`.folder-menu-compact`)                                                                             |
| `dir`     | `'ltr' \| 'rtl'`                        | The direction it reads in; absent, the direction of `anchor`, or of where it is rendered, as it opens                                   |
| `onPick`  | `(id: string) => void`                  | Runs an item that can run, a submenu's included; the caller closes the menu                                                             |
| `onClose` | `(by: 'keyboard' \| 'pointer') => void` | Escape or Tab (`keyboard`: put the focus back), or a press or focus elsewhere (`pointer`)                                               |

An item (`MenuItemEntry`) has `id`, `label`, and any of: `icon` (a lucide glyph) or `mark` (any node) in the icon column, `chord` drawn as key caps, `danger` (the danger tone, its glyph with it), `disabled` (dimmed and passed over; say why in `tip`), `checked` (a `menuitemcheckbox` with the check mark when true), `current` (a `CurrentDot` after the words, named by its value), and `tip` (its tooltip and description).

The menu is drawn through a portal on the document's body (or the element shown full screen), fixed where `placeMenu` puts it on `--z-dialog-popover`, so no pane or dialog clips it. It takes the focus and holds its keys (`menuKeyAction(event, rtl)`: ↑ ↓ over the items that run, Home and End, Return and Space run, → and ← into and out of a submenu, Escape closes one level and Tab the whole menu), which travel no further. `data-native-keyboard` keeps the browser-key guard and a page's own key handlers out (`isNativeKeyboardTarget`), and `data-overlay` marks it open for the keyboard guard. A menu taller than the window less `placeMenu`'s margins (`MENU_MARGIN`, `--space-2`) is capped at that height and scrolls; it opens with its cursor's item in view, and the keys keep it there. A press on it keeps the focus; a press or a focus anywhere else closes it.

`placeMenu(from, size, viewport)` is the placement, pure: from `{ point }` it hangs down and right, opening upward with no room below; from `{ box }` it starts under the box's leading edge, `MENU_MARGIN` (4px) below, standing over it with no room below; from `{ beside, rtl }` (a submenu's item) it stands at the item's inline-end side, its first item level with the item, on the other side when the window has no room on that one, and on the roomier side when neither has room; every way it stays `MENU_MARGIN` inside the window.

### Submenus

An entry `{ kind: 'submenu', id, label, entries }` (`MenuSubmenuEntry`, with `icon` or `mark`, `disabled`, and `tip` as an item has) opens a second menu beside it, as a file manager's "Copy As" opens Path and File URL. It ends in a chevron where a chord would stand and runs nothing itself; its submenu's items run through the same `onPick`, so every id in the menu, its submenus' included, is unique.

```tsx
<Menu
  at={at}
  compact
  entries={[
    { id: 'open', label: 'Open', icon: FolderOpen },
    {
      kind: 'submenu',
      id: 'copy-as',
      label: 'Copy As',
      icon: Copy,
      entries: [
        { id: 'copy-path', label: 'Path' },
        { id: 'copy-url', label: 'File URL' }
      ]
    }
  ]}
  label="Actions"
  onClose={onClose}
  onPick={run}
/>
```

- **One level.** A submenu's `entries` are `MenuLeafEntry`s (items, separators, headings), so a submenu inside a submenu does not type-check.
- **Keys.** On a submenu item, → (← in a right-to-left page), Return, or Space opens the submenu with the keys and the focus in it, its cursor on its first item that can run. ← goes back to the item, Escape closes the submenu alone (a second Escape closes the menu), and Tab closes the whole menu. ↑ ↓, Home, and End move the cursor in whichever of the two holds the keys; a move in the menu closes a submenu the pointer opened.
- **Pointer.** Resting on the item or pressing it opens the submenu without taking the keys, and no item of it is the cursor yet; moving over the submenu gives it the keys, its cursor brought into view. The pointer may cross other items on its way in: the submenu stays a quarter of a second, and closes only if the pointer rests on another item that long; leaving the menu altogether keeps it. A disabled submenu item never opens.
- **Direction.** Drawn on the body, which may read the other way, both menus wear the direction of what opened them (`dir`, else `anchor`, else the place the `Menu` is rendered in, read from a hidden marker drawn only then), so → and ←, the submenu's side, and the chevron agree.
- **Entries changing.** A submenu whose item the host disables or removes closes with it, and the next Escape closes the menu. A menu the host moves (a new `at` or `anchor`) takes the keys back, and an open submenu moves with its item, changing sides when the direction turns.
- **Placement.** The submenu is a second `.menu-popup` beside its item, through the same portal, placed by `placeMenu`'s `{ beside }` and placed again when the window resizes.
- **Accessibility.** The item is a `menuitem` with `aria-haspopup="menu"`, `aria-expanded`, and, while open, `aria-controls` naming the submenu, which is a `menu` labelled by its item (`aria-labelledby`), with its own `aria-activedescendant`. A press or a focus in either keeps the menu open; one anywhere else closes both.
- **No query.** `Menu` has no type-to-filter, so a submenu has nothing to match. A filtered surface that opens a level in place (a palette) keeps a trail of levels instead (`enteredLevel`, `leftLevel`); a submenu stands beside its menu and needs none.

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

- `.folder-menu`: the floating surface, absolutely placed 4px below its offset parent on `--z-menu`, 300px wide by default, in monospace at `--menu-font-size` (13px, the body size), with the lit top edge and `--shadow-popover`. Add `.folder-menu-compact` for a menu of short commands opened from a tool (a column chooser, a row's actions, a legend's overflow): it sets `--menu-font-size` to the small size. Size a menu by that class, never by restating its face or size.
- `.folder-menu-query`: the query row, with `.filter-icon`, an `input`, and `.folder-menu-count`; `bell-0` / `bell-1` ring it.
- `.folder-menu-options`: the scrolling list, nine whole rows tall at most, with a thin scrollbar; it fades the edge that has more rows on its own (the base sheet's scroll fade, one row deep, so the last whole row fades through its words), so a caller adds nothing. Its `.folder-menu-option` rows sit on the icon column (`--icon-column`), the name, and an end column (a `KeyChord`, drawn as key caps, or a count). `.cursor` marks the cursor row with the cursor fill and a 2px accent bar at its leading edge; a row with `aria-disabled="true"` is faded and never takes the cursor's look. The cursor row is the menu's focus mark: the menu and a list focused to take the keys draw no focus ring.
- `.entry-menu-heading`: a group's name in the small uppercase heading (the base sheet writes `.overline` and this class as one recipe) with a hairline after it, one row tall, so a list with headings still ends on a whole row.
- Desktop menu looks, all from attributes the row already carries: `aria-checked="true"` draws a check mark in the row's icon column (in place of its icon) for a setting that is on or the one chosen of a group; `aria-haspopup="menu"` ends the row in a chevron at its trailing edge for a row that opens a submenu (give it no chord), pointing left in a right-to-left page, where the submenu opens on the left; `aria-disabled="true"` fades the row, and the reason it cannot act goes in its tooltip (`title`).
- `.folder-menu-separator`: a plain hairline between groups that need no name, with a small space above and below (`role="presentation"`, or `role="separator"` in a `Menu`).
- `.folder-menu.menu-popup`: a `Menu`'s surface, fixed on `--z-dialog-popover`, as wide as its longest item (180px at least, 480px at most); `.menu-label` holds an item's words (`.menu-label-text`, cut with an ellipsis) and its current dot.
- `.folder-menu-note`: a dim note in the interface face, its text over the rows' names, for an empty or loading list or what a key does. It explains a state, so it wraps to two lines before it is cut; past two lines it is cut with an ellipsis, so pass its whole text as a tooltip too. Say why one row cannot be picked in that row's tooltip.
- Nothing animates: a menu is there on the frame it opens and gone on the frame it closes, and its rows change at once. Only the visual bell moves, because it reports something.
- The typed query is `--accent-text`, the caret `--accent`; the placeholder is the base sheet's.
- `.name-hit` ([text](text.md)) tints a matched character.

The keyframes `row-nudge-a`, `row-nudge-b`, `query-refused-a`, and `query-refused-b` are global, so an app's own filter field or cursor row can ring on them too.

## Labels read

None.
