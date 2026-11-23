# Frame (`@bigpixelrocket/uiok/frame`)

The window every app of the family draws its content in: one grid with a top band (the title bar, then the main pane's tabs), a sidebar beside the main pane, a tray and a dock under the main pane, and the key legend across the foot. Every part is a component, so an app draws its whole window with no class, style, or element of its own; the classes in `src/frame/frame.css` (in `@bigpixelrocket/uiok/styles.css`) are the components' own. The parts inside the panes are uiok's too (path bars, tab strips, listings, legends).

- `AppRoot`, `SpacePanel`: the window's root and the panel its keys work in.
- `WindowFrame`: the grid, with a slot for each part; `SidebarResizer` is the sidebar's edge.
- `TreePane`, `TreeList`, `TreeRow`, `TreeTool`, `TreeFilterInput`, `SidebarEmpty`: the sidebar's tree (`TreeToggle` is a row's chevron).
- `FilterChips`, `PaneWarning`: a pane's quick row of filters and its warning line.
- `StatusNotice`: a message about the window in a pane's status line.
- `Dock`, `DockLog`, `DockLogEntry`, `DockInput`: the dock under the main pane.
- `usePaneSplit`, `PaneSplitter`, `SplitDetail`: a page's list over the pane under it.
- `PageSlot`, `PanePage`, `Toolbar`, `ToolbarGrow`, `ToolbarGap`, `PageFilter`, `PageNote`, `EmptyAction`, `SectionHead`, `SideBySide`, `FootBar`, `ShowSidebarButton`: a page's parts.

The panes themselves are `PaneBox` and `PaneList` from [Pane](pane.md).

## Example

```tsx
import { Switch } from '@bigpixelrocket/uiok/field';
import {
  AppRoot,
  FilterChips,
  PanePage,
  SidebarResizer,
  SpacePanel,
  TreeList,
  TreePane,
  TreeRow,
  WindowFrame
} from '@bigpixelrocket/uiok/frame';
import { StateMark } from '@bigpixelrocket/uiok/listing';
import { PaneBox, PaneList, PanePathBar, PaneStatus, PaneTabs } from '@bigpixelrocket/uiok/pane';
import { TitleBar } from '@bigpixelrocket/uiok/shell';

<AppRoot channel={channel}>
  <SpacePanel onKeyDown={keys}>
    <WindowFrame
      brand={<TitleBar trafficLights>{lockup}</TitleBar>}
      sidebarWidth={width}
      sidebar={
        <TreePane active={pane === 'sidebar'} width={width}>
          <PanePathBar trail={['Stack']}>{tools}</PanePathBar>
          <FilterChips label="Filters" chips={chips} on={on} onToggle={toggle} />
          <TreeList label="Stack">
            <TreeRow rowKey="pg" level={1} glyph={<Database />} name="PostgreSQL"
              trailing={<StateMark tone="ready" word="5432" />}
              tool={<Switch checked label="Run PostgreSQL" labelHidden onChange={run} />} />
          </TreeList>
          <PaneStatus>3 running</PaneStatus>
        </TreePane>
      }
      resizer={<SidebarResizer label="Resize the sidebar" width={width} min={120} max={600} pageMin={100} onResize={setWidth} onResizeEnd={keepWidth} />}
      main={
        <PaneBox active={pane === 'main'}>
          <PaneTabs … />
          <PanePage>
            <PaneList home>…</PaneList>
          </PanePage>
          <PaneStatus>…</PaneStatus>
        </PaneBox>
      }
      legend={<KeyLegendStrip … />}
    />
  </SpacePanel>
</AppRoot>;
```

## The app's root

`AppRoot` (`channel`, `children`) is the window's root: a column the window's height whose content owns the whole window, the top band included. `channel` is the release channel the window wears (`data-channel`), which colours its `ChannelMarker` and channel tags; none on the release. A window with `AppRoot` or an `AboutWindow` sets the interface face, the body's ground and text, and `--dialog-inset-top`, so a dialog keeps clear of the top band.

