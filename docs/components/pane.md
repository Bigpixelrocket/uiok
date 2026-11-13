# Pane (`@bigpixelrocket/uiok/pane`)

The frame around a listing: a path bar it opens with, a status line it closes with, the compact controls inside them and in listing rows, and the keyboard of a sidebar beside a page. Styled by the listing look under `.listing-root` ([listing](listing.md)).

## Example

```tsx
import { Listing, RowCursorContext, StateMark } from '@bigpixelrocket/uiok/listing';
import { NO_MAIN_VERBS, PanePathBar, PaneStatus, PathFact, paneKeyAction, QuietAction, usePaneKeys, verbControl, paneRow } from '@bigpixelrocket/uiok/pane';

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
    <div className="listing-root" ref={panes.rootRef}>
      <aside className={panes.activePane === 'sidebar' ? 'pane active' : 'pane'}>…</aside>
      <div className={panes.activePane === 'main' ? 'pane active' : 'pane'} ref={panes.mainRef}>
        <PanePathBar heading trail={['Servers', 'local']}>
          <PathFact mark={<StateMark tone="warning" word="" />} tone="warning">
            2 changes not applied
          </PathFact>
          <QuietAction icon={Play} label="Start local" lit onClick={start} pageVerb="toggle" word="Start" />
        </PanePathBar>
        <div className="pane-list" data-pane-home tabIndex={-1}>
          <RowCursorContext value={panes.rowCursor}>
            <Listing …>…</Listing>
          </RowCursorContext>
        </div>
        <PaneStatus>12 items</PaneStatus>
      </div>
    </div>
  );
}
```

## Frame

