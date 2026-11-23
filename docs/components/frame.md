# Frame (`@bigpixelrocket/uiok/frame`)

The window every app of the family draws its content in: one grid with a top band (the title bar, then the main pane's tabs), a sidebar beside the main pane, a tray and a dock under the main pane, and the key legend across the foot. The parts inside are uiok's own (panes, listings, path bars, tab strips, legends); the frame places and sizes them and paints no ground of its own. Its look is `src/frame/frame.css` in `@bigpixelrocket/uiok/styles.css`.

- `WindowFrame`: the grid, with a slot for each part.
- `SidebarResizer`: the sidebar's edge, dragged to resize it (`draggedWidth`, its pure rule).
- `TreeToggle` and the `tree-*` classes: a sidebar's tree rows.
- `FilterChips`: a pane's quick row of filters (Running 3, Updates 2).
- `StatusNotice`: a message about the window in a pane's status line.
- `usePaneSplit` and `PaneSplitter`: the splitter between a page's list and the pane under it (`cutRowDepth`, the row it would cut).

## Example

```tsx
import { FilterChips, SidebarResizer, TreeToggle, WindowFrame } from '@bigpixelrocket/uiok/frame';
import { PanePathBar, PaneStatus, PaneTabs } from '@bigpixelrocket/uiok/pane';
import { TitleBar } from '@bigpixelrocket/uiok/shell';

<div className="app-shell" data-channel={channel}>
  <main className="shell-content">
    <div className="space-panel" tabIndex={-1}>
      <WindowFrame
        className="space-root listing-root"
        brand={<TitleBar trafficLights>{lockup}</TitleBar>}
        sidebarWidth={width}
        sidebar={
          <aside className="pane tree-pane">
            <PanePathBar crumbs={[{ label: 'Stack' }]} tools={tools} />
            <FilterChips label="Filters" chips={chips} on={on} onToggle={toggle} />
            <ul className="tree-list tree">{rows}</ul>
            <PaneStatus>3 running</PaneStatus>
          </aside>
        }
        resizer={<SidebarResizer label="Resize the sidebar" width={width} min={120} max={600} pageMin={100} onResize={setWidth} onResizeEnd={keepWidth} />}
        main={<section className="pane">…</section>}
        legend={<KeyLegendStrip … />}
      />
    </div>
  </main>
</div>;
```

## `WindowFrame` (`WindowFrameProps`)

| Prop           | Type        | Default | Purpose                                                                                      |
| -------------- | ----------- | ------- | -------------------------------------------------------------------------------------------- |
| `brand`        | `ReactNode` |         | The title bar at the band's leading end, as wide as the sidebar                              |
| `sidebar`      | `ReactNode` | none    | The sidebar's pane; none hides it and gives its room to the main pane, the tray, the dock    |
| `resizer`      | `ReactNode` | none    | The sidebar's edge, drawn while the sidebar shows                                            |
| `sidebarWidth` | `number`    |         | The sidebar's width in pixels, which the title bar matches, kept while the sidebar is hidden |
| `main`         | `ReactNode` |         | The main pane; a `PaneTabs` header at its top rises into the band beside the title bar       |
| `tray`         | `ReactNode` | none    | A strip that takes its turn under the main pane (files being imported)                       |
| `dock`         | `ReactNode` | none    | The dock under the main pane (a console, a log)                                              |
| `legend`       | `ReactNode` | none    | The key legend across the foot                                                               |
| `className`    | `string`    |         | The frame's own class beside `window-frame`, such as the space's root class                  |

Each part fills a `window-frame-slot`. While no tab shows, the band's empty end is the window's drag region (`window-frame-band-rest`), as is a tab row's empty end (`pane-tabs-rest`). With the sidebar hidden the main pane's tabs keep the place they have beside the title bar, so no tab moves.

A host that keeps its sidebar and main pane in one element of its own (for its keys or its drop zone) writes the grid with classes instead: `window-frame` on the root (`data-sidebar="hidden"` on it or on a direct child, `--window-band-width` on it), `window-frame-group` on any element between (it draws no box), and `window-frame-band`, `-band-lead`, `-band-rest`, `-sidebar`, `-resizer`, `-main`, `-tray`, `-dock`, `-legend` on the parts.

## The app's root

`app-shell` (the window's root: a column the window's height) holds `shell-content`, which holds `space-panel`, the focus boundary the content's keyboard commands work in (it draws no ring). A window with `app-shell` or an About window sets the interface face, the body's ground and text, and `--dialog-inset-top`, so a dialog keeps clear of the top band. `space-root` on a space's root lays it out as a column the panel's height, sizes every box by its border, and resets its buttons, code, fieldsets, and legends at zero weight; `space-nav-empty` is a sidebar's one quiet line when it has nothing to list. `page-slot` holds one page of the main pane: the front tab's page lays out as the pane's own child, and a held page stays mounted out of sight.

## Sidebar tree

| Class                                    | What it is                                                                                                                                                                                                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tree-pane`                              | On the sidebar's `pane`: 240px by default (`--sidebar-width`, or the host's `flex-basis`), leaving the page 100px; the row grid is the chevron's slot, the glyph, the name, one trailing column. Narrower than its title and tools, its path bar takes a line for each |
| `tree-list`                              | The `ul` of rows, with no list marks                                                                                                                                                                                                                                   |
| `tree`                                   | On the rows' container: each `row` steps in by `--tree-level` times `--tree-indent` (`--space-6`)                                                                                                                                                                      |
| `tree-band`                              | On a `row` that heads the rows under it (a server, a project): the strip's ground and a hairline under it                                                                                                                                                              |
| `tree-group`                             | On a `row` that groups others: its name dim, as a heading                                                                                                                                                                                                              |
| `tree-chev`                              | The disclosure chevron (`TreeToggle`)                                                                                                                                                                                                                                  |
| `tree-glyph`, `tree-name`, `tree-detail` | The node's glyph (row-meta tone), its name (cut with an ellipsis), quieter words after it                                                                                                                                                                              |
| `tree-row-tool`                          | A row's own tool (Hide), shown on the cursor row only                                                                                                                                                                                                                  |
| `tree-tool`                              | A row that is not a node (a filter field, a pager, a note) at its level's indent; `danger` lays out a failed read with its action under the reason; `tree-note` starts past the chevron's slot; `tree-heading` heads a group further down                              |
| `tree-note-glyph`, `tree-note-text`      | A tool row's glyph and words                                                                                                                                                                                                                                           |
| `tree-filter-input`                      | A bare field that fills its `tree-tool` row, the row underlined in the accent while it holds the keyboard                                                                                                                                                              |

On a cursor or marked row the quiet words (`tree-detail`, `tree-glyph`) take `--text-on-surface`. A band's quiet cursor (another pane focused, the window behind) keeps the strip's ground.

`TreeToggle` (`open`, `onToggle`, `label`) is the chevron, right while closed and down while open: a press toggles the row's children, never opens the row, leaves the focus where it was, and stays out of the Tab order, since the tree's keys open and close a row.

## Quick row

`pane-quick-row` under a pane's path bar: quiet buttons (`pane-quick-button`, with the track item's hover and press) with a glyph, a word, and a `pane-quick-count`, pressed (`aria-pressed="true"`) while a filter is on. A menu hangs from the row (`pane-quick-menu`, its `pane-quick-entry` rows of `pane-quick-link`, `pane-quick-empty` when it has none) and spans it, so the pane's clip never cuts an entry short; it grows to `--quick-menu-height`. `pane-warning` is a warning line under the path bar, over the rows.

`FilterChips` draws a quick row of filters:

| Prop       | Type                    | Purpose                                  |
| ---------- | ----------------------- | ---------------------------------------- |
| `chips`    | `readonly FilterChip[]` | `{ id, label, icon?, count? }`, in order |
| `on`       | `readonly Id[]`         | The filters that are on                  |
| `onToggle` | `(id) => void`          | Turns one on or off                      |
| `label`    | `string`                | The row's accessible name ("Filters")    |

## Status notice

`StatusNotice` (`tone`: `info`, `danger`, `success`; `icon`; `text`) goes in a `PaneStatus` in place of its words while a message about the window stands: the tone's glyph and the words on one line, cut with an ellipsis and whole in a tooltip. A failure is an alert, anything else a status. Its verbs (Show, Close) go in the status line's `tools`.

## Dock

`window-dock` on a pane in the dock (`closed` takes no room): a `pane-splitter` over its top edge sets its height; `dock-bar` is its toolbar, `dock-body` its body. A log in it is `dock-log` (`dock-log-entry` rows, `dock-log-empty`, `dock-log-actions` under an entry) over `dock-input`, what it takes typed in, ringed while it holds the keyboard.

## A list over the pane under it

`usePaneSplit(name, lowerScroller, layoutKey)` gives `{ upper, lower, drag, reset }`: refs for the upper list's scroller and the lower pane, the splitter's pointer handler, and the reset a double click runs. The height a user drags is kept per `name` while the window lives, and both regions come to rest at a whole row (`cutRowDepth(scroller)` is how far an edge cuts into its last visible row). `PaneSplitter` (`split`) is the band between them (`pane-splitter`, the resize cursor over the hairline). `split-detail` is the lower pane (as tall as what it shows until dragged, up to 38% of the page and never under seven dense rows; `folded` keeps it at its head), and `split-detail-body` its scrolling body.

## A page's parts

| Class                       | What it is                                                                                                                                                       |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pane-page`                 | A page in the main pane: a column that fills it                                                                                                                  |
| `pane-toolbar`              | One line of tools that keep their size; `pane-toolbar-grow` gives way, `pane-toolbar-end` stands at the far end, `pane-toolbar-gap` is a hairline between groups |
| `pane-page-filter`          | A page's filter under its tab strip                                                                                                                              |
| `pane-page-note`            | A loading or empty line: its glyph or spinner beside the words                                                                                                   |
| `pane-empty-action`         | The one command that answers an empty list, under its empty line                                                                                                 |
| `pane-section-head`         | A heading over one of a page's listings                                                                                                                          |
| `pane-foot-bar`             | A bar at a pane's foot under its list (a select-all bar, a form's actions)                                                                                       |
| `window-frame-show-sidebar` | On a path bar's Show panel tool, which leads the tools while the sidebar is hidden                                                                               |

## Keyboard

The frame adds no keys. The sidebar's edge is a pointer control (`role="separator"` with its width as its value); `TreeToggle` stays out of the Tab order; `FilterChips` and the quick row's buttons are buttons in the Tab order that leave the focus where it was when pressed.

## Labels read

None: every word is a prop.