`SpacePanel` (`ref`, the region handlers, `children`) is the focus boundary the content's keyboard commands work in, inside `AppRoot`: focusable by script, out of the Tab order, with no ring. The region handlers, here and on every part below that takes them, are `onKeyDown`, `onKeyDownCapture`, `onFocus`, `onBlur`, `onMouseDown`, `onPointerDown`, `onContextMenu`, and the drag and drop handlers (`RegionHandlers`). `onContextMenu` is the region's own menu, and the innermost menu wins: it runs only for a secondary click nothing inside the region cancelled, then cancels the browser's menu itself, so a `Row`'s `onContextMenu` ([Listing](listing.md)) takes a click on its row, the `PaneBox` around it a click no row took, `WindowFrame`'s `group` one no pane took, and `SpacePanel`, around the whole frame and its band, the rest. One click opens one menu. A `Terminal` and an open `Menu` cancel their own clicks, so the parts around them pass those by too.

## `WindowFrame` (`WindowFrameProps`)

| Prop           | Type               | Default | Purpose                                                                                                                                               |
| -------------- | ------------------ | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `brand`        | `ReactNode`        |         | The title bar at the band's leading end, as wide as the sidebar                                                                                       |
| `sidebar`      | `ReactNode`        | none    | The sidebar's pane (`TreePane`); none hides it and gives its room to the main pane, the tray, the dock                                                |
| `resizer`      | `ReactNode`        | none    | The sidebar's edge (`SidebarResizer`), drawn while the sidebar shows                                                                                  |
| `sidebarWidth` | `number`           |         | The sidebar's width in pixels, which the title bar matches, kept while the sidebar is hidden                                                          |
| `main`         | `ReactNode`        |         | The main pane (`PaneBox`); a `PaneTabs` header at its top rises into the band beside the title bar                                                    |
| `tray`         | `ReactNode`        | none    | A strip that takes its turn under the main pane (files being imported)                                                                                |
| `dock`         | `ReactNode`        | none    | The dock under the main pane (`Dock`)                                                                                                                 |
| `legend`       | `ReactNode`        | none    | The key legend across the foot                                                                                                                        |
| `group`        | `WindowFrameGroup` | none    | Gathers the sidebar, its edge, the main pane, the tray, and the dock in one element with these handlers and ref                                       |
| `trailing`     | `ReactNode`        | none    | At the band's trailing end, out of the drag region (the `UpdatePill`), for a main pane with no tabs; one with tabs takes it as `PaneTabs`' `trailing` |

The frame is the space's root in the listing look: a column the panel's height that sizes every box by its border and resets its buttons, code, fieldsets, and legends at zero weight. While no tab shows, the band's empty end is the window's drag region, as is a tab row's empty end. With the sidebar hidden the main pane's tabs keep the place they have beside the title bar, so no tab moves. A slot given `false` (`cond && <Part />`) draws nothing, as one left out does. A host that keeps its sidebar and main pane in one element (for its keys or its drop zone) passes `group`: the element draws no box, so the parts keep their places in the grid.

`SidebarResizer` (`label`, `width`, `min`, `max`, `pageMin`, `onResize`, `onResizeEnd`) is the sidebar's edge, in the gap beside the page: the pointer drags it, kept between `min` and the widest the room allows less `pageMin` (`draggedWidth`, its pure rule).

## Sidebar tree

`TreePane` (`width`, `active`, `label`, `ref`, the region handlers) is the sidebar's pane: 240px unless `width` is given (`--sidebar-width`), leaving the page 100px, its rows laid out as the chevron's slot, the glyph, the name, one trailing column. Narrower than its title and tools, its path bar takes a line for each. `TreeList` (`label`) holds the rows: the sidebar's home (`data-pane-home="sidebar"`, which `usePaneKeys` hands the focus and finds the sidebar by), a `tree`.

`TreeRow`:

| Prop        | Type                          | Default | Purpose                                                                                                                                                                             |
| ----------- | ----------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowKey`    | `string`                      |         | Names the row to the pane's cursor (`data-row-key`)                                                                                                                                 |
| `level`     | `number`                      | `0`     | How deep it stands; each level steps it in by `--space-6`                                                                                                                           |
| `kind`      | `'node' \| 'band' \| 'group'` | `node`  | A band heads the rows under it (a server, a project) on the strip's ground; a group's name reads as a heading                                                                       |
| `toggle`    | `TreeRowToggle`               | none    | `{ open, onToggle, label }`: the chevron of a row with children                                                                                                                     |
| `glyph`     | `ReactNode`                   | none    | The node's glyph, in the quiet tone                                                                                                                                                 |
| `name`      | `ReactNode`                   |         | Its name, cut with an ellipsis (whole in its tooltip when a string)                                                                                                                 |
| `detail`    | `ReactNode`                   | none    | Quieter words after the name (×3)                                                                                                                                                   |
| `trailing`  | `ReactNode`                   | none    | The trailing column: a count, a port, a `StateMark`                                                                                                                                 |
| `tool`      | `ReactNode`                   | none    | The row's own tool (Hide, a `Switch`), shown on the cursor row only                                                                                                                 |
| `marked`    | `boolean`                     | `false` | Chosen though it is not the cursor row                                                                                                                                              |
| `onOpen`    | `() => void`                  | none    | Opens the row's item on a click anywhere but its controls                                                                                                                           |
| `focusable` | `boolean`                     | `false` | The row itself takes the focus: in the Tab order while it is the cursor row                                                                                                         |
| `add`       | `boolean`                     | `false` | The row adds one under its parent ("Add runtime…"): an accent plus in the glyph's slot unless `glyph` gives another, dim words that turn full on hover and the cursor (`.pane-add`) |

Like a listing's `Row`, a tree row follows the pane's cursor (`RowCursorContext`): the cursor row wears the cursor's look and `aria-current`, and the pointer moving over a row or the focus entering it moves the cursor there. On a cursor or marked row the quiet words (the glyph, the detail) take `--text-on-surface`. A band's quiet cursor (another pane focused, the window behind) keeps the strip's ground. Its controls leave the Tab order, since the tree's keys run them; the expansion and its keys stay the host's. While the `TreeList` holds the focus, its `aria-activedescendant` is the cursor row, so a screen reader follows the keys.

`TreeToggle` (`open`, `onToggle`, `label`) is the chevron `TreeRow` draws for `toggle`, right while closed and down while open: a press toggles the row's children, never opens the row, leaves the focus where it was, and stays out of the Tab order.

`TreeTool` (`kind`, `level`, `icon`, `text`, `rowKey`, `cursor`, `children`) is a row that is not a node, at its level's indent in the small size: `tool` (a filter field, a pager, an Add action), `note` (starts past the chevron's slot), `heading` (heads a group further down, over a hairline), or `danger` (a failed read, announced as an alert, its reason wrapping and its action under it). With a `rowKey` it joins the pane's cursor as a `TreeRow` does (the cursor's keys reach it, the pointer moves the cursor to it, and the tree names it as its active descendant, a `treeitem`); like a `TreeRow`'s, its controls then leave the Tab order, so the view's keys for that row (`usePaneKeys`'s `run`) must reach what they do, such as focusing its filter field; without one it stands outside the cursor, which `cursor` draws. `TreeFilterInput` (`value`, `onChange`, `label`, `placeholder`, `onKeyDown`, `ref`) is a bare field that fills its `TreeTool` row, the row underlined in the accent while it holds the keyboard. `SidebarEmpty` is a sidebar's one quiet line when it has nothing to list.

## Quick row

`FilterChips` draws a quick row of filters under a pane's path bar: quiet buttons with a glyph, a word, and a count, pressed (`aria-pressed="true"`) while a filter is on.

The row is one line however many chips it holds:

- **It scrolls sideways.** Chips that do not fit scroll inside the row, with no scrollbar drawn, under the base sheet's inline edge fade (`.scroll-fade-x`), which fades only an edge that has more past it. The rule under the row stays solid.
- **A mouse wheel turns it.** A vertical wheel over the row scrolls it sideways while it has chips hidden that way, down and right toward its end (left in a right-to-left page), a line-counting wheel moving a row's height (24px) a line. A trackpad's sideways swipe, a wheel with Shift (the browser's own sideways wheel), Control, or Command (zoom), and any gesture more sideways than vertical stay the browser's own. Once the row stands at the end the wheel points to, or holds nothing hidden, the wheel is left alone and the page under it scrolls as usual. The pure rule is `sidewaysWheel` in `FilterChips.logic.ts`.
- **The keys bring a chip into view.** A chip Tab reaches scrolls whole into view (`scrollIntoView({ block: 'nearest', inline: 'nearest' })`), stopping clear of the fade and its focus ring (the row's `scroll-padding-inline`). In a right-to-left page the fade sits on the edges the row reads from, as the scroll runs.
- **Nothing scrolls smoothly.** The wheel and the keys move the row at once (`scroll-behavior: auto` on the row), so `prefers-reduced-motion: reduce` has no motion here to stop.

| Prop       | Type                    | Purpose                                  |
| ---------- | ----------------------- | ---------------------------------------- |
| `chips`    | `readonly FilterChip[]` | `{ id, label, icon?, count? }`, in order |
| `on`       | `readonly Id[]`         | The filters that are on                  |
| `onToggle` | `(id) => void`          | Turns one on or off                      |
| `label`    | `string`                | The row's accessible name ("Filters")    |

`PaneWarning` is a warning line under a pane's path bar, over its rows, read as a status.

## Status notice

`StatusNotice` (`tone`: `info`, `danger`, `success`; `icon`; `text`) goes in a `PaneStatus` in place of its words while a message about the window stands: the tone's glyph and the words on one line, cut with an ellipsis and whole in a tooltip. A failure is an alert, anything else a status. Its verbs (Show, Close) go in the status line's `tools`.

## Dock

`Dock` (`open`, `label`, `height`, `pageMin`, `active`, `tone`, `onResize`, `onResizeEnd`, `resizeLabel`, `bar`, `ref`, the region handlers, `children`) is a pane in `WindowFrame`'s `dock`: its toolbar (`bar`), then its body, which scrolls, at the `height` the host keeps. It never grows with what it shows, and in a window too short for both it gives way so the main pane over it keeps `pageMin` (160px unless given; `dockHeight` is the rule). With `onResize` its top edge, in the gap over it, is a separator named `resizeLabel` that drags its height; `onResizeEnd` hears the height to keep. `tone="danger"` draws its frame in the danger colour, as a `PaneBox`'s. Closed, it takes no room and keeps its state. `DockLog` (`label`, `empty`) is a log in its body, entries over a hairline each with the newest at the foot, saying `empty` while it has none; entries far from the foot skip layout until scrolled to. `DockLogEntry` (`actions`) is one entry with its verbs under it. `DockInput` holds what the dock takes typed in at the log's foot, ringed while it holds the keyboard, growing to half the dock and then scrolling.

## A list over the pane under it

`usePaneSplit(name, layoutKey, lowerScroller?)` gives `{ upper, lower, drag, reset }`: the ref for the upper list (a `PaneList`'s `ref`), the ref `SplitDetail` takes, the splitter's pointer handler, and the reset a double click runs. The height a user drags is kept per `name` while the window lives, and both regions come to rest at a whole row (`cutRowDepth(scroller)` is how far an edge cuts into its last visible row). `layoutKey` changes when the rows change (a load, a tab switch); `lowerScroller` names the lower pane's own list when it is not `SplitDetail`'s body. A dragged height gives way in a shorter window, so the upper list keeps at least two rows (`heldSplitHeight` is the rule), and the slice an at-rest split would cut from the upper list's last row goes to the lower pane. `PaneSplitter` (`split`) is the band between them, the resize cursor over the hairline. `SplitDetail` (`split`, `folded`, `label`, `head`, `children`) is the lower pane: as tall as what it shows until dragged, up to 38% of the page and never under seven dense rows, its body scrolling under its `head`; `folded` keeps it at its head alone.

## A page's parts

| Component           | What it is                                                                                                                                                                                |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PageSlot`          | One page of the main pane (`shown`): the front tab's lays out as the pane's own child, a held page stays mounted out of sight, where `usePaneKeys` never reaches its home, rows, or verbs |
| `PanePage`          | A page in the main pane: a column that fills it                                                                                                                                           |
| `Toolbar`           | One line of tools that keep their size, `end` at the far end; `ToolbarGrow` gives way, `ToolbarGap` is a hairline between groups                                                          |
| `PageFilter`        | A page's filter under its tab strip                                                                                                                                                       |
| `PageNote`          | A loading or empty line, or a note after a listing (`icon`, or `busy` for the spinner and a status); outside every listing scope it carries the scope itself                              |
| `EmptyAction`       | The one command that answers an empty list, under its `PageNote`                                                                                                                          |
| `SectionHead`       | A heading over one of a page's listings, as an overline (`level`, 3 unless given)                                                                                                         |
| `SideBySide`        | Two listings or sections side by side from a width of the pair's own room, stacked in less (below)                                                                                        |
| `FootBar`           | A bar at a pane's foot under its list (a select-all bar, a form's actions)                                                                                                                |
| `ShowSidebarButton` | Shows the hidden sidebar again (`label`, `onShow`, `icon`), leading a path bar's tools                                                                                                    |