- `PanePathBar` (`PanePathBarProps`): `trail` (crumbs, broadest first; a string is a label, a `PaneCrumb` `{ label, onOpen, tip? }` is a button), `mark` (a glyph in the root crumb), `heading` (the last label crumb is the page's `h2`), `here` (drawn inside the last crumb, such as a `CurrentDot`), and children at the bar's end (`.path-tools`). A narrow bar gives way in the order below ("How a narrow bar gives way"). Every crumb cuts its words in an inner `.crumb-text` box, where the ellipsis draws. A crumb cut short opens its whole text as a tooltip, and a crumb shown whole opens none. A button crumb with a `tip` shows the tip instead, cut or not.
- `PathFact` (`PathFactProps`): a page's state at the bar's end, as one of its children: `tone` (`'danger'` for a failure, `'warning'` for a change waiting for the user, none for a plain fact), `mark` (drawn before the words, such as `<StateMark tone="danger" word="" />` or an icon), and its words. The tone is carried by the mark alone, in the tone's colour; a toned fact's words are in `--text`, a step up from a plain fact's dim words, never red or amber, so give a toned fact its `StateMark`. Its words as children (a string). The words cut with an ellipsis once the trail has given its floor, and the whole fact opens as a tooltip only while it is cut.
- `PaneStatus` (`PaneStatusProps`): the summary as children, and `tools` (compact controls at the line's end), which the summary gives way to. A summary in words that a narrow pane cuts carries itself whole as its tooltip.

## Compact controls

- `QuietAction` (`QuietActionProps`): words on tools when they fit. In a path bar, in a `tabbable` row (where it keeps its Tab stop), and in any toolbar it draws its glyph and its `word` by default, so a command reached by Tab shows what it does without a hover; a path bar too tight for its words hides them and keeps the glyph, the word then its tooltip (step 5 below). Only in a row the keys reach (not `tabbable`) is it a glyph alone by default, its `word` its tooltip (followed by `shortcut`) and kept for assistive technology, with its glyph and word where `RowLinkLookContext` is `'text'` or `'both'`, which an app sets from a user's icon-or-text preference. An app sets nothing to get words on its tools. In the dim tone, lit on the cursor row or with `lit`: full words in `--text`, never the accent, so it reads as a control and not as a link (`lit` also sets the verb a weight up and keeps its glyph in `--accent`). `danger` marks a destructive one (Remove, Drop): quiet at rest, in the danger tone under the pointer, with the focus, and on the cursor row. `label` is the accessible name, `tip` the tooltip and description, `shortcut` the chord the tooltip shows. `verb` marks what the cursor row's keys run it for (`data-verb`), `pageVerb` what the page's chords run it for (`data-page-verb`), and `action` tells several controls on one verb apart. `softDisabled` keeps it focusable but inert (`aria-disabled`). `keepWord` (`data-keep-word`) keeps its word in a fitted toolbar until the other tools have stepped (below).
- `RowIconAction` (`RowIconActionProps`): an icon control with the same `label`, `tip`, `verb`, `softDisabled`, `danger`. With a `word`, it draws as `RowLinkLookContext` says.
- `LinkLook` (`'icons' | 'text' | 'both'`) and `RowLinkLookContext` (icons by default): how row links and the `QuietAction`s in rows the keys reach draw, for an app with an icon-or-text preference. Path-bar tools and a `tabbable` row's actions follow it only for `'text'` and `'both'`; `'icons'` never takes their words.
- `InRowContext` and `useInRow()`: set by `Row`. A control inside a row leaves the Tab order, since the cursor row's keys run it.
- `ControlVerb`: a string. Several verbs on one control are separated by spaces (`enter reveal`).

Every press stops propagation, so a row's `onOpen` never fires from its controls.

### A toolbar that fits its line

`useToolbarFit()` returns a ref for a toolbar of `QuietAction`s (`role="toolbar"`, one line that never wraps). While every tool's glyph and word fit beside the bar's other items, they show. When they do not, every tool steps to its glyph alone, the step a path bar takes (step 5 below, the same rules and the same tooltips): the word becomes the tool's tooltip (unless it has a `tip`) and stays its accessible name. A tool never cuts its word and never leaves the bar, and the words come back as soon as the room does.

- **What counts toward the room.** Everything else in the bar (a search field, a pager, a check and its label, a primary button, a separator) is measured at its full size, even an item the host lets shrink, so the tools step before a field gives up its width.
- **A word kept until last.** A tool whose glyph alone could be misread at a cost (Kill, Drop) takes `keepWord`: it keeps its word while the other tools step, and steps only when the bar still does not fit (`data-tight="all"`).
- **When it refits.** When the bar or any of its items resizes, when an item comes, goes, or changes its words, and once the document's fonts load.
- **What the host keeps.** The bar must be as wide as the room it has, not sized to its content (a block, or a flex item that may shrink), so overflow shows in it. The fit sets `data-tool-fit` on the bar, `data-tight` (`''` or `'all'`) while it steps, and `data-word-tip` on each tool it gave a tooltip; the stepping is drawn by the library's stylesheet, inside or outside the listing look.

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
- Each pane's home is the element marked `data-pane-home` (`data-pane-home="sidebar"` for the sidebar's); the keys hand it the focus. The sidebar pane is the `.pane` around its home.
- A text field keeps every key but Tab. A text field inside `.terminal` keeps Tab too. A focused control keeps its own arrows and Return; a control inside a row hands arrows back to the pane's home.
- `sidebarStops` makes Tab walk the sidebar's controls with the page's as one cycle (`nextTabStop`).
- `cursorInRender` (default true) returns `mainKey` and `sidebarKey` in render, so a move renders the view. False leaves a move to the two rows it changes; read `rowCursor.current()` and `sidebarCursor.current()` instead.
- `readVerbs` reads what the cursor row and the path bar offer (`offered`) after each move and each change in `follows`, and again when a row comes or goes (`RowCursor.rowsChanged`). `sameVerbs` keeps an unchanged reading's identity.

DOM helpers: `paneRows`, `paneRow`, `verbControl(root, verb, 'verb' | 'page-verb')` (the enabled control for a verb), `tabStops`, `isTabStop`, `nextTabStop`, `pageRows` (rows per page in a 24px listing), `showRow`. Pure: `paneKeyAction`, `movedIndex`, `MainVerbs`, `NO_MAIN_VERBS`, `sameVerbs`.

## Styling

`.pane` (`.active` wears the accent on its frame), `.pane-path-row` (`--pane-crumb-count`, `--pane-crumb-here-room`, `data-tight`, `data-wraps`), `.pane-crumbs` (`data-cramped`, `--pane-crumb-fit`), `.crumb` (`.root`, `.home`, `.here`, `.brief`), `.crumb-label` (a crumb's words in `.crumb-text`), `.crumb-separator`, `.path-tools`, `.path-facts` (`.danger`, `.warning`; its words in `.path-fact-text`, as `PathFact` writes it), `.path-star`, `.pane-act` (`.lit`, `.danger`, `data-keep-word`; its verb in `.pane-act-word`), a fitted toolbar's `data-tool-fit` and `data-tight`, `.pane-icon-act` (`.worded`, `.danger`), `.pane-list`, `.pane-status`, `.pane-summary`, `.pane-status-tools`.

### How a narrow bar gives way

A path bar holds its trail and its tools (facts and compact controls) on one line. These hold in every bar, at every width, for every fact a host writes:

1. **Nothing is drawn over anything, and no control ends outside its row.** The trail scrolls inside its own box, so a crumb never runs under the tools, and the tools never take less than they need at their least (`min-width: min-content`: every control whole, every fact at its floor).
2. **No glyph is cut.** Text that does not fit ends in an ellipsis inside its own box, with at least one character before it, and its whole text is reachable: a cut crumb or fact opens it as a tooltip, and a crumb out of view is a scroll away. A trail at rest shows whole crumbs only; its side that hides crumbs fades over its padding and one slash.
3. **Things give way in one order**, each giving all it can before the next gives any:
   1. the crumbs before the last, each to one character and its ellipsis;
   2. the last crumb (where the pane is) to a stem: the shorter of its name and eight characters, and an ellipsis;
   3. a fact's words, to one character and its ellipsis;
   4. the crumbs before the last, out of view at the trail's start: the trail rests on its end, a slash first;
   5. the quiet actions' words, which step down to their icons (`data-tight`; each keeps its name, and its word becomes its tooltip unless it has one);
   6. the last crumb, to one character and its ellipsis.

   The trail's floor (`--pane-crumb-room`, from the crumb count and the last crumb's stem that `PanePathBar` sets on the row) is what the tools may not take while they can still give; only what they cannot give goes below it. The room a crumb out of view leaves at rest goes to the tools.

4. **Focus is always seen.** A crumb out of view is a scroll away, and one the keyboard focuses scrolls into view with its whole ring, clear of the fade. When the focus leaves the trail, it rests on its end again.
5. **The bar re-fits whenever a box in it changes size**: after every render, when the row, the trail, a crumb, or a tool resizes (a tool whose word changes on its own, a font that loads late), once the document's fonts are in, and when the focus leaves the trail.
6. **A fact's mark stands one gap (`--space-3`) from its words in every form**, as a listing row's does, and a fact that opens the tools stands twice that from the trail.

What a fact may hold:

- `PathFact`, or words laid straight into `.path-facts`, alone or after marks (a `StateMark` with `word=""`, a host's own empty span, an icon): the bar cuts the words in one clamped line, and `PanePathBar` gives a fact of bare words its words as a tooltip while they are cut.
- A host's own boxes (a link, a chip, a control): they keep their width, and the trail gives way for them instead. A box that may cut is one clamped line like PathFact's words: give it `.path-fact-text` and `cutTooltip(words)`. Its floor is then one character, so the tools' least counts it so; a box cut with `min-width: 0` and `overflow: hidden` counts its whole text and cannot give way.

What needs `PanePathBar`: steps 3.4 to 3.6 and point 5 are measured. A bar drawn with the classes alone (a hand-written trail and tools) keeps points 1, 2 (but for where its trail rests), 3.1 to 3.3, and 6 by CSS alone, as long as its tools at their least fit the row. Set `--pane-crumb-count` (and `--pane-crumb-here-room`, the stem's characters with its ellipsis, such as `3ch` or `9ch`) on its `.pane-path-row` for the exact floor; without them the floor holds two cut crumbs. A row a host lets wrap (`flex-wrap: wrap`) sets `data-wraps` (`PanePathBar` does it for its own row), so its tools, on a line of their own, take no cap from the trail. A crumb's menu opens inside its crumb, so while one is open (`aria-expanded="true"`) the trail neither scrolls nor fades. A right-to-left bar scrolls but rests where the browser puts it.

```tsx
<PanePathBar heading here={<CurrentDot label="Open" />} trail={[projects, site, 'web']}>
  <PathFact mark={<StateMark tone="danger" word="" />} tone="danger">
    Stopped: port 5173 in use
  </PathFact>
  <QuietAction icon={Play} label="Start web" lit onClick={start} word="Start" />
</PanePathBar>
```

`QuietAction` draws its verb in `.pane-act-word`. As a glyph alone (`.pane-act.wordless`, a square of the control's height) the library hides that box the way the base sheet's `.visually-hidden` does (out of flow and clipped, never `font-size: 0` or `display: none`), so the button keeps its tooltip and `aria-label` and only the drawn word goes. A host draws no hiding rule of its own.

The pane's three bands share one inset: the first crumb's words, the strip's first label, the rows' icons, and the status line's words start on `--pane-row-inset`, and the path bar's last action, the rows' actions, and the status line's last icon end on it. A glyph-only control there (a 20px box round a 14px glyph: the star, a wordless action, Reveal) reaches back by `--pane-glyph-reach`, half the difference, so its glyph, not its box, ends on the inset and the pane's glyphs stand in one column. Beside a pinned trail the tools still end on the inset, the spare room between trail and tools.

The compact controls are drawn 20px high; each one's hit area reaches `--hit-target` (24px) in the block axis, inside the 24px row or 26px bar. Their hover and pressed looks are the base sheet's shared recipes, and they ease into them as the Button does. Their focus ring sits on their edge (`--focus-offset-flush`) and keeps their 4px corners; inside a listing scope it keeps `.listing-root`'s weight, so a host rule such as `.my-view button:focus-visible` does not replace it. Hover never lights a disabled control.

## Labels read

None. Every word is a prop.
