# Listing (`uiok/listing`)

Tables in the listing look: a ruled column strip over 24px rows in the monospace face, a cursor row that the keys and the pointer share, and cells for states, paths, and terminal output. `CurrentDot` marks the current item in a list. Panes, their path bar, status line, and compact controls are in [pane](pane.md); the same stylesheet draws both.

## The listing scope

Every rule applies under `.listing-root`. Put the class on the element that holds your panes, beside your own class:

```html
<section class="my-view listing-root">…</section>
```

Rules are scoped with `:where(.listing-root)`, so each weighs one class less than your own `.my-view .row`. Adjust one piece with a single scoped rule, in whatever order the stylesheets load. The scope's metrics are custom properties on `.listing-root`:

| Property                | Default | Meaning                                                                         |
| ----------------------- | ------- | ------------------------------------------------------------------------------- |
| `--pane-columns-height` | `22px`  | The sticky column strip's height; a row's `scroll-margin-top` clears it         |
| `--pane-path-height`    | `26px`  | The path bar's row                                                              |
| `--pane-column-gap`     | `1.5ch` | The gutter before each column after the name; the strip's rule stands in it     |
| `--pane-row-inset`      | `8px`   | The room a row and the strip keep at either edge                                |
| `--pane-grid`           |         | A listing's grid template, set inline by `Listing` and `WellColumn` from `grid` |

## Example

```tsx
import { ACTION_COLUMN, Cell, column, Listing, Row, StateMark } from 'uiok/listing';
import { QuietAction } from 'uiok/pane';

<div className="listing-root">
  <Listing
    columns={[
      { label: 'State' },
      { label: 'Size', align: 'right', sort },
      { label: 'Action', hidden: true }
    ]}
    grid={`20px minmax(0, 1fr) ${column(10)} ${column(8)} ${ACTION_COLUMN}`}
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
</div>;
```

## Components

- `Listing` (`ListingProps`): `title` (the strip's first label), `label` (the table's accessible name, `title` by default), `grid` (the `--pane-grid` template, or a function of the row links' look), `columns` (`ListingColumn[]`), `className`, `empty` (a line said instead of the rows; the listing is then a `section`, not a table), `titleSort` and `titleLabel` (the first column's sort and label), and the rows.
- `Strip` (`StripProps`): the ruled column strip alone, for a section over something that is not rows. `table` makes it a header row, `heading` makes its name an `h3`.
- `ListingColumn`: `label` (the column's label and key), `hidden` (said to screen readers only, as over an action column), `align: 'right'` (numbers), `control` (a control in the label's place, such as a `.pane-strip-link` "Update all"), and `sort` (`ColumnSort`: `direction` `'asc' | 'desc' | null`, and `onSort`).
- `Row` (`RowProps`): `rowKey` (its `data-row-key`), `mark` (the icon), `name`, `nameClass`, `className`, `onOpen` (a click anywhere but its controls), `tabbable` (keep its controls in the Tab order), `focusable` and `entry` (the row itself is a Tab stop).
- `Cell` (`CellProps`): `align`, `className`, and `tip`, the whole text of a cell cut short, as its tooltip and accessible description.
- `StateMark` (`StateMarkProps`): a dot in the state's tone (`StateTone`: `ready`, `warning`, `danger`, `busy`, `muted`) and its word; `busy` draws a spinner instead of the dot.
- `PathCell` (`PathCellProps`): a path whose folders give way before its name. `nameClassName` colours the name by its kind; `pathParts(path).base` is the name it draws.
- `WellColumn` (`WellColumnProps`): a strip over a terminal-coloured well, full height. The child draws the well, usually `<pre className="pane-well">`. `label` makes it a region.
- `CurrentDot` (`CurrentDotProps`): a neutral dot one character after a label, named and titled by `label`.

## Column widths

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

## Styling

`.pane-listing`, `.pane-columns.pane-strip`, `.pane-sort` (`.sortable`, `.active`), `.pane-sort-label`, `.row` (`.cursor`, `.pane-open-row`), `.row-icon`, `.row-name`, `.row-meta` (`.align-right`), `.pane-message` (`.danger`), `.pane-empty` with `.pane-empty-actions`, `.pane-row-open` (a name that is a button), `.pane-action-cell`, `.pane-hover-cell` (its icon controls show on hover, focus, and the cursor row), `.pane-state` (`.pane-tone-*`, `.pane-state-dot`, `.pane-state-busy`), `.pane-path` (`.pane-path-head`, `.pane-path-tail`, `.pane-path-name`), `.pane-well-column`, `.pane-well`, `.pane-strip-link` (`.danger`), `.pane-filter-summary`, `.current-dot`.

A warning's words (`StateMark`'s, a path bar's `.path-facts.warning`) read in `--warning-text` when set, `--warning` otherwise. A theme whose `--warning` is too light for text sets a more legible tone for text on the scope:

```css
.listing-root {
  --warning-text: var(--my-legible-warning);
}
```

## Labels read

`listing.sortBy(column, direction)` names a sorting label: "Sort by Size, sorted descending".
