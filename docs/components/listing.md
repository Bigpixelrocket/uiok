# Listing (`@bigpixelrocket/uiok/listing`)

Tables in the listing look: a ruled column strip over 24px rows in the monospace face, a cursor row that the keys and the pointer share, and cells for states, paths, and terminal output. `CurrentDot` marks the current item in a list. Panes, their path bar, status line, and compact controls are in [pane](pane.md); the same stylesheet draws both.

## The listing scope

Every rule applies under `.listing-root`. A window drawn with `WindowFrame` ([Frame](frame.md)) is already the listing root, and so are a `ModalDialog`'s box (the Settings dialog's included) and a `Palette`'s box, wherever they mount. A `Listing` drawn outside all of them carries the class itself, so a listing looks the same anywhere. For rows or panes of your own elsewhere, put the class on the element that holds them, beside your own class:

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

A `Listing` sets itself in the listing's monospace face wherever it is drawn, a dialog or a palette included, as a `.pane-list` does.

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
- `ListingColumn`: `label` (the column's label and key), `hidden` (said to screen readers only, as over an action column), `align: 'right'` (numbers), `control` (a control in the label's place, such as a `.pane-strip-link` "Update all"), `sort` (`ColumnSort`: `direction` (`SortDirection`: `'asc' | 'desc' | null`), and `onSort`), and `tip` (what the column holds beyond its label, such as a unit: the label's tooltip and accessible description, sortable or not; without it a cut label shows itself whole).
- `Row` (`RowProps`): `rowKey` (its `data-row-key`), `mark` (the icon), `name`, `nameClass`, `nameTip` (more than the name says, in the host's words, such as what a narrow pane's dropped columns held: the name's tooltip at every width, the whole name on its first line, a name in markup by its words as assistive technology reads them (words under `aria-hidden="true"` or `hidden` left out, a `.visually-hidden` copy kept, so a cut `NameCut` gives its whole name once; a glyph's text alternative, `aria-labelledby` or `aria-label` on an `svg`, an `img`, or an element with a naming role, or an `img`'s `alt`, read in place of its content), read again whenever those words change, and the tip under it, in place of the tooltip a cut name shows alone), `nameDescription` (never shown: the row's kind, "Database", never the name itself; it and `nameTip`'s words, in that order, describe the name's cell, the row when it or its controls take the focus (`focusable`, `tabbable`), and a radio row's radio), `className`, `onOpen` (a click anywhere but its controls), `onContextMenu` (a secondary click, below), `level` (how deep the row stands in a tree or a plan: its name is indented one icon column, `--icon-column`, a level through `--row-level`; 0 or none is no indent; the expansion and its keys stay the host's), `tabbable` (keep its controls in the Tab order; a `QuietAction` in it still draws as `RowLinkLookContext` says, a glyph by default), `focusable` and `entry` (the row itself is a Tab stop), `dim` (the item is not there yet, a version not installed: its name in `--row-meta-text`, `.row-dim`), `selected` (`.selected` and `aria-selected`), `marked` (`.marked`), `change` (`'changed'` or `'removed'`: `.row-changed`, `.row-removed`), `emphasis` (the row stands out from its peers, the slowest path of a plan: its name in the strong weight, `.row-emphasis`), `add` (the row adds one at the listing's foot, "Add service…": an accent plus in the mark's slot unless `mark` gives another, `.pane-add`), and `radio` (`RowRadio`, below).
- `Cell` (`CellProps`): `align`, `kind` (`'action'`, the row's verbs at its end, `.pane-action-cell`; `'hover'`, secondary icon controls in view on every row, `.pane-hover-cell`), `missing` (a missing value, SQL NULL, `.value-null`), `className`, `tip` (the whole text of a cell cut short, as its tooltip and description at every width; without it, a cell whose children are text or a number shows them whole as its tooltip only while the column cuts them, `cutTooltip`), the whole text of a cell cut short, as its tooltip and accessible description, and `tone` (`CellTone`: `'warning'` a value with an update waiting, `'accent'` a value offered, `'danger'` a value that failed), drawn as `data-tone` in `--warning-text`, `--accent-text`, or `--danger-text`. A toned cell keeps its tone on the cursor row and under the pointer; a selection paints it in its own words.
- `TimelineCell` (`TimelineCellProps`): a row's span on a shared scale, in a cell's place: `start` and `end` on a scale from 0 to `max` (every row of the listing passes the same `max`), `emphasis` (the solid `--accent` for the path that matters; `--accent-line` otherwise), `waited` (a `--border-strong` hairline from the scale's start to `start`), and `label` (the span in words: its accessible name and tooltip, read once). On a selected row the bar and the wait take the selection's words (`--on-selected`, the lighter bar and the wait `--on-selected-dim`), as the state dots do. A span is clamped to the scale and never ends before it starts. `TimelineScale` (`max`, `ticks`: `{ at, label }`) heads the column with its ticks, as the column's `control`. For a plan's startup timing or a dependency graph read as rows; draws `.timeline-cell` with `--timeline-start` and `--timeline-end`, and `.timeline-scale` with `.timeline-tick`s.
- `StateMark` (`StateMarkProps`): a mark in the state's tone (`StateTone`) and its word (an empty `word` draws the mark alone, standing on the middle of a line of text, such as a row's cell); `busy` draws a spinner, the same turning ring as `RunHeader`'s, instead of the mark. Each tone has its own shape, so two tones whose hues meet in a theme still differ: `ready` a dot, `warning` a diamond, `danger` a square, `busy` a heavy accent ring (it stands still; a transition under way draws the spinner), `muted` a thin grey ring, `info` an upright accent bar (an Info or Note line; its word in a row in `--accent-text`). A word wider than its column ends in an ellipsis, its whole text in its tooltip; `tip` says what the state means instead, as the whole mark's tooltip and accessible description.
- `PathCell` (`PathCellProps`): a path whose folders give way before its name. It is a cell itself: put it in the row as it is, never inside a `Cell`, whose gutter it would add a second time. `nameClassName` marks the name by its kind (a colour or a weight, never the accent, which in a row reads as a link); `pathParts(path).base` is the name it draws.
- `WellColumn` (`WellColumnProps`): a strip over a terminal-coloured well, full height. The child draws the well, usually `<pre className="pane-well">`. `label` makes it a region.
- `CurrentDot` (`CurrentDotProps`): a neutral dot one character after a label, named and titled by `label`.
- `PaneMessage` (`PaneMessageProps`): one line about a listing where its rows stand, for what `Listing`'s `empty` and `PageNote` do not cover: `children` (a sentence, `code` inside for a name or value), `tone` (`PaneMessageTone`: `danger` a refusal led by the danger glyph, `warning` led by the warning glyph, `empty` a list with no rows; a plain hint unless given), `icon` (a `LucideIcon` of the host's own leading the words, in place of a tone's glyph and in its colour with one), and `live` (a `status` live region, for a line that comes and goes with what the user does). It draws `.pane-message`. Inside a listing, after one, or anywhere else: drawn outside every listing scope (a page of the app's own, a popover), it wraps itself in a `.listing-root`, as `Listing` does, so it keeps its look; `PageNote` ([Frame](frame.md)) does the same. Its words sit in one `.pane-message-text` box that takes the room after the glyph, so a sentence too long for one line wraps in its own column beside the glyph, never under it. A glyph leading the words, `icon` or an `svg` that is the first thing in `children` (blank space aside, as hosts drew one before `icon`), is drawn at `--icon-md` and the words after it hang in the same column: the box (`.pane-message-text.pane-message-led`) steps in by the glyph and its gap, and its first line steps back out to start with the glyph. An icon inside the sentence ("Press ▶ to run") is one of its words: no hanging indent, its own size, and a tone keeps its glyph. Markup of a host's own that draws `.pane-message` without the component marks a leading glyph's box `.pane-message-led` itself.

### A choice of one row (`RowRadio`)

`Row`'s `radio` leads a row with a radio in the mark's place, for a listing whose rows are one choice of several (the database a server uses): `checked`, `onPick` (a press on the radio, or the key the app maps to its `verb`), `group` (the radio group's name, the same on every row of the choice and unique in the window), `disabled` (holds the choice while a change runs), and `verb` (`data-verb`, so the cursor row's key picks it through `verbControl`).

```tsx
<Row
  name={db.name}
  radio={{
    checked: db.name === selected,
    group: 'service-db',
    onPick: () => select(db.name),
    verb: 'pick'
  }}
  rowKey={db.name}
>
  <Cell align="right">{db.size}</Cell>
</Row>
```

The radio is a native `input type="radio"` in the shared `.check` disc, named by the row's name (`aria-labelledby`), so a screen reader reads "shop, radio button, checked" with the group's position. It stands in the icon column inside the name's cell (`.row-pick`, spanning both columns as the strip's name label does), so the row keeps one cell a column. As every row control, it leaves the Tab order unless the row is `tabbable`; the cursor row's keys reach it through its `verb`. A press on it picks the row and never opens it.

