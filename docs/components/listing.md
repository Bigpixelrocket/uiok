# Listing (`@bigpixelrocket/uiok/listing`)

Tables in the listing look: a ruled column strip over 24px rows in the monospace face, a cursor row that the keys and the pointer share, and cells for states, paths, and terminal output. `CurrentDot` marks the current item in a list. Panes, their path bar, status line, and compact controls are in [pane](pane.md); the same stylesheet draws both.

## The listing scope

Every rule applies under `.listing-root`. Put the class on the element that holds your panes, beside your own class:

```html
<section class="my-view listing-root">…</section>
```

Rules are scoped with `:where(.listing-root)`, so each weighs one class less than your own `.my-view .row`. Adjust one piece with a single scoped rule, in whatever order the stylesheets load. The compact controls (crumbs, the path star, `QuietAction`, `RowIconAction`, strip links) are the exception: their look belongs to their own class, so they look the same outside the scope. The scope's metrics are custom properties on `.listing-root`:

| Property                | Default | Meaning                                                                         |
| ----------------------- | ------- | ------------------------------------------------------------------------------- |
| `--pane-columns-height` | `22px`  | The sticky column strip's height; a row's `scroll-margin-top` clears it         |
| `--pane-path-height`    | `26px`  | The path bar's row                                                              |
| `--pane-column-gap`     | `1.5ch` | The gutter before each column after the name; the strip's rule stands in it     |
| `--pane-row-inset`      | `8px`   | The room a row and the strip keep at either edge                                |
| `--pane-name-floor`     | `14ch`  | The least the name column gives way to before the list scrolls sideways         |
| `--pane-pin-ground`     | surface | What a pinned action column (`.pane-pin-end`) paints under its cells            |
| `--pane-grid`           |         | A listing's grid template, set inline by `Listing` and `WellColumn` from `grid` |

## Example

A `Listing` takes the listing's monospace face from an enclosing `.pane-list`; outside one it inherits the surrounding font.

```tsx
import { ACTION_COLUMN, Cell, column, Listing, Row, StateMark } from '@bigpixelrocket/uiok/listing';
import { QuietAction } from '@bigpixelrocket/uiok/pane';

<div className="listing-root">
  <div className="pane-list">
    <Listing
      columns={[
        { label: 'State' },
        { label: 'Size', align: 'right', sort },
        { label: 'Action', hidden: true }
      ]}
      grid={`var(--icon-column) minmax(min(var(--pane-name-floor), 100%), 1fr) ${column(12)} ${column(8)} ${ACTION_COLUMN}`}
      title="Services"
    >
      {services.map((service) => (
        <Row key={service.id} name={service.name} onOpen={() => open(service)} rowKey={service.id}>
          <Cell>
            <StateMark tone={service.tone} word={service.state} />
          </Cell>
          <Cell align="right">{service.size}</Cell>
          <Cell className="pane-action-cell">
            <QuietAction
              icon={Play}
              label={`Start ${service.name}`}
              onClick={() => start(service)}
              verb="toggle"
              word="Start"
            />
          </Cell>
        </Row>
      ))}
    </Listing>
  </div>
</div>;
```

## Components

- `Listing` (`ListingProps`): `title` (the strip's first label), `label` (the table's accessible name, `title` by default), `grid` (the `--pane-grid` template, or a function of the row links' look), `columns` (`ListingColumn[]`), `className`, `empty` (a line said instead of the rows; the listing is then a `section`, not a table), `titleSort` and `titleLabel` (the first column's sort and label), and the rows.
- `Strip` (`StripProps`): the ruled column strip alone, for a section over something that is not rows. `table` makes it a header row, `heading` makes its name an `h3`.
- `ListingColumn`: `label` (the column's label and key), `hidden` (said to screen readers only, as over an action column), `align: 'right'` (numbers), `control` (a control in the label's place, such as a `.pane-strip-link` "Update all"), and `sort` (`ColumnSort`: `direction` (`SortDirection`: `'asc' | 'desc' | null`), and `onSort`).
- `Row` (`RowProps`): `rowKey` (its `data-row-key`), `mark` (the icon), `name`, `nameClass`, `className`, `onOpen` (a click anywhere but its controls), `tabbable` (keep its controls in the Tab order), `focusable` and `entry` (the row itself is a Tab stop).
- `Cell` (`CellProps`): `align`, `className`, and `tip`, the whole text of a cell cut short, as its tooltip and accessible description.
- `StateMark` (`StateMarkProps`): a mark in the state's tone (`StateTone`) and its word; `busy` draws a spinner, the same turning ring as `RunHeader`'s, instead of the mark. Each tone has its own shape, so two tones whose hues meet in a theme still differ: `ready` a dot, `warning` a diamond, `danger` a square, `busy` a heavy accent ring (it pulses where motion is allowed), `muted` a thin grey ring. A word wider than its column ends in an ellipsis, its whole text in its tooltip.
- `PathCell` (`PathCellProps`): a path whose folders give way before its name. It is a cell itself: put it in the row as it is, never inside a `Cell`, whose gutter it would add a second time. `nameClassName` colours the name by its kind; `pathParts(path).base` is the name it draws.
- `WellColumn` (`WellColumnProps`): a strip over a terminal-coloured well, full height. The child draws the well, usually `<pre className="pane-well">`. `label` makes it a region.
- `CurrentDot` (`CurrentDotProps`): a neutral dot one character after a label, named and titled by `label`.

