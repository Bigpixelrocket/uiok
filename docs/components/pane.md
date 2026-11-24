# Pane (`@bigpixelrocket/uiok/pane`)

The frame around a listing: the tabs it hangs from, a path bar it opens with, a status line it closes with, the compact controls inside them and in listing rows, and the keyboard of a sidebar beside a page. Styled by the listing look under `.listing-root` ([listing](listing.md)).

## Example

```tsx
import { Listing, RowCursorContext, StateMark } from '@bigpixelrocket/uiok/listing';
import { NO_MAIN_VERBS, PaneBox, PaneList, PanePathBar, PaneStatus, PathFact, paneKeyAction, QuietAction, usePaneKeys, verbControl, paneRow } from '@bigpixelrocket/uiok/pane';
import { TreePane, WindowFrame } from '@bigpixelrocket/uiok/frame';

function View() {
  const panes = usePaneKeys({
    shown: true,
    loaded: true,
    initialPane: 'main',
    page,
    sidebarKeys,
    openKey: page,
    readVerbs: (main, cursor) => ({
      ...NO_MAIN_VERBS,
      enter: verbControl(paneRow(main, cursor), 'enter')?.dataset.word ?? null
    }),
    noVerbs: NO_MAIN_VERBS,
    readKey: paneKeyAction,
    cursorKey: (action) => action.kind === 'move' || action.kind === 'enter',
    run: (action, pane) => {
      if (action.kind === 'move') panes.move(action.to, pane);
      if (action.kind === 'enter') verbControl(paneRow(panes.mainRef.current, panes.mainKey), 'enter')?.click();
    }
  });

  return (
    <WindowFrame
      group={{ ref: panes.rootRef }}
      sidebar={<TreePane active={panes.activePane === 'sidebar'}>…</TreePane>}
      main={
      <PaneBox active={panes.activePane === 'main'} ref={panes.mainRef}>
        <PanePathBar heading trail={['Servers', 'local']}>
          <PathFact mark={<StateMark tone="warning" word="" />} tone="warning">
            2 changes not applied
          </PathFact>
          <QuietAction icon={Play} label="Start local" lit onClick={start} pageVerb="toggle" word="Start" />
        </PanePathBar>
        <PaneList home>
          <RowCursorContext value={panes.rowCursor}>
            <Listing …>…</Listing>
          </RowCursorContext>
        </PaneList>
        <PaneStatus>12 items</PaneStatus>
      </PaneBox>
      }
      …
    />
  );
}
```

## Panes

`PaneBox` (`active`, `label`, `tone`, `as`, `ref`, and the region handlers: keys, focus, pointer down, drag and drop, the secondary click) is a pane: a framed column of its tab strip or path bar, its list, and its status line, a `section` unless `as="aside"`. `active` marks the pane that holds the keyboard, its frame in the accent; the others show their cursor row quietly. `tone="danger"` draws its frame and its front tab's outline in the danger colour (a production server). `bell` is the visual bell: a count the host raises each time a key could not act (a move past the last row, a verb the cursor row does not offer); each rise shoves the cursor row sideways for one beat (the `row-nudge` keyframes, `.bell-0` and `.bell-1` alternating so a held key shoves again), and under reduced motion flips it to the selection fill for the beat instead (`useBellBeat`). `onContextMenu(event)` is the pane's own menu: a secondary click anywhere in the pane that nothing inside cancelled (a `Row` with its own `onContextMenu` ([Listing](listing.md)), a `Terminal`, a `Menu` opened from inside, whose events reach the pane through React though it is drawn elsewhere) cancels the browser's menu and runs it, so a click opens the row's menu or the pane's, never both; the frame's regions around the pane follow the same rule ([Frame](frame.md)). A secondary click in a text field (a text input, a textarea, editable content, inherited editability included, as the browser resolves it, read-only fields too) is the field's: no pane or region menu runs and the browser's own Cut, Copy, and Paste menu opens. `PaneList` (`home`, `pointer`, `label`, `ref`, the region handlers) is its scrolling body: `home` makes it the list the keys return to and Page Up and Page Down measure (`data-pane-home`, focusable by script, out of the Tab order), and hands the keyboard's menu key there to the cursor row's menu ([Listing](listing.md)), and `pointer` lights the row under the pointer, for rows that act on a click. A sidebar's pane is the frame's `TreePane` ([Frame](frame.md)).