### A row's menu (`onContextMenu`)

`Row`'s `onContextMenu(event, rowKey)` takes a secondary click (the right button, a Control-click, the keyboard's menu key on a focused row) for the row's menu. The row moves the pane's cursor to itself first (`RowCursorContext`'s `point`), as a file manager does, so the menu opens over the cursor row and its verbs act on it; then it cancels the browser's own menu and calls the handler with the event (open the menu at `clientX` and `clientY`) and its key, so one handler serves every row. A click a control inside the row already cancelled is that control's, and passes the row by. A row without the prop leaves the click to the pane: the `PaneBox` around it ([Pane](pane.md)) opens its own menu for a click whose default nothing cancelled, so a row's handler and the pane's never both run for one click.

```tsx
<Row name={file.name} onContextMenu={(event, key) => openMenu(key, event)} rowKey={file.path} />
```

From the keyboard, the focus sits on the pane's home (`PaneList` with `home`), not on a row, so the Menu key or Shift-F10 aims at the home. The home takes a secondary click as the keyboard's only right after the Menu key or Shift-F10 (with no other modifier) went down on it, before any other key or any press of a pointer. The event itself cannot tell: Chromium sends the Menu key's as a mouse's pointer event. It hands such a click to the cursor row: when that row has an `onContextMenu` (it carries `data-row-menu`), the row's handler runs as for a click on the row, its event's `clientX` and `clientY` under the row's leading edge, so the menu opens at the row, and no pane or region menu runs. A cursor row without one, and a pointer's click on the home's empty space, stay the pane's. Open the menu at the event's `clientX` and `clientY` either way.

## Column widths

A listing with rows lays its strip and every row on one grid (CSS subgrid), so a track sized by its content (`auto`, `max-content`) takes its widest cell across all rows and the strip, and every label stands over its values.

Give the name its floor, `minmax(min(var(--pane-name-floor), 100%), 1fr)`, so it keeps a readable width (14 characters) at a narrow pane while the other columns keep theirs; the list then scrolls sideways rather than cutting every name to one letter. The default grid and `WellColumn` use this track. A `.pane-list` fades its foot and its end side over 12px while more lies past that edge; its column strip never fades at its head. Its start side fades row by row, as below.

Where the listing scrolls sideways inside a box that is not a `.pane-list` (a page that scrolls as a whole), add `pane-pin-end` to the `Listing`'s `className`: its last column, the actions, stays at the scroller's end while the columns before it scroll under, with a hairline on its leading edge and a `--space-6` fade over the words sliding under it while any do. Each pinned cell fills its row's height, so the hairline runs unbroken, and the strip's cell over them is a square band. A pinned listing ends its grid with an empty track as wide as the row inset instead of padding its end, and the cells reach over that track, so they end with their rows and a marked cursor row's ring closes once. While the columns run on, the cells stop at the edge of whatever scrolls them (the listing itself, a `.pane-list`, or a box of the host's own with no padding) with their end inset inside it. A host style that sticks a second cell beside the last one sticks it at the last column's track width plus the row inset (`--pane-row-inset`) from the end. Inside a `.pane-list` the list fades its foot, never its end, where the column stands. Every side is logical, so a right-to-left listing pins the column at its left, with the hairline on its right edge and the fade to its right, and a right-to-left list fades its right (start) side.

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