### Two listings side by side

```tsx
<SideBySide
  first={<Listing title="Settings">…</Listing>}
  firstLabel="Settings"
  from={640}
  second={<Listing title="Extensions">…</Listing>}
  secondLabel="Extensions"
/>
```

`SideBySide` (`from`, `first`, `firstLabel`, `second`, `secondLabel`) puts two of a page's listings or sections in two equal columns while the room the pair itself is given is `from` pixels wide or more, and the second under the first in less, with a hairline between them either way. Each part is a `group` named by its label.

- **Its own width, not the window's.** A pane narrowed by its sidebar, a split, or a dock stacks the pair though the window is wide. The component measures its own width with a `ResizeObserver` before the first paint and says the layout in `data-layout` (`side-by-side` or `stacked`), which the stylesheet reads. A container query cannot do it: its condition reads no custom property, so a per-instance `from` could not reach it. A width of 0 (a page held out of sight) keeps the layout it had, and stacked is the layout until the first measure. Once side by side, the pair stacks again only under `from` less 20px, wider than a classic scrollbar: two columns can be taller than one stack, and the scrollbar they bring would otherwise narrow the pair under `from`, stack it, lose the scrollbar, and stand it side by side again, over and over. A changed `from` has no hold: the first width measured against it (at once, or when a page hidden through the change comes into view) decides the layout by `from` alone.
- **One cursor, in reading order.** The pair holds no cursor and answers no key. Under `usePaneKeys` the page keeps its one cursor and its one home: put the pair inside the page's `PaneList home`, never a `home` on each side, since the keys hand the focus to the first home they find. ↑ and ↓ walk the first part's rows, then the second's (`data-row-key` in document order), side by side as stacked, so ↓ on the first part's last row lands on the second's first; every row key is unique across both. Tab walks the first part's controls before the second's.
- **A cursor on each side.** To give each side a cursor of its own, give each its own `RowCursorContext` and its own focusable list with its own keys; each is then a Tab stop of its own, and the arrows move the cursor of the side holding the focus.

## Keyboard

The frame adds no keys. The sidebar's edge and a dock's top edge are pointer controls (`role="separator"`); they take no focus, so they carry no value a screen reader would offer to change; a tree row's chevron and its tools stay out of the Tab order; `FilterChips` are buttons in the Tab order that leave the focus where it was when pressed. `SpacePanel`, `TreeList`, and a `PaneList` with `home` take the focus by script only.

## Labels read

None: every word is a prop.
