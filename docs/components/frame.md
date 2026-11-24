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

`TreePane` (`width`, `active`, `label`, `bell`, `ref`, the region handlers) is the sidebar's pane: 240px unless `width` is given (`--sidebar-width`), leaving the page 100px, its rows laid out as the chevron's slot, the glyph, the name, one trailing column. Narrower than its title and tools, its path bar takes a line for each. `bell` is the visual bell, as a `PaneBox`'s ([Pane](pane.md)): a count the host raises each time a sidebar key could not act (a move past the last row, a verb the cursor row does not offer), each rise shoving the cursor row sideways for one beat, or flashing it under reduced motion. `TreeList` (`label`) holds the rows: the sidebar's home (`data-pane-home="sidebar"`, which `usePaneKeys` hands the focus and finds the sidebar by), a `tree`.

`TreeRow`:

| Prop            | Type                          | Default | Purpose                                                                                                                                                                                     |
| --------------- | ----------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rowKey`        | `string`                      |         | Names the row to the pane's cursor (`data-row-key`)                                                                                                                                         |
| `level`         | `number`                      | `0`     | How deep it stands; each level steps it in by `--space-6`                                                                                                                                   |
| `kind`          | `'node' \| 'band' \| 'group'` | `node`  | A band heads the rows under it (a server, a project) on the strip's ground; a group's name reads as a heading                                                                               |
| `toggle`        | `TreeRowToggle`               | none    | `{ open, onToggle, label }`: the chevron of a row with children                                                                                                                             |
| `glyph`         | `ReactNode`                   | none    | The node's glyph, in the quiet tone                                                                                                                                                         |
| `name`          | `ReactNode`                   |         | Its name, cut with an ellipsis (whole in its tooltip when a string)                                                                                                                         |
| `detail`        | `ReactNode`                   | none    | Quieter words after the name (×3)                                                                                                                                                           |
| `trailing`      | `ReactNode`                   | none    | The trailing column: a count, a port, a `StateMark`, a `ToneIcon` (an update arrow in the warning tone)                                                                                     |
| `tool`          | `ReactNode`                   | none    | The row's own tool (Hide, a `Switch`), shown on the cursor row only                                                                                                                         |
| `marked`        | `boolean`                     | `false` | Chosen though it is not the cursor row                                                                                                                                                      |
| `dim`           | `boolean`                     | `false` | The item is not there or cannot be used yet (an Add row while a tool it needs is missing): its name in the row-meta tone, `--text-on-surface` on the cursor, a mark, and hover (`.row-dim`) |
| `onOpen`        | `() => void`                  | none    | Opens the row's item on a click anywhere but its controls                                                                                                                                   |
| `onContextMenu` | `(event, rowKey) => void`     | none    | A secondary click for the row's menu (below)                                                                                                                                                |
| `focusable`     | `boolean`                     | `false` | The row itself takes the focus: in the Tab order while it is the cursor row                                                                                                                 |
| `add`           | `boolean`                     | `false` | The row adds one under its parent ("Add runtime…"): an accent plus in the glyph's slot unless `glyph` gives another, dim words that turn full on hover and the cursor (`.pane-add`)         |

Like a listing's `Row`, a tree row follows the pane's cursor (`RowCursorContext`): the cursor row wears the cursor's look and `aria-current`, and the pointer moving over a row or the focus entering it moves the cursor there. On a cursor or marked row the quiet words (the glyph, the detail) take `--text-on-surface`. A `dim` row reads as a listing's dim `Row` (a dim add row as one, its plus faded and out of the accent, [Listing](listing.md)): its name in `--row-meta-text` at rest (a dim group's too, not the group's heading tone), `--text-on-surface` on the cursor, a mark, or under the pointer (a tree needs no `.pointer` for it); it is a look only, so the row still takes the cursor, opens, and opens its menu, and the host says why it is dim (a `TreeTool` note under it) and what opening it does. A band's quiet cursor (another pane focused, the window behind) keeps the strip's ground. Its controls leave the Tab order, since the tree's keys run them; the expansion and its keys stay the host's. A row is named by the words it draws, in their order (`aria-labelledby` over its name with its detail, then its trailing column): "shop 5/8", never its chevron's label ("Collapse shop") or its tool's, which are controls of their own. While the `TreeList` holds the focus, its `aria-activedescendant` is the cursor row, so a screen reader follows the keys.

A tree row's menu works as a listing `Row`'s ([Listing](listing.md)): `onContextMenu(event, rowKey)` takes a secondary click (the right button, a Control-click), moves the pane's cursor to the row first (`RowCursorContext`'s `point`), cancels the browser's own menu, and hands the event (open the menu at `clientX` and `clientY`) and the row's key to the host, so one handler serves every row and the menu's verbs act on the cursor row. A click a control inside the row already cancelled passes the row by. The row's handler wins: the `TreeList` and `TreePane` around it open their own menus (their `onContextMenu`, the region handlers) only for a click nothing inside took. From the keyboard, the focus sits on the `TreeList`, the tree's home: right after the Menu key or Shift-F10 (with no other modifier) goes down on it, it hands the browser's resulting secondary click to the cursor row when that row has an `onContextMenu` (it carries `data-row-menu`), its event placed under the row's leading edge, as a page's `PaneList` with `home` does; a cursor row without one, and a pointer's click on the list's empty space, stay the list's.

`TreeToggle` (`open`, `onToggle`, `label`) is the chevron `TreeRow` draws for `toggle`, right while closed and down while open: a press toggles the row's children, never opens the row, leaves the focus where it was, and stays out of the Tab order.

`TreeTool` (`kind`, `level`, `icon`, `text`, `rowKey`, `cursor`, `children`) is a row that is not a node, at its level's indent in the small size: `tool` (a filter field, a pager, an Add action), `note` (starts past the chevron's slot), `heading` (heads a group further down, over a hairline), or `danger` (a failed read, announced as an alert, its reason wrapping and its action under it). Words given as a string that a narrow sidebar cuts with an ellipsis show whole in a tooltip, only while cut (`cutTooltip`). With a `rowKey` it joins the pane's cursor as a `TreeRow` does (the cursor's keys reach it, the pointer moves the cursor to it, and the tree names it as its active descendant, a `treeitem`); like a `TreeRow`'s, its controls then leave the Tab order, so the view's keys for that row (`usePaneKeys`'s `run`) must reach what they do, such as focusing its filter field; without one it stands outside the cursor, which `cursor` draws. `TreeFilterInput` (`value`, `onChange`, `label`, `placeholder`, `onKeyDown`, `ref`) is a bare field that fills its `TreeTool` row, the row underlined in the accent while it holds the keyboard. `SidebarEmpty` is a sidebar's one quiet line when it has nothing to list.

## Quick row

`FilterChips` draws a quick row of filters under a pane's path bar: quiet buttons with a glyph, a word, and a count, pressed (`aria-pressed="true"`) while a filter is on.

The row is one line however many chips it holds:

- **It scrolls sideways.** Chips that do not fit scroll inside the row, with no scrollbar drawn, under the base sheet's inline edge fade (`.scroll-fade-x`), which fades only an edge that has more past it. The rule under the row stays solid.
- **A mouse wheel turns it.** A vertical wheel over the row scrolls it sideways while it has chips hidden that way, down and right toward its end (left in a right-to-left page), a line-counting wheel moving a row's height (24px) a line. A trackpad's sideways swipe, a wheel with Shift (the browser's own sideways wheel), Control, or Command (zoom), and any gesture more sideways than vertical stay the browser's own. Once the row stands at the end the wheel points to, or holds nothing hidden, the wheel is left alone and the page under it scrolls as usual. The pure rule is `sidewaysWheel` in `FilterChips.logic.ts`.
- **The keys bring a chip into view.** A chip Tab reaches scrolls whole into view (`scrollIntoView({ block: 'nearest', inline: 'nearest' })`), stopping clear of the fade and its focus ring (the row's `scroll-padding-inline`). In a right-to-left page the fade sits on the edges the row reads from, as the scroll runs.
- **Nothing scrolls smoothly.** The wheel and the keys move the row at once (`scroll-behavior: auto` on the row), so `prefers-reduced-motion: reduce` has no motion here to stop.

With `wrap`, the row is a multi-choice control for a narrow cell instead: chips that do not fit go on to further lines (`pane-quick-row-wrap`), so every chip shows, with no edge fade, no sideways scroll, and no wheel turned sideways. In a listing `Row`'s `Cell`, the row grows to hold its chips, on one line or every line of chips that wrap (the row height its floor, not its cap), so the chips never run over the rows below. In a cell, wrapping or not, chips are a control and not a pane's band: they draw no rule under them, take no row inset of their own and a slim block padding, and ring a focused chip inside it, since the cell clips. On a row's state fill (the cursor, a mark, the pointer's row hover, the grey selection) a chip at rest and every count take `--text-on-surface`, and a chip that is on gives up its accent wash and keeps `--text` and its ring (`--current-ring`, or `--control-border-strong` on the neutral `--fill` of a quiet mark or the grey selection, where the current ring is not floored; a focused chip's ring takes it there too). On a selection that holds the keys every chip and count takes `--on-selected`, an on chip stands on `--selection-hit` inside an `--on-selected` ring, a chip under the pointer or held takes `--selection-hit` alone, and the focus ring is drawn in `--on-selected`. Each pairing keeps 4.5:1 for words and 3:1 for a ring in every theme (`tokens.test.ts`). The chips stay buttons in the Tab order, pressed while on, and a press still toggles one and leaves the focus where it was. The one scrolling line is the default.

```tsx
<FilterChips label="Extensions" chips={extensions} on={picked} onToggle={toggle} wrap />
```

With `disabled`, every chip is a disabled button while what the chips set cannot change (its owner is busy, as a `Select` or `Switch` beside them is disabled): the base sheet's disabled rule dims them, they leave the Tab order, a click or a key toggles nothing, no hover or press recipe touches them, and the words stay legible. A chip that is on keeps `aria-pressed="true"` and its on look under the dimming.

```tsx
<FilterChips label="Modes" chips={modes} on={picked} onToggle={toggle} wrap disabled={busy} />
```

| Prop       | Type                    | Purpose                                                                                                                   |
| ---------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `chips`    | `readonly FilterChip[]` | `{ id, label, icon?, count? }`, in order                                                                                  |
| `on`       | `readonly Id[]`         | The filters that are on                                                                                                   |
| `onToggle` | `(id) => void`          | Turns one on or off                                                                                                       |
| `label`    | `string`                | The row's accessible name ("Filters")                                                                                     |
| `wrap`     | `boolean`               | Chips wrap onto further lines instead of scrolling sideways (a multi-choice control in a narrow cell); `false` by default |

`PaneWarning` is a warning line under a pane's path bar, over its rows, read as a status.

## Status notice

`StatusNotice` (`tone`: `info`, `danger`, `success`; `icon`; `text`) goes in a `PaneStatus` in place of its words while a message about the window stands: the tone's glyph and the words on one line, cut with an ellipsis and whole in a tooltip. A failure is an alert, anything else a status. Its verbs (Show, Close) go in the status line's `tools`.

## Dock

`Dock` (`open`, `label`, `height`, `pageMin`, `active`, `tone`, `onResize`, `onResizeEnd`, `resizeLabel`, `bar`, `ref`, the region handlers, `children`) is a pane in `WindowFrame`'s `dock`: its toolbar (`bar`), then its body, which scrolls, at the `height` the host keeps. It never grows with what it shows, and in a window too short for both it gives way so the main pane over it keeps `pageMin` (160px unless given; `dockHeight` is the rule). With `onResize` its top edge, in the gap over it, is a separator named `resizeLabel` that drags its height; `onResizeEnd` hears the height to keep. `tone="danger"` draws its frame in the danger colour, as a `PaneBox`'s. Closed, it takes no room and keeps its state. `DockLog` (`label`, `empty`) is a log in its body, entries over a hairline each with the newest at the foot, saying `empty` while it has none; entries far from the foot skip layout until scrolled to. `DockLogEntry` (`actions`) is one entry with its verbs under it. `DockInput` holds what the dock takes typed in at the log's foot, ringed while it holds the keyboard, growing to half the dock and then scrolling.

## A list over the pane under it

`usePaneSplit(name, layoutKey, lowerScroller?)` gives `{ upper, lower, drag, reset }`: the ref for the upper list (a `PaneList`'s `ref`), the ref `SplitDetail` takes, the splitter's pointer handler, and the reset a double click runs. The height a user drags is kept per `name` while the window lives, and both regions come to rest at a whole row (`cutRowDepth(scroller)` is how far an edge cuts into its last visible row). `layoutKey` changes when the rows change (a load, a tab switch); `lowerScroller` names the lower pane's own list when it is not `SplitDetail`'s body. A dragged height gives way in a shorter window, so the upper list keeps at least two rows (`heldSplitHeight` is the rule), and the slice an at-rest split would cut from the upper list's last row goes to the lower pane. `PaneSplitter` (`split`) is the band between them, the resize cursor over the hairline. `SplitDetail` (`split`, `folded`, `label`, `head`, `children`) is the lower pane: as tall as what it shows until dragged, up to 38% of the page and never under seven dense rows, its body scrolling under its `head`; `folded` keeps it at its head alone.

## A page's parts

| Component           | What it is                                                                                                                                                                                                                                                                                       |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PageSlot`          | One page of the main pane (`shown`): the front tab's lays out as the pane's own child, a held page stays mounted out of sight, where `usePaneKeys` never reaches its home, rows, or verbs                                                                                                        |
| `PanePage`          | A page in the main pane: a column that fills it                                                                                                                                                                                                                                                  |
| `Toolbar`           | One line of tools that keep their size, `end` at the far end; `ToolbarGrow` gives way, `ToolbarGap` is a hairline between groups. Set straight in a pane's body (a `PaneList`, `PanePage`, `PageSlot`, or `SideBySide` part) it keeps the rows' inset (`--pane-row-inset`) from the pane's edges |
| `PageFilter`        | A page's filter under its tab strip                                                                                                                                                                                                                                                              |
| `PageNote`          | A loading or empty line, or a note after a listing (`icon`, or `busy` for the spinner and a status); outside every listing scope it carries the scope itself                                                                                                                                     |
| `EmptyAction`       | The one command that answers an empty list, under its `PageNote`                                                                                                                                                                                                                                 |
| `SectionHead`       | A heading over one of a page's listings, as an overline (`level`, 3 unless given)                                                                                                                                                                                                                |
| `SideBySide`        | Two listings or sections side by side once the pair's own room passes a floor and holds each at its min-content width, stacked otherwise (below)                                                                                                                                                 |
| `FootBar`           | A bar at a pane's foot under its list (a select-all bar, a form's actions)                                                                                                                                                                                                                       |
| `ShowSidebarButton` | Shows the hidden sidebar again (`label`, `onShow`, `icon`), leading a path bar's tools                                                                                                                                                                                                           |

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