| Look                       | How you get it                                               | Drawn with                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| -------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keyboard cursor            | `RowCursorContext` (`.cursor`)                               | `--cursor-row` fill, a 2px `--cursor-bar` on the leading edge (`--row-bar`)                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Quiet cursor               | `.cursor` where the keys are not (see below)                 | no fill and no bar, a hairline frame in `--control-border-strong`; its actions in `--text-on-surface`, neither lit nor red                                                                                                                                                                                                                                                                                                                                                                        |
| Selected                   | `selected` on `Row` (`.selected`)                            | `--selected-bg` fill, `--on-selected` words, `--on-selected-dim` quiet words                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Selected under the cursor  | `.selected` and `.cursor`                                    | `--selected-cursor-bg`, a bar in `--on-selected`; words as on a selected row                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Quiet selection            | `.selected` where the keys are not                           | `--fill`, words as on that fill (`--text`, `--text-on-surface`, states in their own tones); under the cursor, the fill and the frame                                                                                                                                                                                                                                                                                                                                                              |
| Marked (a checkbox column) | `marked` on `Row` (`.marked`)                                | `--marked-bg` tint, a 2px `--marked-bar` on the leading edge                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| Marked under the cursor    | `.marked` and `.cursor`                                      | `--marked-cursor-bg`, the `--cursor-bar` and a hairline ring in it                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Quiet mark                 | `.marked` where the keys are not                             | `--fill`, a 2px `--control-border-strong` bar; under the cursor, the quiet cursor's frame too; a checked box in `--control-border-strong` with its mark in `--fill`                                                                                                                                                                                                                                                                                                                               |
| Pointer hover              | `.pointer` on the `.pane-list`, for rows that act on a click | `--row-hover` on rows other than the cursor, the selection, and marked rows                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Keyboard focus             | `Row` `focusable`                                            | the accent ring inside the row's edges                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Add row                    | `add` on `Row` or `TreeRow` (`.pane-add`)                    | dim words after an accent glyph; full words on hover, focus, and the cursor                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Not there yet              | `dim` on `Row` or `TreeRow` (`.row-dim`)                     | the name in `--row-meta-text`; `--text-on-surface` on the cursor, a mark, and under the pointer; a selection's words on a selection. On an add row (`.pane-add.row-dim`, an Add row whose requirement is missing) the plus gives up the accent for `--row-meta-text` at `--disabled-opacity` in every state but a selection, the words rest in `--row-meta-text` and rise only to `--text-on-surface`, never `--text`, so it reads as unavailable in every theme, Latte's one quiet tone included |
| Changed                    | `change="changed"` on `Row` (`.row-changed`)                 | `--warning-wash` and a 2px `--warning` bar on the leading edge, quiet words in `--text-on-surface`; the cursor, a mark, and a selection paint over it                                                                                                                                                                                                                                                                                                                                             |
| Removed                    | `change="removed"` on `Row` (`.row-removed`)                 | name and cells struck out in `--danger` on the `--danger-wash`, quiet words in `--text-on-surface`; the strike stays under the cursor, a mark, and a selection                                                                                                                                                                                                                                                                                                                                    |
| Drop target                | `className="drop-target"` while something is dragged over it | a 2px `--accent` outline inside the row's edges, over whatever state it is in                                                                                                                                                                                                                                                                                                                                                                                                                     |