## Column widths

A listing with rows lays its strip and every row on one grid (CSS subgrid), so a track sized by its content (`auto`, `max-content`) takes its widest cell across all rows and the strip, and every label stands over its values.

Give the name its floor, `minmax(min(var(--pane-name-floor), 100%), 1fr)`, so it keeps a readable width (14 characters) at a narrow pane while the other columns keep theirs; the list then scrolls sideways rather than cutting every name to one letter. The default grid and `WellColumn` use this track. A `.pane-list` fades its foot and a side it scrolls to over 12px while more lies past that edge; its column strip never fades.

Where the listing scrolls sideways inside a box that is not a `.pane-list` (a page that scrolls as a whole), add `pane-pin-end` to the `Listing`'s `className`: its last column, the actions, stays at the scroller's end while the columns before it scroll under, with a hairline on its leading edge and a `--space-6` fade over the words sliding under it while any do. Each pinned cell fills its row's height, so the hairline runs unbroken, and the strip's cell over them is a square band. The cells reach the scroller's edge whether the listing sits in a scroller or scrolls sideways itself (a scroll-state container query on the listing). Inside a `.pane-list` the list fades its foot and its start, never its end, where the column stands. A listing that scrolls itself draws no start fade: a mask on it would also clip a menu or picker opened from a row. Every side is logical, so a right-to-left listing pins the column at its left, with the hairline on its right edge and the fade to its right, and a right-to-left list fades its right (start) side. Its cells paint the row's state fill over `--pane-pin-ground`, the list's ground inside a `.pane-list` and the surface elsewhere; set it on a host that stands on another ground.

A listing whose rows draw no icon starts its first label past the icon column, over the names; a section's heading (`Strip` `heading`) keeps the strip's edge. The rule weighs what the label's default placement does, so an app's own scoped rule for the label wins.

- `column(ch)`: a track as wide as `ch` characters plus the gutter.
- `ACTION_COLUMN`: `column(10)`, the same action column in every listing.
- `ICON_LINK_PX` (22) and `iconLinksColumn(count, gapPx)`: a track for `count` icon controls.
- `linksColumn(look, icons, words, extraPx?)`: the track for row links in a `LinkLook` (see [pane](pane.md)). In `icons` it is `icons`; in `text` or `both` it makes room for each word (10px padding, 7px a character, 17px more for the icon in `both`) and `extraPx` for controls that never take words.

When `grid` is a function of the look, the listing provides the look its rows draw in. It starts from the look in `RowLinkLookContext` and steps down (both, then text, then icons) while the listing is wider than its pane. A pane that grows back to a richer look's width gets that look again. The listing settles before it paints, and a resize redraws it only when the look changes.

## The row cursor

`RowCursorContext` carries a `RowCursor` (`current`, `subscribe`, `point`, optional `rowsChanged`). Each row subscribes on its own, so a cursor move redraws only the row it leaves and the row it lands on. `usePaneKeys` returns one as `rowCursor`. Without a provider no row is the cursor.

A row's controls that the keys run carry `data-verb` (`QuietAction`, `RowIconAction`) and leave the Tab order. The app reads them off the cursor row with `verbControl`.

## Keyboard behaviour