`SideBySide` (`from`, `first`, `firstLabel`, `second`, `secondLabel`) puts two of a page's listings or sections in two equal columns while the room the pair itself is given is `from` pixels wide or more and each half holds its part at the part's min-content width, and the second under the first otherwise, with a hairline between them either way. Each part is a `group` named by its label.

- **By its content, over a floor.** The pair stands side by side only where neither part would overflow its half: the room it needs is twice the wider part's min-content width (the hairline included), so a section whose content will not narrow (a toolbar of tools that keep their size, a form's label column and fields, a long unbreakable word, a one-line `FilterChips` row) stacks the pair though the room passes `from`. A one-line chip row scrolls its chips, so its own box says nothing of them (in a listing's flexible column it lays out nearly nothing wide): it counts at its whole content width, the width it hides added to its part's, so chips that would scroll out of sight in a half stack the pair. That width only bounds the need from below (a listing whose flexible columns share the extra width gives its chips part of it), so before standing the pair side by side the component lays the halves out for one more read and stands them side by side only where no one-line chip row hides a chip. That read runs only for a pair with a one-line chip row or a pop-up button (below) whose room passes the need, so such a measure lays out twice at most (the min-content column, then the halves), three times with a pop-up button in the pair (its whole width), and one time fewer where a pair held under `from` reuses the need it read last instead of the min-content column; a stacked pair's height, read with its width before either, holds it through the halves read, so a scrolled pane keeps its scroll. Held side by side and narrowed by no more than a scrollbar's width under the width where the chips last showed whole, a chip row may hide chips only while it has lost no more room than the narrowing took from a half (half the narrowing, each row against its own room there), and only while its content is no wider than it was there (each row's chips end to end, read from a range over its contents whatever room the row had to spare; the same rows in the same order). Chips that grew stack the pair, even within that half, and so does a column beside them that grew and took more. A host drawing the same parts again keeps the hold. A row with `wrap` counts as laid out, since it hides nothing. A pop-up button (a `Select`, a `select` that is no list box) is checked in the halves the same way: it stands at its items' width but narrows to its column in a form (`max-width: 100%`) or keeps its width and is clipped by its cell in a listing, so in the halves read the component compares what it shows (its span within every box that clips it, on either side, so a right-to-left cell that clips its start counts) with its whole width (read once more with that hold lifted, `data-natural`: one more layout read for the pair's pop-up buttons together), and stacks the pair where a half would cut it, held side by side under the same rules as a chip row against three bounds on its room, each of which may lose no more than half the narrowing: its holder's whole content box (a form's value column, a listing's cell), so room a squeezed column had to spare counts; the holder from its left edge to the button's right edge, for a clip from the left; and from the button's left edge to the holder's right edge, for a clip from the right. The sides follow where the button sits in its holder, not any `direction`, so a sibling that grows before it in the cell takes room it counts, whether the cell is laid out left to right or right to left and whatever direction the button's own words run. `from` is a floor: under it the pair stacks however narrow its content. A part whose content shrinks to nothing, such as a listing whose names an ellipsis cuts, asks for little, so `from` is what keeps two listings apart. The component reads the min-content widths by laying the parts out in one `min-content` column for one read (`data-measuring`; the column is as wide as the wider part) and back before the browser paints, in the same `ResizeObserver` callback that reads the room: one extra layout per resize frame (two with a one-line chip row, three with a pop-up button, above), never reads and writes interleaved; none while the room is under the floor, and none while a pair held side by side under `from` only changed width (a scrollbar), where the need read last still holds; and one at most each time the pair renders. One column, with the hairline under the first kept, so the pair never grows shorter for the read, and a scrolled pane around it keeps its scroll. Content that changes decides again with no resize of the pair, though each part's box stays as wide as its column: new `first` or `second` from the host, and any change to the nodes or words inside (a `MutationObserver` that reads no attribute, so the layout's own attributes and a row's cursor never wake it). A min-content width belongs to the content, not to the layout chosen, so choosing a layout cannot set off another.

- **Its own width, not the window's.** A pane narrowed by its sidebar, a split, or a dock stacks the pair though the window is wide. The component measures its own width with a `ResizeObserver` before the first paint and says the layout in `data-layout` (`side-by-side` or `stacked`), which the stylesheet reads. A container query cannot do it: its condition reads no custom property, so a per-instance `from` could not reach it. A width of 0 (a page held out of sight) keeps the layout it had, and stacked is the layout until the first measure. Once side by side, the pair stacks again only under the room it needs (`from`, or its content's need when that is more) less 20px, wider than a classic scrollbar, while that need is no more than it was; content that now needs more stacks it with no hold: two columns can be taller than one stack, and the scrollbar they bring would otherwise narrow the pair under `from`, stack it, lose the scrollbar, and stand it side by side again, over and over. A changed `from` has no hold: the first width measured against it (at once, or when a page hidden through the change comes into view) decides the layout by `from` alone. A page hidden and shown again with the same `from` (through React's `<Activity>`) keeps its hold.
- **One cursor, in reading order.** The pair holds no cursor and answers no key. Under `usePaneKeys` the page keeps its one cursor and its one home: put the pair inside the page's `PaneList home`, never a `home` on each side, since the keys hand the focus to the first home they find. ↑ and ↓ walk the first part's rows, then the second's (`data-row-key` in document order), side by side as stacked, so ↓ on the first part's last row lands on the second's first; every row key is unique across both. Tab walks the first part's controls before the second's.
- **A cursor on each side.** To give each side a cursor of its own, give each its own `RowCursorContext` and its own focusable list with its own keys; each is then a Tab stop of its own, and the arrows move the cursor of the side holding the focus.

## Keyboard

The frame adds no keys. The sidebar's edge and a dock's top edge are pointer controls (`role="separator"`); they take no focus, so they carry no value a screen reader would offer to change; a tree row's chevron and its tools stay out of the Tab order; `FilterChips` are buttons in the Tab order that leave the focus where it was when pressed. `SpacePanel`, `TreeList`, and a `PaneList` with `home` take the focus by script only.

## Labels read

None: every word is a prop.