## Tabs

`PaneTabs` is the strip of tabs a pane hangs from. Put it as the first child of a `.pane` under `.listing-root`: the pane's frame then hangs from the tab in front, whose surface opens into the frame, and the other tabs stand behind it on the ground, shorter and fainter.

```tsx
import {
  PaneTabs,
  togglePick,
  pickRun,
  pickedTabs,
  type TabPicks
} from '@bigpixelrocket/uiok/pane';

const [picks, setPicks] = useState<TabPicks | null>(null);
const order = tabs.map((tab) => tab.id);

<PaneBox active tone={production ? 'danger' : undefined}>
  <PaneTabs
    front={front}
    label="Tabs"
    onClose={close}
    onKeep={keep}
    onNew={openTab}
    onPick={(id, how) =>
      setPicks(how === 'toggle' ? togglePick(order, front, picks, id) : pickRun(order, front, id))
    }
    onReorder={setOrder}
    onSelect={(id) => {
      setFront(id);
      setPicks(null);
    }}
    picked={pickedTabs(order, front, picks).filter((id) => id !== front)}
    tabs={tabs}
  />
  <PanePathBar trail={trail} />…
</PaneBox>;
```

### Props

- `PaneTabsProps`: `label` (the tablist's accessible name), `tabs` (`PaneTabItem[]` in strip order, pinned ones first), `front` (the id of the tab in front), `picked` (ids picked beside the front tab; host state), `onSelect` (a press on a tab, or a choice in the folded tabs' menu), `onClose` (the close control, or a middle click on a tab that has one), `onPick(id, 'toggle' | 'run')` (⌘-click, ⇧-click), `onKeep` (a double-click on a tab), `onReorder(order)` (after a drag drops: the full order, folded tabs included; omit it to turn dragging off), `onNew` (the New Tab button and a double-click on the strip's empty end; omit it for no button), `newChord` (New Tab's tooltip chord, ⌘T by default), `onTabContextMenu(id, event)` (a secondary click; the host prevents the browser's menu if it draws its own), `trailing` (drawn after the folded tabs' count, such as an update pill).
- `PaneTabItem`: `id`, `name`, `context` (dim words and a slash before the name, to tell two tabs of one name apart), `mark` (a node ahead of the name: a swatch, or a lucide icon at `ICON_SM`), `tip` (the tooltip at every width, usually the whole path; also the accessible description), `following` (italic name: the next place opened takes this tab over), `live` (the tab is live, its process taking input or a stream open, in the host's words, "Taking input": a lit mark, an accent ring round a dot after the name, apart from any state mark, spinner, or dot in `mark`, the words its tooltip and part of the tab's accessible description; absent, null, or empty is not live), `dirty` (the warning mark in the close control's place; the control comes back under the pointer), `pinned` (before the pin rule, a pin instead of a close control, never shrinks), `tone: 'danger'` (a danger outline at every width), `closable` (false: no close control).

### Crowding

The strip never wraps or scrolls. Tabs behind the front one shrink together to a floor (eight characters of the name, three of the context, each with its ellipsis), the context giving way before the name loses a character. A cut context or name shows the tab's whole words ("shop_archive/orders") as its tooltip while it is cut (`cutTooltip`), unless the tab has a `tip`, which names it whole at every width. Past the floor they fold into a count after New Tab, farthest from the front tab first, the later of two as far; as many fold in one step as the shortfall needs. Pinned, front, and following tabs never fold; pinned and front tabs never shrink. Closing tabs, or a wider pane, gives the room back. The strip measures its header with a `ResizeObserver` and starts the folding over when the header, the trailing slot, the tab in front, or a tab's words, marks, or controls change.

The count (`button.pane-tabs-folded[aria-haspopup=menu]`) reads "+N" with a chevron, with the warning mark before it while a folded tab is dirty; its accessible name says what it shows and opens ("3 more tabs", `foldedName`) and its tooltip and description count the folded tabs. It opens the menu look (`.folder-menu`, marked `data-overlay`) under it, or over it when the window has room only there (a window that changes size closes it), headed "Folded here", listing the folded tabs in strip order with their mark, context and name, the lit mark (its words its tooltip) when live, a warning mark when dirty, and a danger mark for a danger-toned tab. Each row is described as its tab is, by the tab's `tip` and its unsaved changes, and the keys scroll the row they reach into view.

### Pointer and keyboard

- A press brings a tab to the front at once. With `onReorder`, it may also start a drag once the pointer has moved 4px: the held tab lifts and follows the pointer, neighbours step aside once it covers half of them, and the gap they leave is where it lands. An unpinned tab stops at the pin rule and a pinned one moves only among the pinned; nothing drops past the last tab on show. Picked tabs on the held tab's side of the pin rule close up round it and move together. Escape (or the window losing the focus, or a cancelled pointer) puts every tab back, and that Escape reaches nothing else; release calls `onReorder`. Neighbours slide over the fast duration token, so reduced motion makes them jump.
- A press on a picked tab waits for its release, since it may start a drag of every pick; a release without a drag calls `onSelect`.
- ⌘-click calls `onPick(id, 'toggle')`, ⇧-click `onPick(id, 'run')`; middle click `onClose`; double-click a tab `onKeep`; double-click the empty end `onNew`.
- Tabs take no focus (role `tab`, `aria-selected` on the front one); the host's verbs are the keyboard's way in, its close chord (⌘W) included. The close and New Tab controls stay out of the Tab order and are named from the labels ("Close {name}"). A tab holds no control: each `.pane-tab` box (`role="presentation"`, carrying the tab's classes, data, and presses) holds the tab itself, `.pane-tab-face` (the role, name, state, and description, round the mark, name, and dirty or pin mark), and beside it the close control. The close control is the pointer's (`aria-hidden`): a tab list owns tabs alone, so assistive technology and the keyboard close a tab with the host's close chord. A picked tab's accessible name is "{name}, picked"; its description joins its tip, its `live` words, "Pinned", and "Changes not saved" as they apply, so a screen reader reads a tab's live state with the tab, in the strip and in the folded menu.
- The count takes the focus. Its menu holds the keys: ↑ ↓ move, Return or Space chooses (`onSelect`), Escape closes; both hand the focus back to where it was when the menu opened (the count, when the keyboard opened it). A press outside, or the focus leaving, closes it.

### Logic helpers

Pure, for the host's tab state: `TabPicks` (`{ front, ids }`), `togglePick(order, frontId, picks, id)`, `pickRun(order, frontId, id)`, `pickedTabs(order, frontId, picks)` (the front tab and the picks that still stand, in strip order; picks made under another front tab lapse), and `gatherTabs(order, carried, held)`. The strip's own rules are exported too: `foldOrder`, `foldsNeeded`, `tabLabelFloor`, `draggedTabOrder` with `TabBox`, and `FoldableTab`.

### Styling

`.pane-header` > `.pane-tabs[role=tablist]` > `.pane-tab[role=presentation]` (`.active`, `.following`, `.dirty`, `.pinned`, `.picked`, `.dragging`, `[data-tone=danger]`, `--pane-tab-floor`) > `.pane-tab-face[role=tab]` > `.pane-tab-mark`, `.pane-tab-label` > `.pane-tab-context`, `.pane-tab-slash`, `.pane-tab-name`; `.pane-tab-live`, `.pane-tab-dirty` | `.pane-tab-pin`; and beside the face, `.pane-tab-close[aria-hidden]`; then `.pane-pin-rule`, `.pane-tab-new`, `.pane-tabs-rest`, `.pane-tabs-folded` (`.pane-tabs-folded-count`), `.pane-tabs-trailing`, and the menu's `.pane-tabs-folded-menu`. Tokens: `--pane-tab-height` (`--bar-height`), `--pane-tab-back` (`--surface-recessed`). A picked tab wears the marked row's edge and tint (`--marked-bar`, `--marked-bg`); a tab in the hand rides at `--z-drag` with `--shadow-popover`.

A pane's tone: `<div class="pane" data-tone="danger">` draws its frame, and its front tab's outline, in `--danger`, at rest, active, and in an inactive window; a danger-toned tab keeps its edge when hovered or picked.

## Frame

- `PanePathBar` (`PanePathBarProps`): `trail` (crumbs, broadest first; a string is a label, a `PaneCrumb` `{ label, onOpen, tip? }` is a button), `mark` (a glyph in the root crumb), `heading` (the last label crumb is the page's `h2`), `here` (drawn inside the last crumb, such as a `CurrentDot`), `siblings` (`PaneSiblings`: `label`, the menu's name, "Other versions"; `entries`, `MenuEntry`s with the one shown marked `current`; `onPick(id)`), which turns the last crumb into a button with a ⌄ after its words (`.crumb-siblings`, `aria-haspopup="menu"`, inside the page's `h2` with `heading`) that drops the siblings as a `Menu` ([menu](menu.md)) under it, the cursor on the one shown; a pick or a key that closes it gives the focus back to the crumb, and a second press takes it away. Children sit at the bar's end (`.path-tools`). A narrow bar gives way in the order below ("How a narrow bar gives way"). Every crumb cuts its words in an inner `.crumb-text` box, where the ellipsis draws. A crumb cut short opens its whole text as a tooltip, and a crumb shown whole opens none. A button crumb with a `tip` shows the tip instead, cut or not.
- `PathFact` (`PathFactProps`): a page's state at the bar's end, as one of its children: `tone` (`'danger'` for a failure, `'warning'` for a change waiting for the user, none for a plain fact), `mark` (drawn before the words, such as `<StateMark tone="danger" word="" />` or an icon), and its words. The tone is carried by the mark alone, in the tone's colour; a toned fact's words are in `--text`, a step up from a plain fact's dim words, never red or amber, so give a toned fact its `StateMark`. Its words as children (a string). The words cut with an ellipsis once the trail has given its floor, and the whole fact opens as a tooltip only while it is cut.
- `PaneStatus` (`PaneStatusProps`): the summary as children, and `tools` (compact controls at the line's end), which the summary gives way to. A summary in words that a narrow pane cuts carries itself whole as its tooltip.

## Compact controls

- `QuietAction` (`QuietActionProps`): words on tools when they fit. In a path bar, in a `tabbable` row (where it keeps its Tab stop), and in any toolbar it draws its glyph and its `word` by default, so a command reached by Tab shows what it does without a hover; a path bar too tight for its words hides them and keeps the glyph, the word then its tooltip (step 1 below). Only in a row the keys reach (not `tabbable`) is it a glyph alone by default, its `word` its tooltip (followed by `shortcut`) and kept for assistive technology, with its glyph and word where `RowLinkLookContext` is `'text'` or `'both'`, which an app sets from a user's icon-or-text preference. An app sets nothing to get words on its tools. In the dim tone, lit on the cursor row or with `lit`: full words in `--text`, never the accent, so it reads as a control and not as a link (`lit` also sets the verb a weight up and keeps its glyph in `--accent`). `danger` marks a destructive one (Remove, Drop): quiet at rest, in the danger tone under the pointer, with the focus, and on the cursor row. `label` is the accessible name, `tip` the tooltip and description, `shortcut` the chord the tooltip shows. `verb` marks what the cursor row's keys run it for (`data-verb`), `pageVerb` what the page's chords run it for (`data-page-verb`), and `action` tells several controls on one verb apart. `softDisabled` keeps it focusable but inert (`aria-disabled`). `keepWord` (`data-keep-word`) keeps its word in a fitted toolbar until the other tools have stepped (below).
- `RowIconAction` (`RowIconActionProps`): an icon control with the same `label`, `tip`, `verb`, `softDisabled`, `danger`, and `shortcut` (the chord as text, written after the words in its tooltip). With a `word`, it draws as `RowLinkLookContext` says.
- `LinkLook` (`'icons' | 'text' | 'both'`) and `RowLinkLookContext` (icons by default): how row links and the `QuietAction`s in rows the keys reach draw, for an app with an icon-or-text preference. Path-bar tools and a `tabbable` row's actions follow it only for `'text'` and `'both'`; `'icons'` never takes their words.
- `InRowContext` and `useInRow()`: set by `Row`. A control inside a row leaves the Tab order, since the cursor row's keys run it.
- `ControlVerb`: a string. Several verbs on one control are separated by spaces (`enter reveal`).

Every press stops propagation, so a row's `onOpen` never fires from its controls.

### A toolbar that fits its line

`useToolbarFit()` returns a ref for a toolbar of `QuietAction`s (`role="toolbar"`, one line that never wraps). While every tool's glyph and word fit beside the bar's other items, they show. When they do not, every tool steps to its glyph alone, the step a path bar takes (step 1 below, the same rules and the same tooltips): the word becomes the tool's tooltip (unless it has a `tip`) and stays its accessible name. A tool never cuts its word and never leaves the bar, and the words come back as soon as the room does.

- **What counts toward the room.** Everything else in the bar (a search field, a pager, a check and its label, a primary button, a separator) is measured at its full size, even an item the host lets shrink, so the tools step before a field gives up its width.
- **A word kept until last.** A tool whose glyph alone could be misread at a cost (Kill, Drop) takes `keepWord`: it keeps its word while the other tools step, and steps only when the bar still does not fit (`data-tight="all"`).
- **When it refits.** When the bar or any of its items resizes, when an item comes, goes, or changes its words, and once the document's fonts load.
- **What the host keeps.** The bar must be as wide as the room it has, not sized to its content (a block, or a flex item that may shrink), so overflow shows in it. The fit sets `data-tool-fit` on the bar, `data-tight` (`''` or `'all'`) while it steps, and `data-word-tip` (the word it gave) on each tool it gave a tooltip, so it takes back only that word, never a tooltip the host wrote since; the stepping is drawn by the library's stylesheet, inside or outside the listing look.

```tsx
const fit = useToolbarFit();

<div aria-label="Table" className="my-toolbar" ref={fit} role="toolbar">
  <QuietAction icon={Printer} label="Print" onClick={print} word="Print" />
  <QuietAction icon={Table2} label="Normalize" onClick={normalize} word="Normalize" />
  <QuietAction danger icon={Skull} keepWord label="Kill process 42" onClick={kill} word="Kill" />
</div>;
```

## Keyboard

`usePaneKeys(options)` installs one capture-phase `keydown` listener on the window for a view with a sidebar beside a page. It acts only while `shown` is true, no overlay is open (`watchOverlays`, see [keyboard](keyboard.md)), no input method is composing, and the key is aimed at the view or at nothing.

| Key                                | Action (`paneKeyAction`)                                   |
| ---------------------------------- | ---------------------------------------------------------- |
| ↑ ↓, Home, End, Page Up, Page Down | `move` the active pane's cursor (stops at either end)      |
| ⌘↑ ⌘↓                              | `move` to the first or last row                            |
| Tab, Shift-Tab                     | `switch-pane`: walk the page's stops and switch panes      |
| Return                             | `enter`                                                    |
| `.`                                | `reveal`                                                   |
| ⌘⌫, ⌘⏎, ⌥⌘⏎                        | `remove`, `toggle`, `restart`                              |
| ⌘ letter, ⌥⌘ letter                | `chord` with the letter (an Option chord read by its code) |

`paneKeyAction(stroke, { command: 'ctrl' })` reads Control as Command, for platforms where Control plays that role; the default is macOS's `meta`. The other of the two makes no chord. Shift makes none but with Tab.

What the options say:

- `readKey` maps an event to an action (`paneKeyAction`, or the app's own on top of it); `run` performs it in the pane the key was aimed at; `cursorKey` says which actions a focused control keeps for itself (moves, Return).
- Each pane's home is the element marked `data-pane-home` (`data-pane-home="sidebar"` for the sidebar's); the keys hand it the focus. The sidebar pane is the `.pane` around its home. A home, row, or verb inside a `hidden` element (a page held out of sight) is never read, and with no sidebar shown Tab walks the page alone.
- A text field keeps every key but Tab. A text field inside `.terminal` keeps Tab too. A focused control keeps its own arrows and Return; a control inside a row hands arrows back to the pane's home.
- `sidebarStops` makes Tab walk the sidebar's controls with the page's as one cycle (`nextTabStop`).
- `tabOrder` (`TabOrder`) is the order Tab walks: `document` (the default), every stop where the document puts it, each pane's home among them; `listing`, each pane's listing first, as a file manager walks its panes: the page's listing, then its other controls in document order (the path bar's above it included), then the sidebar's listing and, with `sidebarStops`, its controls, then the page's listing again. Shift-Tab steps back to a pane's listing, and from a listing switches to the other pane's. With no sidebar shown the page's listing and controls make one cycle. `listingFirstStop` is the rule, pure over any stop type (`WalkPane`).
- `cursorInRender` (default true) returns `mainKey` and `sidebarKey` in render, so a move renders the view. False leaves a move to the two rows it changes; read `rowCursor.current()` and `sidebarCursor.current()` instead.
- `readVerbs` reads what the cursor row and the path bar offer (`offered`) after each move and each change in `follows`, and again when a row comes or goes (`RowCursor.rowsChanged`). `sameVerbs` keeps an unchanged reading's identity.

DOM helpers: `paneRows`, `paneRow`, `verbControl(root, verb, 'verb' | 'page-verb')` (the enabled control for a verb), `tabStops`, `isTabStop`, `nextTabStop` (its `order` argument takes a `TabOrder`), `pageRows` (rows per page in a 24px listing), `pageRowsFrom(pane, rows, at, back)` (rows per page from a row, read from the rows' laid-out heights, for a listing whose rows may grow; `usePaneKeys` pages the main pane with it), `showRow`. Pure: `paneKeyAction`, `movedIndex`, `listingFirstStop`, `MainVerbs`, `NO_MAIN_VERBS`, `sameVerbs`.

## Styling

`.pane` (`.active` wears the accent on its frame), `.pane-path-row` (`--pane-crumb-count`, `--pane-crumb-here-room`, `data-tight`, `data-wraps`), `.pane-crumbs` (`data-cramped`, `--pane-crumb-fit`), `.crumb` (`.root`, `.home`, `.here`, `.brief`), `.crumb-label` (a crumb's words in `.crumb-text`), `.crumb-separator`, `.path-tools`, `.path-facts` (`.danger`, `.warning`; its words in `.path-fact-text`, as `PathFact` writes it), `.path-star`, `.pane-act` (`.lit`, `.danger`, `data-keep-word`; its verb in `.pane-act-word`), a fitted toolbar's `data-tool-fit` and `data-tight`, `.pane-icon-act` (`.worded`, `.danger`), `.pane-list`, `.pane-status`, `.pane-summary`, `.pane-status-tools`.

### How a narrow bar gives way

A path bar holds its trail and its tools (facts and compact controls) on one line. These hold in every bar, at every width, for every fact a host writes:

1. **Nothing is drawn over anything, and no control ends outside its row.** The trail scrolls inside its own box, so a crumb never runs under the tools, and the tools never take less than they need at their least (`min-width: min-content`: every control whole, every fact at its floor).
2. **No glyph is cut.** Text that does not fit ends in an ellipsis inside its own box, with at least one character before it, and its whole text is reachable: a cut crumb or fact opens it as a tooltip, and a crumb out of view is a scroll away. A trail at rest shows whole crumbs only; its side that hides crumbs fades over its padding and one slash.
3. **Things give way in one order**, each giving all it can before the next gives any:
   1. the quiet actions' words, which step down to their icons (`data-tight`; each keeps its name, and its word becomes its tooltip unless it has one): where the pane is reads before the wording of a verb, so while any crumb or fact would be cut, or a crumb out of view, with the words shown, the words go first;
   2. the crumbs before the last, each to one character and its ellipsis;
   3. the last crumb (where the pane is) to a stem: the shorter of its name and eight characters, and an ellipsis;
   4. a fact's words, to one character and its ellipsis;
   5. the crumbs before the last, out of view at the trail's start: the trail rests on its end, a slash first;
   6. the last crumb, to one character and its ellipsis.

   The trail's floor (`--pane-crumb-room`, from the crumb count and the last crumb's stem that `PanePathBar` sets on the row) is what the tools may not take while they can still give; only what they cannot give goes below it. The room a crumb out of view leaves at rest goes to the tools.

4. **Focus is always seen.** A crumb out of view is a scroll away, and one the keyboard focuses scrolls into view with its whole ring, clear of the fade. When the focus leaves the trail, it rests on its end again.
5. **The bar re-fits whenever a box in it changes size**: after every render, when the row, the trail, a crumb, or a tool resizes (a tool whose word changes on its own, a font that loads late), once the document's fonts are in, and when the focus leaves the trail.
6. **A fact's mark stands one gap (`--space-3`) from its words in every form**, as a listing row's does, and a fact that opens the tools stands twice that from the trail.

What a fact may hold:

- `PathFact`, or words laid straight into `.path-facts`, alone or after marks (a `StateMark` with `word=""`, a host's own empty span, an icon): the bar cuts the words in one clamped line, and `PanePathBar` gives a fact of bare words its words as a tooltip while they are cut.
- A host's own boxes (a link, a chip, a control): they keep their width, and the trail gives way for them instead. A box that may cut is one clamped line like PathFact's words: give it `.path-fact-text` and `cutTooltip(words)`. Its floor is then one character, so the tools' least counts it so; a box cut with `min-width: 0` and `overflow: hidden` counts its whole text and cannot give way.

What needs `PanePathBar`: steps 3.1, 3.5, and 3.6 and point 5 are measured. A bar drawn with the classes alone (a hand-written trail and tools) keeps points 1, 2 (but for where its trail rests), 3.2 to 3.4, and 6 by CSS alone, as long as its tools at their least fit the row. Set `--pane-crumb-count` (and `--pane-crumb-here-room`, the stem's characters with its ellipsis, such as `3ch` or `9ch`) on its `.pane-path-row` for the exact floor; without them the floor holds two cut crumbs. A row a host lets wrap (`flex-wrap: wrap`) sets `data-wraps` (`PanePathBar` does it for its own row), so its tools, on a line of their own, take no cap from the trail. A crumb's menu opens inside its crumb, so while one is open (`aria-expanded="true"`) the trail neither scrolls nor fades. A right-to-left bar scrolls but rests where the browser puts it; its actions still fold their words first (step 3.1).

```tsx
<PanePathBar heading here={<CurrentDot label="Open" />} trail={[projects, site, 'web']}>
  <PathFact mark={<StateMark tone="danger" word="" />} tone="danger">
    Stopped: port 5173 in use
  </PathFact>
  <QuietAction icon={Play} label="Start web" lit onClick={start} word="Start" />
</PanePathBar>
```

`QuietAction` draws its verb in `.pane-act-word`. As a glyph alone (`.pane-act.wordless`, a square of the control's height) the library hides that box the way the base sheet's `.visually-hidden` does (out of flow and clipped, never `font-size: 0` or `display: none`), so the button keeps its tooltip and `aria-label` and only the drawn word goes. A host draws no hiding rule of its own. In a cell or a strip's column (`.row-meta`), the last action is pulled into the cell's edge (its padding after the words, or its glyph's inset); an action with a control after it is not, and a worded one gives up the room after its words, so neighbours' boxes, and their click areas, meet edge to edge without one running under the next, the words as far from the next control as before.

The pane's three bands share one inset: the first crumb's words, the strip's first label, the rows' icons, and the status line's words start on `--pane-row-inset`, and the path bar's last action, the rows' actions, and the status line's last icon end on it. A glyph-only control there (a 20px box round a 14px glyph: the star, a wordless action, Reveal) reaches back by `--pane-glyph-reach`, half the difference, so its glyph, not its box, ends on the inset and the pane's glyphs stand in one column. Beside a pinned trail the tools still end on the inset, the spare room between trail and tools.

The compact controls are drawn 20px high; each one's hit area reaches `--hit-target` (24px) in the block axis, inside the 24px row or 26px bar. Their hover and pressed looks are the base sheet's shared recipes, and they ease into them as the Button does. Their focus ring sits on their edge (`--focus-offset-flush`) and keeps their 4px corners; inside a listing scope it keeps `.listing-root`'s weight, so a host rule such as `.my-view button:focus-visible` does not replace it. Hover never lights a disabled control.

## Labels read

`PaneTabs` reads `paneTabs` ([labels](../labels.md)): `newTab`, `close`, `picked`, `pinned`, `notSaved`, `folded`, `foldedHeading`, `foldedName`. Every other word in this area is a prop.
