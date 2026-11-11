# Pane (`@bigpixelrocket/uiok/pane`)

The frame around a listing: a path bar it opens with, a status line it closes with, the compact controls inside them and in listing rows, and the keyboard of a sidebar beside a page. Styled by the listing look under `.listing-root` ([listing](listing.md)).

## Example

```tsx
import { Listing, RowCursorContext } from '@bigpixelrocket/uiok/listing';
import { NO_MAIN_VERBS, PanePathBar, PaneStatus, paneKeyAction, QuietAction, usePaneKeys, verbControl, paneRow } from '@bigpixelrocket/uiok/pane';

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

- `PanePathBar` (`PanePathBarProps`): `trail` (crumbs, broadest first; a string is a label, a `PaneCrumb` `{ label, onOpen, tip? }` is a button), `mark` (a glyph in the root crumb), `heading` (the last label crumb is the page's `h2`), `here` (drawn inside the last crumb, such as a `CurrentDot`), and children at the bar's end (`.path-tools`). The crumbs before the last give way first, and the last one only once they have, down to one character and its ellipsis, so a long name never runs under the pane's frame. Every crumb cuts its words in an inner `.crumb-text` box, where the ellipsis draws. A crumb cut short opens its whole text as a tooltip, and a crumb shown whole opens none. A button crumb with a `tip` shows the tip instead, cut or not.
- `PaneStatus` (`PaneStatusProps`): the summary as children, and `tools` (compact controls at the line's end), which the summary gives way to. A summary in words that a narrow pane cuts carries itself whole as its tooltip.

## Compact controls

- `QuietAction` (`QuietActionProps`): an icon and a verb (`word`) in the dim tone, lit in the accent on the cursor row or with `lit`. `danger` marks a destructive one (Remove, Drop): quiet at rest, in the danger tone under the pointer, with the focus, and on the cursor row. `label` is the accessible name, `tip` the tooltip and description, `shortcut` the chord the tooltip shows. `verb` marks what the cursor row's keys run it for (`data-verb`), `pageVerb` what the page's chords run it for (`data-page-verb`), and `action` tells several controls on one verb apart. `softDisabled` keeps it focusable but inert (`aria-disabled`).
- `RowIconAction` (`RowIconActionProps`): an icon control with the same `label`, `tip`, `verb`, `softDisabled`, `danger`. With a `word`, it draws as `RowLinkLookContext` says.
- `LinkLook` (`'icons' | 'text' | 'both'`) and `RowLinkLookContext` (icons by default): how row links draw, for an app with an icon-or-text preference.
- `InRowContext` and `useInRow()`: set by `Row`. A control inside a row leaves the Tab order, since the cursor row's keys run it.
- `ControlVerb`: a string. Several verbs on one control are separated by spaces (`enter reveal`).

Every press stops propagation, so a row's `onOpen` never fires from its controls.

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

`.pane` (`.active` wears the accent on its frame), `.pane-path-row`, `.pane-crumbs`, `.crumb` (`.root`, `.home`, `.here`, `.brief`), `.crumb-label` (a crumb's words in `.crumb-text`), `.crumb-separator`, `.path-tools`, `.path-facts` (`.danger`, `.warning`; its words in `.path-fact-text` to let them cut), `.path-star`, `.pane-act` (`.lit`, `.danger`; its verb in `.pane-act-word`), `.pane-icon-act` (`.worded`, `.danger`), `.pane-list`, `.pane-status`, `.pane-summary`, `.pane-status-tools`.

In a path bar too narrow for everything, the trail gives way first, down to room for two cut crumbs, and is clipped at its own box past that (not while a crumb's menu is open, `aria-expanded="true"`), so it never runs under the tools. Then a fact cuts its words, if they sit in `.path-fact-text`; give that box `cutTooltip(words)` so the whole fact opens as a tooltip only while it is cut. Words laid straight into `.path-facts` cannot cut, so such a fact keeps its whole width:

```tsx
<span className="path-facts danger">
  <StateMark tone="danger" word="" />
  <span className="path-fact-text" {...cutTooltip(fact)}>
    {fact}
  </span>
</span>
```

`QuietAction` draws its verb in `.pane-act-word`. A host that shows its actions as icons alone hides that box the way the base sheet's `.visually-hidden` does (out of flow and clipped, never `font-size: 0` or `display: none`), so the button keeps its tooltip and `aria-label` and only the drawn word goes.

The pane's three bands share one inset: the first crumb's words, the strip's first label, the rows' icons, and the status line's words start on `--pane-row-inset`, and the path bar's last action, the rows' actions, and the status line's last icon end on it.

The compact controls are drawn 20px high; each one's hit area reaches `--hit-target` (24px) in the block axis, inside the 24px row or 26px bar. Their hover and pressed looks are the base sheet's shared recipes, and they ease into them as the Button does. Their focus ring sits on their edge (`--focus-offset-flush`) and keeps their 4px corners; inside a listing scope it keeps `.listing-root`'s weight, so a host rule such as `.my-view button:focus-visible` does not replace it. Hover never lights a disabled control.

## Labels read

None. Every word is a prop.