Whatever marks a row (the cursor, a mark, a checked box, a selection) goes quiet where the keys are not, as a desktop list's does: in a pane beside the pane that holds them, and in a window that is not in front. A quiet selection or mark stands on the neutral `--fill`, its name in `--text` and its quiet words in `--text-on-surface`, so it reads in every theme (the token tests hold both at 4.5:1 on that fill, and the quiet bar and checked box at 3:1). The quiet cursor keeps the two apart: it has no fill, only a hairline frame in `--control-border-strong` (3:1 on the list and on `--fill` in every theme), so a selected row, the cursor, and the cursor inside a selection read as three looks in the pane without the keys. The host sets `data-window-inactive` on the root element while its window is not focused (from the window's `blur` and `focus` events, or the desktop shell's own); under it the active pane's frame also lets go of the accent and wears `--border-strong`, and the base stylesheet greys selected text ([Themes](../themes.md)). A data grid goes quiet under the same two conditions ([Grid](grid.md)).

A host that colours its own parts of a selected row (a file name coloured by kind, a link's target) gives them `var(--row-selected-text)` and `var(--row-selected-text-dim)` instead of `--on-selected` and `--on-selected-dim`: on a selection that holds the keys they are the on-selection tones, and on a quiet selection `--text` and `--text-on-surface`, so the host's words follow the selection into its quiet look without a rule of their own.

A selection that holds the keys outranks the cursor, a mark, and the pointer for colour: on a selected row every word, action, and state mark (the quiet and busy rings and the busy spinner included) takes `--on-selected` or `--on-selected-dim`, and the other states show by their fill and bar only. An app rule that recolours a word for the cursor, a mark, or hover should leave `.selected` out the same way, with `:where(:not(.selected))` on the row so the rule keeps its weight.

A listing selects rows, not text, as a file manager does: a drag, a Shift-click, or a double-click on a row never starts a text selection, in its name and values included, even inside a region the host marks `.selectable`, so a host adds no code to prevent one; a field in a row (an inline rename) keeps its own text. Copy a row through the host's own Copy command. A status summary, a `.pane-message` or `.pane-empty`, and a `.pane-well`'s output stay selectable.

Leave `.pointer` off a list where the pointer moves the cursor: the cursor is the hover there. A row drawn as a `button` (a tree) wears the row's look, not the button's.

## Styling

`.pane-listing`, `.pane-columns.pane-strip`, `.pane-sort` (`.sortable`, `.active`), `.pane-sort-label`, `.pane-listing.pane-pin-end`, `.row` (`.cursor`, `.selected`, `.marked`, `.pane-open-row`, `.pane-add`, `.row-changed`, `.row-removed`, `.drop-target`), `.pane-list.pointer`, `.row-icon`, `.row-name`, `.row-meta` (`.align-right`, `.value-null`: a missing value, SQL NULL, in italic, in `--row-meta-text` at rest and `--text-on-surface` on a state row, as the grid's `cell-null`), `.pane-message` (`.danger`, `.warning`, `.empty`), `.pane-empty` with `.pane-empty-actions` and `.pane-empty-detail`, `.pane-row-open` (a name that is a button), `.pane-action-cell`, `.pane-hover-cell` (secondary icon controls, in view on every row in their quiet tone, never appearing on hover), `.pane-state` (`.pane-tone-*`, `.pane-state-dot`, `.pane-state-word`, `.pane-state-busy`), `.pane-path` (`.pane-path-head`, `.pane-path-tail`, `.pane-path-name`), `.pane-well-column`, `.pane-well`, `.pane-well-note` (`.beside-terminal`), `.pane-strip-link` (`.danger`), `.pane-filter-summary`, `.current-dot`.

A value cut by its column ends in an ellipsis. A row's name, a state's word, a strip label, and a status summary in words carry their whole text as a tooltip, which opens only while the text is cut. On a cursor, marked, or hovered row every quiet word (the icon, the cells, an idle or busy state's word, a row action at rest) takes `--text-on-surface`; the cursor row lights its actions in `--text`, an icon action drawn with its word (`.pane-icon-act.worded`) included; no action is ever drawn in the accent or underlined, as a link would be. A `.pane-strip-link` (Update all, Clear) is a small push button, never a link and never a bare word that could pass for a column label: words in `--text` inside a 20px `--control-border` bezel (the same values as the 20px Button, `size="xs"`), with the shared quiet hover (the frosted box) and press. With `.danger` it is the danger button in small: a `--danger` bezel and `--danger-text` words in every state, `--danger-wash` under the pointer and `--danger-wash-strong` while held. A `.pane-message` starts on the row inset, where a row's icon starts; a hint or a refusal is a sentence, set in the interface font, and a `code` inside it keeps the monospace. A `.pane-message.danger` is a status line: the danger glyph (`CircleAlert` in `--danger`, drawn by the class) and its words in `--text`; a `.pane-message.warning` the same with the warning glyph (`TriangleAlert` in `--warning`). A `.notice` as a status line's summary (inside `.pane-summary`) stays on one line, its `notice-text` cut with an ellipsis; give it `cutTooltip` with the whole text. Words take the text-safe roles, which keep 4.5:1 on the list, the cursor row, the header, and their own washes in every theme: a state's word `--success-text`, `--warning-text`, or `--danger-text`, a destructive action under the pointer `--danger-text`. Marks keep the hue tokens (`--success`, `--warning`, `--danger`, `--accent`) and the idle ring `--idle-mark`, each at 3:1. On a state row the quiet ring takes the row's mark edge (`--check-edge`, `--control-border-strong`, 3:1 on every state fill). A filled mark on a marked row wears a `--text-on-surface` hairline. The busy ring and spinner on a quiet row that keeps the neutral fill (a quiet mark or a quiet selection) take `--text-on-surface`, 3:1 or more on that fill in every theme where the accent is not; a quiet cursor alone has a frame and no fill, so its marks keep their own tones on the list. Inside a column strip a strip action (or a `size="xs"` Button) takes its height from the strip: in the strip's control cell it fills the cell less `--space-1` at each end, and elsewhere in a strip it is `--pane-columns-height` less the strip's rules and `--space-1` at each end (17px under a pane's head, 16px in a strip that follows a listing and so carries a rule above it), so its bezel stands 2px clear of both rules in every strip, and its focus ring is drawn inside (`--focus-offset-inset`), since the strip is pinned at the top of a scroller that clips.

A host that draws some entries quieter than the rest (hidden files) uses `--row-meta-text` at rest and `--text-dim-on-surface` on cursor, marked, and hovered rows, which keeps 4.5:1 on each of those fills. In GitHub Light, Gruvbox Light, One Light, Catppuccin Macchiato and Mocha, Dracula, GitHub Dark, Gruvbox Dark, Nord, Rosé Pine, and Tokyo Night it reads clearly quieter than the text (Catppuccin Frappé only slightly). In Catppuccin Latte, Rosé Pine Dawn, Solarized Light, Tokyo Night Day, One Dark, and Solarized Dark the text itself sits at 4.5 to 4.7:1 on those fills, so the tone is the text there. In those themes, mark a quiet entry by its glyph in `--control-border-strong`, which holds 3:1 on every state row.

### Empty

Empty text looks like what it stands in for, dimmed, so it never reads as an afterthought:

- **A list with no rows** says so in a quiet row, `.pane-message.empty` (what `Listing`'s `empty` draws): it starts where a row's icon starts, in the rows' own typeface and size (the host's, which the library does not set), in the dim text tone, one row high. "This folder is empty." under a `..` row is drawn the same way. `empty` leaves the column labels out, so no header stands over nothing; a control in the strip keeps its place.
- **An output or terminal well with nothing in it** says so in `.pane-well-note`, a line of the well: the terminal's font, size, and line height, dim, where the well's text starts. Beside a terminal in a well, add `.beside-terminal` to take the terminal's own 4px inset.
- **A grid with no rows** draws its `empty` content where the first row would be, in the grid's cell type ([Grid](grid.md)). A chart with no values keeps its plot's place and says so in the chart's own type ([Charts](charts.md)).
- **An empty or failed pane** is a different case: a pane that is empty because nothing has been added yet (no projects, no connections, no servers), or whose content could not load (a locked folder, a refused connection), says what it is and offers its actions where the eye is. `EmptyState` centres one block between its path bar and its status line, in the interface font:

  ```tsx
  import { EmptyState } from '@bigpixelrocket/uiok/listing';

  <EmptyState
    icon={Layers}
    title="Nothing installed yet"
    body="Runtimes come from mise, services from Homebrew."
    actions={
      <>
        <Button variant="tonal">Add Runtime…</Button>
        <Button>Add Service…</Button>
      </>
    }
    detail="Homebrew 4.6.11 · mise 2026.11.2"
    steps={[{ title: 'Pick a folder', detail: 'any folder of this Mac' }, { title: 'Start them' }]}
  />;
  ```

  | Prop      | Type                        | Purpose                                                                                     |
  | --------- | --------------------------- | ------------------------------------------------------------------------------------------- |
  | `icon`    | `LucideIcon`                | The glyph over the title, in the faint tone (`--danger` for a `failure`)                    |
  | `mark`    | `ReactNode`                 | A mark of the host's own in the glyph's place (a `BrandMark`), at the glyph's scale         |
  | `title`   | `string`                    | The heading (an `h2`), the text colour at the heading size; the one part always drawn       |
  | `body`    | `ReactNode`                 | The sentence: dim, small, at most 420px wide                                                |
  | `actions` | `ReactNode`                 | `Button`s, one primary at most, in a row that wraps                                         |
  | `note`    | `ReactNode`                 | A quiet line under the actions (where an import would come from)                            |
  | `detail`  | `ReactNode`                 | What the system returned (an error, the tools found), last of the lines, in the code face   |
  | `steps`   | `readonly EmptyStateStep[]` | `{ title, detail? }`: the way in as numbered steps side by side, each number in a small box |
  | `failure` | `boolean`                   | The pane could not load: an alert, its glyph in `--danger`                                  |

  The words can be selected and copied.

Which to use: a listing's `empty` (`.pane-message.empty`) where there is nothing to do and nothing to explain (an empty folder, a filter that matches nothing, an output with no lines yet); `EmptyState` where the user has to add the first thing or deal with a failure before the pane is of any use.

## Labels read

`listing.sortBy(column, direction)` names a sorting label: "Sort by Size, sorted descending".