Rows take no keys themselves; the app's key handler (`usePaneKeys`) moves the cursor and runs the cursor row's verbs. The pointer moving over a row, or the focus entering it, moves the cursor there. A sorting strip label is a button: Return or Space sorts.

## Row states

| Look                                         | How you get it                                               | Drawn with                                                                    |
| -------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| Keyboard cursor                              | `RowCursorContext` (`.cursor`)                               | `--cursor-row` fill, a 2px `--cursor-bar` on the leading edge                 |
| Cursor of a pane that does not hold the keys | `.cursor` in a `.pane` beside a `.pane.active`               | `--fill`, no bar; its actions in `--text-on-surface`, neither lit nor red     |
| Selected                                     | `className="selected"` on `Row`                              | `--selected-bg` fill, `--on-selected` words, `--on-selected-dim` quiet words  |
| Selected under the cursor                    | `.selected` and `.cursor`                                    | `--selected-cursor-bg`, a bar in `--on-selected`; words as on a selected row  |
| Marked (a checkbox column)                   | `className="marked"` on `Row`                                | `--marked-bg` tint, a 2px `--marked-bar` on the leading edge                  |
| Marked under the cursor                      | `.marked` and `.cursor`                                      | `--marked-cursor-bg`, the `--cursor-bar` and a hairline ring in it            |
| Pointer hover                                | `.pointer` on the `.pane-list`, for rows that act on a click | `--row-hover` on rows other than the cursor, the selection, and marked rows   |
| Keyboard focus                               | `Row` `focusable`                                            | the accent ring inside the row's edges                                        |
| Add row                                      | `className="pane-add"` on `Row`                              | dim words after an accent glyph; accent words on hover, focus, and the cursor |

A selection outranks the cursor, a mark, and the pointer for colour: on a selected row every word, action, and state mark (the quiet and busy rings and the busy spinner included) takes `--on-selected` or `--on-selected-dim`, and the other states show by their fill and bar only. An app rule that recolours a word for the cursor, a mark, or hover should leave `.selected` out the same way, with `:where(:not(.selected))` on the row so the rule keeps its weight.

Leave `.pointer` off a list where the pointer moves the cursor: the cursor is the hover there. A row drawn as a `button` (a tree) wears the row's look, not the button's.

## Styling

`.pane-listing`, `.pane-columns.pane-strip`, `.pane-sort` (`.sortable`, `.active`), `.pane-sort-label`, `.pane-listing.pane-pin-end`, `.row` (`.cursor`, `.selected`, `.marked`, `.pane-open-row`, `.pane-add`), `.pane-list.pointer`, `.row-icon`, `.row-name`, `.row-meta` (`.align-right`), `.pane-message` (`.danger`), `.pane-empty` with `.pane-empty-actions`, `.pane-row-open` (a name that is a button), `.pane-action-cell`, `.pane-hover-cell` (its icon controls show on hover, focus, and the cursor row), `.pane-state` (`.pane-tone-*`, `.pane-state-dot`, `.pane-state-word`, `.pane-state-busy`), `.pane-path` (`.pane-path-head`, `.pane-path-tail`, `.pane-path-name`), `.pane-well-column`, `.pane-well`, `.pane-strip-link` (`.danger`), `.pane-filter-summary`, `.current-dot`.

A value cut by its column ends in an ellipsis. A row's name, a state's word, a strip label, and a status summary in words carry their whole text as a tooltip, which opens only while the text is cut. On a cursor or marked row every quiet word (the icon, the cells, an idle or busy state's word) takes `--text-on-surface`. A `.pane-message` is a sentence, set in the interface font; a `code` inside it keeps the monospace. Words take the text-safe roles, which keep 4.5:1 on the list, the cursor row, the header, and their own washes in every theme: a state's word `--success-text`, `--warning-text`, or `--danger-text`, a lit action and a strip link `--accent-text`. Marks keep the hue tokens (`--success`, `--warning`, `--danger`, `--accent`) and the idle ring `--idle-mark`, each at 3:1.

A listing with no rows (`empty`) leaves its column labels out, so no header stands over nothing; a control in the strip keeps its place. A pane with nothing in it at all centres a `.pane-empty` block: a glyph in the faint tone, a title (`strong` or `h2`), a sentence, and a `Button` or a `.pane-empty-actions` row of them.

## Labels read

`listing.sortBy(column, direction)` names a sorting label: "Sort by Size, sorted descending".
