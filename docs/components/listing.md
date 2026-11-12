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
- `Row` (`RowProps`): `rowKey` (its `data-row-key`), `mark` (the icon), `name`, `nameClass`, `className`, `onOpen` (a click anywhere but its controls), `tabbable` (keep its controls in the Tab order; a `QuietAction` in it still draws as `RowLinkLookContext` says, a glyph by default), `focusable` and `entry` (the row itself is a Tab stop).
- `Cell` (`CellProps`): `align`, `className`, and `tip`, the whole text of a cell cut short, as its tooltip and accessible description.
- `StateMark` (`StateMarkProps`): a mark in the state's tone (`StateTone`) and its word; `busy` draws a spinner, the same turning ring as `RunHeader`'s, instead of the mark. Each tone has its own shape, so two tones whose hues meet in a theme still differ: `ready` a dot, `warning` a diamond, `danger` a square, `busy` a heavy accent ring (it stands still; a transition under way draws the spinner), `muted` a thin grey ring. A word wider than its column ends in an ellipsis, its whole text in its tooltip.
- `PathCell` (`PathCellProps`): a path whose folders give way before its name. It is a cell itself: put it in the row as it is, never inside a `Cell`, whose gutter it would add a second time. `nameClassName` marks the name by its kind (a colour or a weight, never the accent, which in a row reads as a link); `pathParts(path).base` is the name it draws.
- `WellColumn` (`WellColumnProps`): a strip over a terminal-coloured well, full height. The child draws the well, usually `<pre className="pane-well">`. `label` makes it a region.
- `CurrentDot` (`CurrentDotProps`): a neutral dot one character after a label, named and titled by `label`.

## Column widths

A listing with rows lays its strip and every row on one grid (CSS subgrid), so a track sized by its content (`auto`, `max-content`) takes its widest cell across all rows and the strip, and every label stands over its values.

Give the name its floor, `minmax(min(var(--pane-name-floor), 100%), 1fr)`, so it keeps a readable width (14 characters) at a narrow pane while the other columns keep theirs; the list then scrolls sideways rather than cutting every name to one letter. The default grid and `WellColumn` use this track. A `.pane-list` fades its foot and its end side over 12px while more lies past that edge; its column strip never fades at its head. Its start side fades row by row, as below.

Where the listing scrolls sideways inside a box that is not a `.pane-list` (a page that scrolls as a whole), add `pane-pin-end` to the `Listing`'s `className`: its last column, the actions, stays at the scroller's end while the columns before it scroll under, with a hairline on its leading edge and a `--space-6` fade over the words sliding under it while any do. Each pinned cell fills its row's height, so the hairline runs unbroken, and the strip's cell over them is a square band. The cells end with their rows whether the listing sits in a scroller or is its own scroller: they reach back over the row inset a listing pads its end with, which a sticky box would otherwise stop at, so a marked cursor row's ring closes once. While a `.pane-list` around the listing scrolls sideways (a scroll-state container query on that list), they stop at the list's edge instead. Inside a `.pane-list` the list fades its foot, never its end, where the column stands. Every side is logical, so a right-to-left listing pins the column at its left, with the hairline on its right edge and the fade to its right, and a right-to-left list fades its right (start) side.

Every row, and the strip, carries its own edge at the scroller's start side, carried along as the list scrolls sideways, inside a `.pane-list` or in a listing that scrolls itself. It draws the row's state bar (the cursor's, a mark's, a selected cursor's) so the bar stays in view when the row's start has scrolled away. Once the list has scrolled, it also draws a `--space-6` fade over the words sliding out at that edge, painted from the row's own fill (`--row-fill` over `--pane-pin-ground`) and the strip's band. It is a box on the row rather than a mask on the list, so a menu or picker opened from a row is never clipped. The edge takes each row's `::before` and `::after` and sets `position: relative` on the row, so an app rule should not claim those pseudo-elements on a `.row`. A marked row under the cursor draws its hairline ring on the row, and the pinned cell repeats the ring's top, foot, and end sides over the row's end (`--pane-pin-ring`). Its cells paint the row's state fill over `--pane-pin-ground`, the list's ground inside a `.pane-list` and the surface elsewhere; set it on a host that stands on another ground.

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

| Look                       | How you get it                                               | Drawn with                                                                                                                              |
| -------------------------- | ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard cursor            | `RowCursorContext` (`.cursor`)                               | `--cursor-row` fill, a 2px `--cursor-bar` on the leading edge (`--row-bar`)                                                             |
| Quiet cursor               | `.cursor` where the keys are not (see below)                 | `--fill`, no bar; its actions in `--text-on-surface`, neither lit nor red                                                               |
| Selected                   | `className="selected"` on `Row`                              | `--selected-bg` fill, `--on-selected` words, `--on-selected-dim` quiet words                                                            |
| Selected under the cursor  | `.selected` and `.cursor`                                    | `--selected-cursor-bg`, a bar in `--on-selected`; words as on a selected row                                                            |
| Quiet selection            | `.selected` where the keys are not                           | `--fill`, words as on that fill (`--text`, `--text-on-surface`, states in their own tones); no bar under the cursor                     |
| Marked (a checkbox column) | `className="marked"` on `Row`                                | `--marked-bg` tint, a 2px `--marked-bar` on the leading edge                                                                            |
| Marked under the cursor    | `.marked` and `.cursor`                                      | `--marked-cursor-bg`, the `--cursor-bar` and a hairline ring in it                                                                      |
| Quiet mark                 | `.marked` (under the cursor or not) where the keys are not   | `--fill`, a 2px `--control-border-strong` bar, no ring; a checked box on the row in `--control-border-strong` with its mark in `--fill` |
| Pointer hover              | `.pointer` on the `.pane-list`, for rows that act on a click | `--row-hover` on rows other than the cursor, the selection, and marked rows                                                             |
| Keyboard focus             | `Row` `focusable`                                            | the accent ring inside the row's edges                                                                                                  |
| Add row                    | `className="pane-add"` on `Row`                              | dim words after an accent glyph; full words on hover, focus, and the cursor                                                             |

Whatever marks a row (the cursor, a mark, a checked box, a selection) goes quiet where the keys are not, as a desktop list's does: in a pane beside the pane that holds them, and in a window that is not in front. A quiet row stands on the neutral `--fill`, its name in `--text` and its quiet words in `--text-on-surface`, so it reads in every theme (the token tests hold both at 4.5:1 on that fill, and the quiet bar and checked box at 3:1). The host sets `data-window-inactive` on the root element while its window is not focused (from the window's `blur` and `focus` events, or the desktop shell's own); under it the active pane's frame also lets go of the accent and wears `--border-strong`, and the base stylesheet greys selected text ([Themes](../themes.md)). A data grid goes quiet under the same two conditions ([Grid](grid.md)).

A host that colours its own parts of a selected row (a file name coloured by kind, a link's target) gives them `var(--row-selected-text)` and `var(--row-selected-text-dim)` instead of `--on-selected` and `--on-selected-dim`: on a selection that holds the keys they are the on-selection tones, and on a quiet selection `--text` and `--text-on-surface`, so the host's words follow the selection into its quiet look without a rule of their own.

A selection that holds the keys outranks the cursor, a mark, and the pointer for colour: on a selected row every word, action, and state mark (the quiet and busy rings and the busy spinner included) takes `--on-selected` or `--on-selected-dim`, and the other states show by their fill and bar only. An app rule that recolours a word for the cursor, a mark, or hover should leave `.selected` out the same way, with `:where(:not(.selected))` on the row so the rule keeps its weight.

A listing selects rows, not text, as a file manager does: a drag, a Shift-click, or a double-click on a row never starts a text selection, in its name and values included, even inside a region the host marks `.selectable`, so a host adds no code to prevent one; a field in a row (an inline rename) keeps its own text. Copy a row through the host's own Copy command. A status summary, a `.pane-message` or `.pane-empty`, and a `.pane-well`'s output stay selectable.

Leave `.pointer` off a list where the pointer moves the cursor: the cursor is the hover there. A row drawn as a `button` (a tree) wears the row's look, not the button's.

## Styling

`.pane-listing`, `.pane-columns.pane-strip`, `.pane-sort` (`.sortable`, `.active`), `.pane-sort-label`, `.pane-listing.pane-pin-end`, `.row` (`.cursor`, `.selected`, `.marked`, `.pane-open-row`, `.pane-add`), `.pane-list.pointer`, `.row-icon`, `.row-name`, `.row-meta` (`.align-right`), `.pane-message` (`.danger`, `.empty`), `.pane-empty`, `.pane-row-open` (a name that is a button), `.pane-action-cell`, `.pane-hover-cell` (secondary icon controls, in view on every row in their quiet tone, never appearing on hover), `.pane-state` (`.pane-tone-*`, `.pane-state-dot`, `.pane-state-word`, `.pane-state-busy`), `.pane-path` (`.pane-path-head`, `.pane-path-tail`, `.pane-path-name`), `.pane-well-column`, `.pane-well`, `.pane-well-note` (`.beside-terminal`), `.pane-strip-link` (`.danger`), `.pane-filter-summary`, `.current-dot`.

A value cut by its column ends in an ellipsis. A row's name, a state's word, a strip label, and a status summary in words carry their whole text as a tooltip, which opens only while the text is cut. On a cursor, marked, or hovered row every quiet word (the icon, the cells, an idle or busy state's word, a row action at rest) takes `--text-on-surface`; the cursor row lights its actions in `--text`, an icon action drawn with its word (`.pane-icon-act.worded`) included; no action is ever drawn in the accent or underlined, as a link would be. A `.pane-strip-link` (Update all, Clear) is a quiet control, not a link: dim words that take the shared quiet hover (the frosted box, full words) and press; with `.danger` it stays quiet at rest and turns `--danger-text` under the pointer, with the focus, and while pressed. A `.pane-message` starts on the row inset, where a row's icon starts; a hint or a refusal is a sentence, set in the interface font, and a `code` inside it keeps the monospace. A `.pane-message.danger` is a status line: the danger glyph (`CircleAlert` in `--danger`, drawn by the class) and its words in `--text`. Words take the text-safe roles, which keep 4.5:1 on the list, the cursor row, the header, and their own washes in every theme: a state's word `--success-text`, `--warning-text`, or `--danger-text`, a destructive action under the pointer `--danger-text`. Marks keep the hue tokens (`--success`, `--warning`, `--danger`, `--accent`) and the idle ring `--idle-mark`, each at 3:1. On a state row the quiet ring takes the row's mark edge (`--check-edge`, `--control-border-strong`, 3:1 on every state fill). A filled mark on a marked row wears a `--text-on-surface` hairline. The busy ring and spinner on a quiet cursor or marked row take `--text-on-surface`.

A host that draws some entries quieter than the rest (hidden files) uses `--row-meta-text` at rest and `--text-dim-on-surface` on cursor, marked, and hovered rows, which keeps 4.5:1 on each of those fills. In GitHub Light, Gruvbox Light, One Light, Catppuccin Macchiato and Mocha, Dracula, GitHub Dark, Gruvbox Dark, Nord, Rosé Pine, and Tokyo Night it reads clearly quieter than the text (Catppuccin Frappé only slightly). In Catppuccin Latte, Rosé Pine Dawn, Solarized Light, Tokyo Night Day, One Dark, and Solarized Dark the text itself sits at 4.5 to 4.7:1 on those fills, so the tone is the text there. In those themes, mark a quiet entry by its glyph in `--control-border-strong`, which holds 3:1 on every state row.

### Empty

Empty text looks like what it stands in for, dimmed, so it never reads as an afterthought:

- **A list with no rows** says so in a quiet row, `.pane-message.empty` (what `Listing`'s `empty` draws): it starts where a row's icon starts, in the rows' own typeface and size (the host's, which the library does not set), in the dim text tone, one row high. "This folder is empty." under a `..` row is drawn the same way. `empty` leaves the column labels out, so no header stands over nothing; a control in the strip keeps its place.
- **An output or terminal well with nothing in it** says so in `.pane-well-note`, a line of the well: the terminal's font, size, and line height, dim, where the well's text starts. Beside a terminal in a well, add `.beside-terminal` to take the terminal's own 4px inset.
- **A grid with no rows** draws its `empty` content where the first row would be, in the grid's cell type ([Grid](grid.md)). A chart with no values keeps its plot's place and says so in the chart's own type ([Charts](charts.md)).
- **A whole empty space** (a pane or a page with nothing in it at all) keeps its frame: its path bar, with the ways on as actions there (an Add), its status line, and in the first row's place one quiet line. Write that line as `.pane-message.empty` where the space is a list. `.pane-empty` draws the same line for a space that is not one: its title (`strong` or `h2`) is the line, in the listing's monospace, dim, on the row inset, and that is all it holds. The ways on are the path bar's actions (the demo's empty pane has its Add there) or the list's add row, and what a sentence of help would say goes in that action's tooltip. A pane with no bar offers its way on as an add row (`Row className="pane-add"`) under the line. No push button stands in an empty space, beside a bar's own Add or anywhere else, so an action is never drawn twice and the empty pane never reads as a web app's get-started state. No centred block, no picture, no sentence: a glyph put first in a `.pane-empty` is not drawn, and the library styles nothing after the line.

## Labels read

`listing.sortBy(column, direction)` names a sorting label: "Sort by Size, sorted descending".
