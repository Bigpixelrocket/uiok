# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.7.5] - 2026-11-24

### Fixed

- Copying lines from a `LogWell` whose lines have sources puts each line on the clipboard as one line, as drawn (`web | Server running`), for a drag, a select-all of the well, and a selection that reaches lines not drawn yet. Before, each line copied as three: the source, the bar, and the words. A line is now one run of text, not a grid: the source stands in its own column and a long line's words wrap back to theirs, as before. The source and the bar sit in a new `.log-lead`, and the bar holds a no-break space either side.
- One `LogWell` selection that runs from one well's undrawn room into another's, as a host script can set, keeps both ends once the lines are drawn, so a copy takes the selected lines of both wells. Before, the first well's move of its end made the second drop its own, which left the second well's lines out.
- A `LogWell` selection whose direction a host script reverses before the well draws its lines keeps the new direction. Before, the direction read earlier was put back.
- Under reduced motion, a pane's bell flash paints the cursor row's words in the selection's ink, and each part that sets an ink of its own in the one a selected row gives it, each holding its contrast on the selection fill in every theme: a tree row's glyph and quiet words, a `StateMark` and its word, a `ToneIcon`, a `RowIconAction`, a `TextLink`, a `TimelineCell`'s bars, an on `FilterChips` chip with its ring and focus ring, and a tool row's glyph, field, placeholder, caret, and underline. Before, they kept their own tones, which can fall below contrast on the accent, down to 1:1 for an accent-toned mark.
- A `TreeTool` under the cursor rings with the pane's bell as a `TreeRow` does: shoved for a beat, or flashed under reduced motion.

## [0.7.4] - 2026-11-24

### Added

- `PaneStatus`'s `tip`: more than the summary says (where what it names comes from), shown as the summary's tooltip at every width, under the summary's words when they are a string, and read as its accessible description.
- `FilterChips`' `disabled`: every chip a disabled button, dimmed by the disabled rule, toggling nothing on a click or a key, a chip that is on still pressed. For chips whose setting cannot change while their owner is busy.
- `TreePane`'s `bell`: the visual bell a `PaneBox` rings, for a sidebar key that could not act. Each rise of the count shoves the tree's cursor row sideways for one beat, or flashes it under reduced motion.

### Changed

- `LogWell` draws only the lines in view and 20 more past each edge, and, while a selection covers any of the well, every line it covers, with blank room (`.log-gap`) standing for the rest. A log of 20,000 lines now draws about a screen of nodes for each batch instead of every line. Following the tail, a reader scrolled up staying on their line (through measuring, a new width, and lines the host drops before it), selection and copy (a select-all included), and new lines being announced work as before. The well is now `aria-live="off"`, and a hidden region after it (`.log-live`) announces the newest 50 lines, so scrolling announces nothing. Each drawn line is measured, as lines wrap; lines carry their place in `lines` as `data-index`.

### Fixed

- A `SideBySide` pair held side by side through a scrollbar stacks when a pop-up button it holds loses more than half the narrowing on any of three bounds: its holder's whole content box, the holder up to the button's right edge (a clip from the left), and the holder from its left edge (a clip from the right). The sides follow where the button sits in its holder, not its `direction`. Before, the room ran from the button's start by its own `direction` to the holder's end, so a right-aligned select clipped at its left, or a right-to-left select after a growing prefix in a left-to-right cell, stayed clipped. A button with no laid-out edges is now recognised before any clipping box is read.
- `usePaneKeys` rests the sidebar's cursor on `openKey` only while `sidebarKeys` lists it, and on the first row otherwise, so a collapsed or filtered tree that hides the open row no longer leaves the cursor on a row the tree does not draw (`sidebarKey`, `sidebarCursor.current()`, and `sidebarRest`).

## [0.7.3] - 2026-11-24

### Added

- `PaneTabItem`'s `live`: a tab that is live (its process takes input, a stream is open), in the host's words ("Taking input"). The tab is lit with an accent ring round a dot after its name, apart from a state mark, a spinner, or a dot in `mark`; the words are its tooltip and join the tab's accessible description, in the strip and in the folded menu. The mark, like a mark ahead of the name, takes its own room on top of the label's floor (`--pane-tab-live`, `--pane-tab-lead`).
- `StateMark`'s `wordTone`: the word's tone where it differs from the mark's, such as a quiet ring with a failure's word (`tone="muted"`, `wordTone="danger"`). In a row the word takes that tone; a quiet word takes the on-surface tone on a state fill, and a selection paints every word in its own.

### Fixed

- `FilterChips` in a listing `Row`'s `Cell` stay legible on every row state in every theme. On the cursor, a mark, the pointer's row hover, and the grey selection, a chip at rest and every count take the on-surface tone, and a chip that is on gives up its accent wash for its words in the text colour and its ring. On the neutral fill of a quiet mark or the grey selection, where the current item's ring and the accent focus ring are not floored, both take the strong control edge; the ring is set through `--current-ring`, so a held on chip still shows its press. On a selection that holds the keys, chips and counts take the selection's words, an on chip stands on the selection's highlight inside a ring in those words, a chip under the pointer or held takes the highlight, and the focus ring takes the selection's words. Before, a chip at rest stayed in the quiet tone, an on chip's wash and ring matched the selection's accent (1:1), and its words fell to 2.2:1 in some themes. A contrast invariant now holds an on chip's ring at 3:1 on the state fills.
- `SideBySide` stacks a pair where a half would cut a pop-up button (a `Select`) at its end. A select narrows to its column in a form, or is clipped by its cell in a listing, so it counted as fitting at any width; the halves are now read with each pop-up button's whole width beside the width it shows.
- A `SideBySide` pair held side by side through a scrollbar hides chips in a one-line `FilterChips` row only while each row's content is no wider than where they last all fit, and each hiding row has lost no more room than half the narrowing, so neither chips that grew nor a column beside them that grew can leave chips hidden. A row's content is read from its chips end to end, not its `scrollWidth`, which reports the row's own width while it fits. Before, the allowance was half the narrowing, which let chips that grew a little stay hidden where the row's column shares its half with another flexible column.

## [0.7.2] - 2026-11-24

### Added

- `ToneIcon` (`@bigpixelrocket/uiok/icon`, `IconTone`: `accent`, `ready`, `warning`, `danger`): an icon in a theme tone of its own, apart from the words around it, such as an amber update arrow after a version in a `Cell` or in a `TreeRow`'s trailing column. It takes the tone's text colour, which holds on the cursor and hover fills and a mark, and the selection's words on an active selection. With a `label` it is an image named by it, with that tooltip; without one it is decorative.
- `pageRowsFrom(pane, rows, at, back)` (`@bigpixelrocket/uiok/pane`): the rows one Page Up or Page Down moves from a row, read from the rows' laid-out heights. `usePaneKeys` pages the main pane with it, so a page of rows that grew (to hold wrapping chips) moves fewer rows instead of skipping some unseen.
- `SettingsFiles`' per-file Show in Finder and Copy Path: a `SettingsFileEntry` takes `onShow` (under the page's `showFolderLabel`) and `onCopyPath` (under the new `copyPathLabel`), drawn after Open. A refused request shows under the file's row, and each file's verbs are described by its name (the folder's Show in Finder by the folder's label). Of a row's requests the latest started decides what shows, so one that ends late never replaces a newer answer.

### Changed

- A `PanePathBar` steps its quiet actions' words down to icons first: while any crumb or fact would be cut (a fact's clamped line hiding words included), or a crumb out of view, with the words shown, the words go before the trail or a fact gives a character, in a right-to-left bar too. Before, the crumbs and the facts gave way first and the words only once the last crumb fell below its stem. The bar also fits again when a tool changes its word on its own, and a refit takes back only the word tooltip it gave, never a `tip` the host wrote since.
- `SideBySide` counts a one-line `FilterChips` row at its whole content width: a scrolling row's own box measured nearly nothing wide in a listing's flexible column, so the halves always seemed to fit and chips scrolled out of sight. Chips that would scroll in a half now stack the pair; the halves are checked as drawn (one more layout read, only for a pair with such a row), so flexible columns that share the room cannot leave chips hidden. A held pair narrowed by no more than a scrollbar's width under where its chips last showed whole may hide what the narrowing took from a half; chips that hide more stack it.
- A listing `Row` whose `Cell` holds `FilterChips` grows to hold them: every line of chips with `wrap`, instead of letting the second line run over the rows below, and chips on one line at their own height. Chips in a cell draw no band rule under them, no row inset of their own, and a slim block padding; a focused chip's ring is drawn inside it, since the cell clips.
- A `PaletteOption` gives way context first, then its trail's words, then its name, so a long trail no longer squeezes or cuts the name. A trail of words (a string or a number) cuts with an ellipsis, whole in its tooltip while cut (`.palette-meta-text`); a `KeyChord` keeps its width. The option is now a flex row (`.palette-option`).

### Fixed

- A `TreeRow` is named by the words it draws, its name with its detail and then its trailing column ("shop 5/8"), no longer with its chevron's label or its tool's ("Collapse shop shop 5/8").
- A `Row`'s `nameTip` tooltip reads a presentational image (`role="presentation"` or `none`) by its `alt` whenever the image carries any WAI-ARIA 1.2 global state or property (`aria-describedby`, `aria-details`, `aria-keyshortcuts`, `aria-live`, and the rest) or `aria-description`, not only a label, and follows `tabindex` and every one of those attributes as a component inside the name changes them after mount.

## [0.7.1] - 2026-11-23

### Added

- `KeyLegendStrip`'s `alert` (`LegendAlert`, `{ text }`) and `onAlertDismiss`: a short alert in the host's words (why the last key did nothing) at the strip's end, in the warning's words, cut with an ellipsis and whole in its tooltip, spoken through a polite live region. On the next key the strip calls `onAlertDismiss` with the alert then showing, and the host clears only that one, so a refusal that same key raises stays, whatever order the strip's and the host's key listeners run in, even when the host commits it at once (`flushSync`) from a listener that runs before the strip's: the strip tells the key that raised an alert by its event, not by a clock, so a second key in the same millisecond, or under a test's frozen timers, still dismisses. Each alert, a repeat of the same words included, is spoken again.
- `FilterChips`' `wrap`: chips that do not fit wrap onto further lines instead of scrolling sideways (no edge fade, no scroll, no sideways wheel), for a multi-choice control in a narrow cell. The chips stay buttons in the Tab order; the one scrolling line stays the default.
- `TreeRow`'s `dim`: a row whose item is not there or cannot be used yet (an Add row while a tool it needs is missing) shows its name in the row-meta tone, `--text-on-surface` on the cursor, a mark, and hover, as a listing `Row`'s `dim` does. The row still takes the cursor and opens. A dim add row, on `Row` or `TreeRow`, reads as unavailable in every theme: its plus leaves the accent for the row-meta tone at `--disabled-opacity`, and its words never rise past the on-surface tone.
- `PaneMessage`'s `icon`: a glyph of the host's own leading the words, at `--icon-md`, the words hanging beside it, in place of a tone's glyph.
- `UiokLabels.paneTabs.foldedName(count)`: the folded tabs' count's accessible name, "6 more tabs". Optional on `PaneTabsLabels`, so a group typed whole against 0.7.0 still compiles; the English words stand in without it.

### Changed

- `SideBySide` stands its parts side by side only where each equal half holds its part at the part's min-content width, so content that will not narrow (a toolbar of tools that keep their size, a form) stacks though the room passes `from`, which is now a floor. Content that changes decides again with no resize of the pair: new parts, and any change to the nodes or words inside. The content is measured in one column, the first part's hairline kept, so the pair never grows shorter for the read and a scrolled pane keeps its scroll; not at all under the floor, nor in the hold when only the width moved, and once at most per render; the scrollbar's hold is dropped for content that needs more than it did.

### Fixed

- A `Row` name in markup gives its `nameTip` tooltip its words as assistive technology reads them, read again whenever they change: words under `aria-hidden="true"` or `hidden` are left out, a labelled glyph reads as its label (`aria-labelledby`, `aria-label`, or an `img`'s `alt`), so a cut `NameCut` name shows once, whole, and a component inside the name that renames it on its own updates the tooltip.
- `PaneMessage` hangs its words beside a glyph only when one leads them (`icon`, or an svg that is the first thing in its words), not beside an icon inside the sentence, which now keeps its own size while a tone keeps its glyph.
- A tooltip's label and shortcut are a word apart in its accessible name ("New Tab ⌘T", not "New Tab⌘T").
- An open tooltip follows its element's tooltip attributes, so a `Row` name renamed under it shows its new words at once, and the tooltip closes when its words go.
- `RowProps.nameDescription`'s docs: it describes the row when it or its controls take the focus (`focusable`, `tabbable`).
- `PaneTabs`' folded tabs' count is named by what it shows and opens ("6 more tabs"), not "Folded here", which stays its menu's heading.
- A cut tab name or context in `PaneTabs`, and a `Cell` whose text its column cuts, shows its whole words as a tooltip while cut, as a row's name does. A tab's `tip` and a cell's `tip` still name them whole at every width, and a cell's `tip` of `null` or `''` still means no tooltip at all.
- Neighbouring actions in a row's or a strip's cell meet edge to edge: an action with another after it is no longer pulled under its neighbour, so their click areas do not overlap, and a worded action's words stand as far from the next control as before. A strip column's hidden label now comes before its control, so the control's last action is its cell's last and reaches the edge.
- `FilterEscape` is named by what it does and the key it shows ("Clear filter, Escape"), with `aria-keyshortcuts="Escape"`.
- A `StateMark` with no word stands on the middle of its line of text, not at the top of a row's cell.

## [0.7.0] - 2026-11-23

### Added

- `TreeRow`'s `onContextMenu(event, rowKey)`: a secondary click for a tree row's menu, as a listing `Row`'s. The row moves the pane's cursor to itself before calling it and cancels the browser's own menu, so its handler wins over its `TreeList`'s and `TreePane`'s. With the focus on the tree's `TreeList`, the Menu key or Shift-F10 runs the cursor row's, its event placed under the row.
- `TextLink`'s `verb` (`ControlVerb`, `data-verb`): a link in a listing row, such as a service's port, becomes one of the row's controls, out of the Tab order unless the row is `tabbable`, reached by the cursor row's keys through `verbControl`, and run without opening the row. Without a `verb`, or outside a row, a link keeps its Tab stop.
- A `FactList` or `FactColumns` set straight in a pane's body (a `PaneList`, `PanePage`, `PageSlot`, or `SideBySide` part) keeps the rows' inset from the pane's edge (`--pane-row-inset`) and `--space-4` above and below, instead of sitting flush with it.
- `Row`'s `nameTip` and `nameDescription`: the host's words about a row's name. `nameTip` (a narrow pane's dropped columns, say) is the name's tooltip at every width, under the whole name (a name in markup by its drawn words), in place of the tooltip a cut name shows alone. `nameDescription` (the row's kind) and the tip's words, in that order, describe the name's cell, the row when it takes the focus (`focusable`, `tabbable`), and a radio row's radio. Neither repeats the name.
- The pane docs demo walks Tab listing first (`usePaneKeys`' `tabOrder: 'listing'`) beside the browser's own order, Escape giving the focus back to that choice, and the frame demo opens a tree row's menu, from a secondary click or, through its Focus the tree button, the keys.

### Changed

- Breaking: a `PaletteOption`'s accessible name is now every word it draws, in the order drawn (its name, its `context`, then its trail, a `KeyChord` by its words, and `current`'s value), read from its content, so it holds the text on screen (WCAG 2.5.3, axe `label-content-name-mismatch`). Its `aria-description` is now only the caller's `description`, for what the row does not draw (why it is disabled). 0.6.0 advised voicing a chord or the context through `description`: a caller that did so drops that text from `description`, or the row reads it twice. `label` now stands in for the drawn name's words alone (pass it for a `MarkedText` name), the context and trail still read after it; an empty `label` is none.

### Fixed

- A right-to-left box keeps its inline edge fade (`.scroll-fade-x`) on the right side and a submenu's chevron pointing left after an app's bundler processes the stylesheet, and the key legend's overflow list ends at the chip's left edge. Lightning CSS (Vite) rewrote `:dir(rtl)` into `:lang()` selectors, which a `dir="rtl"` box in an English page does not match; the fade and the chevron now follow the nearest `dir` attribute (`--scroll-fade-inline-to`, `--inline-flip`), reading `:dir()` only under `dir="auto"`, whose direction comes from its text, and the list sits by a logical inset.
- Return on a command in a `Palette` no longer closes it and opens it again: the query field (`PaletteQuery`) cancels Return's default before the host's `onKeyDown` runs, so a host that hands the focus back to the button that opened the palette on close, even one that stops the key, does not see the browser click that button with the same key. Return on a button inside the palette still presses it.
- A `TextLink` in a selected listing row takes the selection's words (`--on-selected`, a disabled one `--on-selected-dim`) while the selection is active, instead of its accent or danger tone on the accent fill, which could vanish (1:1 in Catppuccin Mocha). An inactive selection keeps the link's own tone.
- `PaneTabs` no longer nests each tab's close control inside its `role="tab"` element (axe `nested-interactive`): the `.pane-tab` box is presentational and holds the tab, `.pane-tab-face`, with the close control beside it, out of the Tab order and the pointer's alone (`aria-hidden`, since a tab list owns tabs alone; the host's close chord closes a tab from the keyboard and assistive technology). The look, presses, drag, and folding are unchanged; a stylesheet that reached a tab's mark, name, dirty mark, or pin as the box's direct children reaches them under `.pane-tab-face`.
- `KeyChord` draws its chord as a `<kbd role="img">`, so its name in words ("Shift Command N") is allowed and read, in a control round it too, where an `aria-label` on a bare `<kbd>` was not (axe `aria-prohibited-attr`). `KeyChords` keeps its "or" apart from the chords in a name read from the content, and `Menu` and the terminal's menu keep an item's label, its current mark's words, and its chord's apart in its name ("Copy Path Option Command C").
- A `TreeTool`'s words (a note, a heading, a failed read) that a narrow sidebar cuts with an ellipsis show whole in a tooltip while cut, as a cut tree row's name does.
- A `PageNote` or `PaneMessage` too long for one line wraps its words in their own column beside the glyph (a hanging indent), not under the glyph; `PageNote` draws its words in the same `.pane-message-text` box. A glyph of the host's own leading a `PaneMessage`'s words is drawn at `--icon-md`, and the words after it hang in their own column too.
- A `Toolbar` set straight in a pane's body (a `PaneList`, `PanePage`, `PageSlot`, or `SideBySide` part) keeps the rows' inset (`--pane-row-inset`) from the pane's edges instead of touching them.
- A `.terminal-box` that nothing gives a height falls back to the new fixed token `--terminal-box-default-height` (200px, `TERMINAL_BOX_HEIGHT`) instead of collapsing.
- A mouse's second button pressed while another is held, after a Shift-F10 the browser left alone, opens the pane's menu again, not the cursor row's: `PaneList` forgets the menu key on a `mousedown` as well as a `pointerdown`.
- `SectionedDialog` focuses a section's first control past the column's end without throwing where the engine has no `scrollIntoView` (jsdom).
- `SideBySide` applies a changed `from` without the scrollbar hold on the first width measured against it, so a pair hidden while `from` rose comes back stacked if it is now too narrow; one hidden and shown again with the same `from` keeps its hold.
- `ViewerWindow` no longer takes a file named `constructor`, an extension or interpreter such as `valueOf`, or a media type such as `toString` for an `Object.prototype` member, which posted a function to the highlighting worker and took the viewer down; the worker answers failed for a language it does not ship.
- A PDF named `.`, `..`, or nothing, or whose name cannot be encoded (a lone surrogate), opens as `document.pdf` below its media URL instead of resolving to the URL's parent or failing. A PDF's `mediaUrl` carries no query or fragment.
- A text or hex view's drag ends with the view and before the next drag starts, so a lost mouseup or an unmount leaves no window listeners or scroll timer behind.
- The viewer says the copy failed on a page with no clipboard API (an insecure origin) instead of showing the raw error, and checks that a copy is still the latest in the same step that starts its write, so an overtaken copy never overwrites a newer one.
- The image view leaves an arrow a control already handled alone, and its arrow keys and the hex view's selection steps are looked up by own keys only. The keyboard table no longer says Shift with an arrow extends a text view's selection; only the hex view's does.
- `FieldGroup` names its note in the fieldset's `aria-describedby`, after the problem, and draws no note for `note={false}`, as `FieldRow` does.

## [0.6.0] - 2026-11-23

### Added

- `SectionedDialog`, `SectionedDialogProps`, and `DialogSection` (`@bigpixelrocket/uiok/dialog`): a form too long for one view, in a fixed frame with a sidebar of its sections beside a column that scrolls, each section headed by its name; the sidebar marks the section in view as the column scrolls, a row scrolls the column to its section, and a row run from the keyboard moves the focus to the section's first control. The `dialog` label `sections` names the sidebar.
- `FactList`, `Fact`, `FactColumns`, and `FactValueTone` (`@bigpixelrocket/uiok/surface`): a headed list of facts set straight on a page, the names in a column of their own and each value beside its name, a long value wrapping whole as a block, a printed one keeping its lines; lists side by side in as many columns as fit.
- `Code` (`@bigpixelrocket/uiok/text`): a command, a path, or a name inside a sentence, in the code face on a faint track, wrapping anywhere.
- `ShortcutIndex`, `ShortcutGroup`, and `ShortcutRow` (`@bigpixelrocket/uiok/keychord`): every key a window answers, in groups of verbs whose chords stand in one column across the groups, with a changed chord's accent caps, a verb with no chord, and a dimmed verb.
- `Row`'s `radio` (`RowRadio`): a row that is one choice of several, led by a radio named by the row's name, its cursor key reached through a `verb`.
- `PaneBox`'s `bell`: the visual bell, which shoves the cursor row sideways for one beat each time its count rises, or flashes the selection fill under reduced motion.
- `TextLink`'s `tone` (`danger`): a link to something failing (a log file whose writes fail) in the danger tone, its `tip` (the reason) its accessible description too.
- `KeyChords` (`@bigpixelrocket/uiok/keychord`): several chords for one verb, parted by the new `keys` label `or`, drawn and read between them, so two chords never run together; `ShortcutRow` draws its chords with it.
- `usePaneKeys`'s `tabOrder` and `nextTabStop`'s `order` (`TabOrder`): `listing` walks each pane's listing first, then its other controls, then the other pane's listing, over the pure rule `listingFirstStop` (`WalkPane`).
- `Row`'s `onContextMenu(event, rowKey)`: a secondary click for the row's menu. The row moves the pane's cursor to itself before calling it, and cancels the browser's own menu. From the keyboard, the Menu key or Shift-F10 on a pane's home (`PaneList` with `home`) runs the cursor row's, its event placed under the row.
- `RegionHandlers`' `onContextMenu`, so every part that takes the region handlers (`PaneBox`, `PaneList`, `SpacePanel`, `WindowFrame`'s `group`, `Dock`, `TreePane`, `TreeList`) takes a secondary click for its own menu. The innermost menu wins: a row's, then its pane's, then the region's around it, each running only for a click nothing inside cancelled, so one click never opens two menus. A secondary click in a text field is never claimed, so the field keeps the browser's own Cut, Copy, and Paste menu.
- `Menu`'s submenus (`MenuSubmenuEntry`, `{ kind: 'submenu', id, label, entries }`), one level deep (`MenuLeafEntry`): an item that opens a second menu beside it, on its inline-end side or the other with no room there (`placeMenu`'s `{ beside, rtl }`, `MenuFrom`). → (← right to left), Return, or Space opens it with the keys on its first item, ← goes back to its item, Escape closes it alone and Tab the whole menu; resting on or pressing its item opens it for the pointer, which may cross other items on its way in. Both menus read in the direction of what opened them (`Menu`'s new `dir`, else its anchor's or its place's). The item is a `menuitem` with `aria-haspopup="menu"` and `aria-expanded`, the submenu a `menu` labelled by it.
- `PaletteOption`'s `checked`: a row picked with others (the scripts a project includes), an `option` with `aria-checked` and the menu's check mark in its icon column while ticked. A press, or Return on the cursor row, toggles it through `onPick`; Space stays in the query.
- `SideBySide` (`@bigpixelrocket/uiok/frame`): two of a page's listings or sections side by side while the room the pair itself is given is `from` pixels wide or more, stacked in less, each a group named by its label. It measures its own width (`data-layout`), so a narrowed pane stacks them in a wide window, and holds no cursor: the page's one cursor walks the first part's rows, then the second's.
- `FilterChips` keeps to one line: chips that do not fit scroll sideways under the inline edge fade (`.scroll-fade-x`) with no scrollbar drawn, a mouse's vertical wheel scrolls the row sideways while it can move that way (left to the page otherwise; a trackpad's sideways swipe stays the browser's), and a chip the keys reach scrolls into view. Nothing scrolls smoothly.
- `BUDGETED_TERMINALS_PER_PAGE` (`@bigpixelrocket/uiok/terminal`): how many terminals one page's shared engine memory is budgeted for (17), so an app can test how many it opens against it; past it, terminals that fill their histories to the ceiling can exhaust the shared memory.

### Changed

- `menuKeyAction(event, rtl)` maps → and ← (`open`, `back`), and its `close` says whether it closes one level (Escape, `all: false`) or the whole menu (Tab, `all: true`). A `Menu` now holds → and ← too, which no longer reach its owner while it is open.
- `KeyLabels` takes `or` ("or" in English). An app that builds a whole `keys` group of its own, not an override through `UiokProvider`, adds it.
- `DialogLabels` takes `sections` ("Sections" in English), the name of a `SectionedDialog`'s sidebar. An app that builds a whole `dialog` group of its own adds it.
- `PaneMessage` draws its words in one `.pane-message-text`, so inline code flows with them.
- `PaneMessage` and `PageNote` drawn outside every listing scope carry the scope themselves (a `.listing-root` around them), as `Listing` does, so a note after a listing keeps its look anywhere.

### Fixed

- Tab from a pane's listing (`usePaneKeys`) no longer stops on a control the stylesheet hides, which refused the focus and held Tab in place, nor on a hidden input: the walk goes on past such a stop in the same direction, and ends on the pane's home if none takes the focus.
- `isTextEditingTarget` resolves inherited editability as the browser does (`isContentEditable`, else the nearest `contenteditable` that is not `inherit`), so editable content inside an editable parent counts as a text field and keeps its native menu and keys.

## [0.5.0] - 2026-11-23

### Added

- `Menu` (`@bigpixelrocket/uiok/menu`): a menu of verbs or places opened at a point or dropped from an element, through a portal: items (`MenuItemEntry`) with a glyph or a mark, a chord as key caps, a danger tone, a disabled state with its reason, a check, and the current one's dot; separators and group headings; the keys held while open (↑ ↓, Home, End, Return, Space, Escape, Tab), kept from the browser-key guard and a page's own key handlers (`data-native-keyboard`); a menu taller than the window scrolls, the keys keeping the cursor's item in view. Its pure placement and keys are `placeMenu` and `menuKeyAction`.
- `PanePathBar`'s `siblings` (`PaneSiblings`): the last crumb becomes a ⌄ button that drops the places beside it (a service's other versions) as a `Menu`, the one shown marked; a pick, a closing key, or a second press gives the focus back to the crumb, even when the pick renames it.
- Palette rows as components (`@bigpixelrocket/uiok/palette`): `PaletteList`, `PaletteOption` (mark, name, a sentence, path, or command, a trail, the current dot, cursor, disabled; its context, a trail in words, and its current state read as its description unless the caller words one), `PaletteHeading`, `PaletteNote`, `PaletteNotes`, and `PaletteFailure`.
- `TerminalBox` and `TERMINAL_BOX_HEIGHT` (`@bigpixelrocket/uiok/terminal`): a terminal framed at a fixed height (200px by default, a dialog's console), or filling its parent (a dock).
- `ProductMark` and `ProductMarkShape` (`@bigpixelrocket/uiok/icon`): a product's brand mark drawn from data the app passes in, with a fallback glyph, and the theme token `--product-mark-mix` (100% in a light theme, 78% in a dark one) that sets how much of the brand colour shows; a mark with no colour of its own and a fallback glyph take a row's icon tone, on the cursor and a selection too.
- `FactTable`, `FactRow`, and `FactTone` (`@bigpixelrocket/uiok/surface`): a page's short table of facts, a state glyph, name, detail, and value a row.
- `Cell`'s `tone` (`CellTone`: `warning`, `accent`, `danger`), held on the cursor row and under the pointer; `Row`'s `dim` (a name in the row-meta tone, `.row-dim`) and `add` (the add row's look with its accent plus); `TreeRow`'s `add`, whose plus keeps the accent on the cursor row.
- `PageTab`'s `count`, drawn after the tab's name and read in its accessible name.
- `TextLink`'s `disabled` and `label` (an accessible name of its own).
- `SettingsPage`'s `chip` takes a `SettingsChip` (`text`, `icon`, `tip`) as well as a string, and the `settings` label `pageWithChip`, which names a sidebar row and its chip apart ("Updates, Update to 1.4.4").
- `TimelineCell` and `TimelineScale` (`@bigpixelrocket/uiok/listing`): a row's span on a shared scale (a wait, then a bar, in the solid accent on the path that matters) and the ticks over its column, its bar and wait in the selection's words on a selected row and its span read once, as its name; `Row`'s `emphasis` puts a row's name in the strong weight.
- `Row`'s `selected`, `marked`, and `change` (`changed`, `removed`), and `Cell`'s `kind` (`action`, `hover`) and `missing`, so a row's states and a cell's kinds need no class name.
- `LogWell`'s `ansi`, which draws each line's SGR colours, backgrounds, and weights in the theme's text tones (a dim filled run keeps its fill's paired words) and drops every other escape sequence, control string (OSC, DCS, SOS, PM, APC), and cut-off escape, reading colon subparameters as one parameter and applying no CSI with a private marker or an intermediate, in time linear in the line, over `ansiSegments`, `ANSI_COLOURS`, `AnsiColour`, and `AnsiSegment` (`@bigpixelrocket/uiok/log`).

### Changed

- A `ModalDialog`'s box (the Settings dialog's included) and a `Palette`'s box carry the listing scope (`.listing-root`), and a `Listing` drawn outside any scope carries it itself, its own rules matching the listing that carries the scope, so listings, rows, and filter fields keep their look in a dialog, a palette, or anywhere else, in the listing's monospace face. `Palette`'s classes are now `folder-menu palette listing-root`.

### Fixed

- The tree keeps its look where single-class rules lost to others: a chevron off the cursor row draws in the rows' dim icon tone rather than its row's words, a tree note that is also a listing's empty line (`.pane-message.empty`) keeps the tree's small size and padding, and a focused `TreeFilterInput` shows its row's underline without the field focus ring.

## [0.4.0] - 2026-11-23

### Added

- The file viewer (`@bigpixelrocket/uiok/viewer`, a new area beside the root, like the terminal): `ViewerWindow` shows one file as text with syntax highlighting and line numbers, hex, image, audio, video, or PDF, reading a bounded range at a time through a `ViewerReader` the app supplies (`inspect`, `readRange`, `reload`, `lineNumber`), with a mode switch, change notices and Reload, fallbacks to hex or source, copy, Go to Offset, zoom, and a media player. `isViewerCloseKey`, `openSyntaxWorker`, `VIEWER_MAX_READ_BYTES`, and the reader's data types. Highlighting runs Shiki on its JavaScript regex engine in a worker the viewer starts itself; each grammar loads only when a file needs it.
- The `viewer` label group (`ViewerLabels`, `ViewerModeLabels`, `ViewerContentLabels`, `DEFAULT_VIEWER_LABELS`), its number, size, and date formats included.
- Form components (`@bigpixelrocket/uiok/field`), so an app draws a form with no class name or raw element: `TextField`, `TextArea`, `Select` (`SelectOption`, `SelectOptionGroup`), `FieldBox`, `FieldEditor`, `Radio`, `Range`, `Meter`, `RestoreDefault`; the layout `FieldGrid`, `FieldRow` (wires its control's id, note, problem, invalid state, and help on its own; `useFieldWiring` for a control of the app's), `FieldOption`, `FieldGroup`, `FieldNote`, `FieldProblem`. `Check` takes a `label` and a `tone`.
- `Notice` and `Card` (`@bigpixelrocket/uiok/surface`), and `PaneMessage` (`@bigpixelrocket/uiok/listing`): the `.notice`, `.card`, and `.pane-message` looks as components.
- `TreeTool` takes a `rowKey`, which joins it to the pane's row cursor as a `TreeRow` is, as a `treeitem`.
- `ProgressDialog`, `ConfirmDialog`, and `TypedNameDialog` take a `container`; `TypedNameDialog` takes `groups`.
- Theme token `--letterbox` (a video's letterbox, black in every theme).

### Changed

- Breaking: uiok now defines `--letterbox`, so `themeStylesheet` refuses an app token of that name. An app that wrote it as its own token drops it; the value is the same.
- `SidebarResizer` and `Dock`'s edge no longer set `aria-valuenow`, `aria-valuemin`, or `aria-valuemax`: they take no focus, so a screen reader could not change the value it offered.

### Fixed

- `TreeList` mounted inside a shadow root keeps its `aria-activedescendant`: it finds the cursor row in its own root, not the document. A tree mounted in an element not yet attached no longer throws.

## [0.3.0] - 2026-11-23

### Added

- The shell's components (`@bigpixelrocket/uiok/shell`, now an area with a module): `TitleBar`, `Lockup`, `BrandMark` (the family's plate, the app's glyph, and the check badge), `ChannelMarker`, `UpdatePill`, `AboutWindow`, `SettingsDialog` with `SettingsSubsection`, `SettingsSaveFailure`, page keys (`useSettingsPageKeys`, `settingsLegend`, `SettingsPageKeysContext`), and the scroll rules `spiedSubsection` and `subsectionScrollTop`, and the shared pages `AppearanceSettings` over `ThemeChoices` and `ThemePreview`, `LanguageChoice`, `UpdatesPage` with `UpdateChecks`, `UpdateCard`, and `UpdateNotes`, and `SettingsFiles`; the sign-in prompts `SignInDialog` and `HostKeyDialog`; `useSystemDark`, `appearanceInUse`, `steppedIndex`, `themesOf`.
- The window frame (`@bigpixelrocket/uiok/frame`, a new area), every part a component so an app draws its window with no class or element of its own: `AppRoot`, `SpacePanel`, `WindowFrame` (the title band, sidebar, main pane, tray, dock, and key legend in one grid, the space's listing root, with a `group` for a host's handlers and a band `trailing` part; a part given `false` draws no slot), `SidebarResizer` and `draggedWidth`; the sidebar tree's `TreePane`, `TreeList`, `TreeRow` (node, band, or group, following the pane's cursor), `TreeToggle`, `TreeTool`, `TreeFilterInput`, and `SidebarEmpty`; `FilterChips`, `PaneWarning`, `StatusNotice`; `Dock` (at the height its host keeps, its top edge dragging it, giving way to the main pane in a short window; `dockHeight`), `DockLog`, `DockLogEntry`, `DockInput`; `usePaneSplit`, `PaneSplitter`, `SplitDetail`, `cutRowDepth`, and `heldSplitHeight`; a page's `PageSlot`, `PanePage`, `Toolbar`, `ToolbarGrow`, `ToolbarGap`, `PageFilter`, `PageNote`, `EmptyAction`, `SectionHead`, `FootBar`, and `ShowSidebarButton`.
- `PaneBox` (with a `danger` tone) and `PaneList` (`@bigpixelrocket/uiok/pane`): a pane and its scrolling body, with `RegionHandlers`, the handlers a host hangs on a region.
- `EmptyState` (`@bigpixelrocket/uiok/listing`): a pane with nothing in it yet or one that could not load, with its glyph or mark, title, sentence, actions, note, detail, and numbered steps.
- `Switch` (`@bigpixelrocket/uiok/field`): the `.switch` look as a component, out of the Tab order in a listing row, a press never opening the row.
- `LoadFailure` (`@bigpixelrocket/uiok/shell`): the block a window shows in place of content that failed to load. A `SettingsPage` names its sidebar chip as `chip` (a string), drawn by the dialog.
- `ModalDialog` and `ConfirmDialog` take a `size` (`DialogSize`: `md`, `lg`, `xl`); `ConfirmDialog` takes an `alternative`, a second way on between leaving and confirming (Close Window and Keep Running).
- `LogWell` (`@bigpixelrocket/uiok/log`, a new area): a log in a well with each source's prefix in its own colour, a line's tone, and following the newest line; `logSourceIndexes`, `logSourceColour`, `logSourceWidth`.
- `Sparkline` and `sparklinePoints` (`@bigpixelrocket/uiok/charts`).
- `ProgressDialog` and `TypedNameDialog` (`@bigpixelrocket/uiok/dialog`).
- Theme tokens: the release channels (`--channel-latest`, `--channel-local`, their `-text`, `--channel-name`, `--channel-detail`, and `[data-channel]` blocks that set `--channel` and `--channel-text`), the brand mark (`--brand-white`, `--brand-plate`, `--brand-plate-dark`, `--brand-badge-dark`), and a log's sources (`--log-source-1` to `--log-source-6`).
- Scale tokens: `--font-weight-light`, `--font-weight-heavy`, `--shell-header-height`, `--traffic-light-inset`, `--sidebar-width`.
- The `settings` label group (`SettingsLabels`, `AppearanceLabels`, `AppearanceMode`, `DEFAULT_SETTINGS_LABELS`) and the `dialog` labels `ok`, `close`, `stop`, `tryAgain`, `runInBackground`, `typeName`.
- `shell.css`: the title bar (`shell-topbar`, `shell-brand`, `shell-lockup`, `shell-channel*`, `shell-trailing`), the lockup (sized by `Lockup`'s `size`) and brand mark (its glyph as `BrandMarkShape` data), the About window's drag regions and icon, `settings-restore`, `settings-count`, `settings-count-or-word`.

### Changed

- `usePaneKeys` never reads a home, row, or verb inside a `hidden` element (a page held out of sight), and with no sidebar shown Tab walks the page alone instead of naming a sidebar that is not there.
- Breaking: uiok now defines `--channel`, `--channel-text`, `--channel-name`, `--channel-detail`, `--channel-latest`, `--channel-latest-text`, `--channel-local`, `--channel-local-text`, `--brand-white`, and `--brand-plate`, so `themeStylesheet` refuses an app token of those names. An app that wrote them as its own tokens drops them; the values are the same in every theme.

## [0.2.3] - 2026-11-22

### Added

- `PaneTabs` (`@bigpixelrocket/uiok/pane`), the tab strip a pane hangs from: pinned, following (italic), dirty, picked, and danger-toned tabs, a mark slot and a context before the name, a pin rule, New Tab, and the strip's empty end (a double-click opens a tab). Tabs behind the front one shrink to a floor, then fold into a "+N" count with a "Folded here" menu; pinned, front, and following tabs never fold. A press brings a tab to the front and may drag it (4px slop) within its side of the pin rule, carrying any picks; Escape puts every tab back and `onReorder` gets the full order. ⌘-click and ⇧-click pick tabs (`onPick`), a middle-click closes, a double-click keeps (`onKeep`).
- Pure helpers for a host's tab state and the strip's rules: `togglePick`, `pickRun`, `pickedTabs`, `gatherTabs`, `foldOrder`, `foldsNeeded`, `tabLabelFloor`, `draggedTabOrder`.
- The `paneTabs` label group (`PaneTabsLabels`, `DEFAULT_PANE_TABS_LABELS`).
- `.pane[data-tone='danger']`: a pane's frame and its front tab's outline in `--danger`, at rest, active, and in an inactive window.
- `GroupSwatch` and `Tag` (`@bigpixelrocket/uiok/surface`, a new area): a group's colour as a filled or hollow square, and a small worded tag in a neutral, accent, ready, warning, or danger tone.
- `DataGridProps.pinnedColumns`: leading columns stay in view while the grid scrolls sideways, with a hairline at the pin edge; a column reorder never crosses it.
- The grid cell class `cell-removed`: struck out on the danger wash, for a row a save will delete.
- Field looks: `.field.value-null`, the `.field-editor` frame round a foreign editor (hover, focus, invalid, read-only, changed), and `.field-columns` with `--field-columns` for a check group in columns.
- `ListingColumn.tip`, the `info` state tone, `StateMarkProps.tip`, `RowProps.level` (an indent for a tree or a plan), the row classes `row-changed`, `row-removed`, and `drop-target`, `.row-meta.value-null`, and `.pane-message.warning`.
- `KeyLegendStripProps.overflow`: `'more'` folds the places that do not fit into a "+N" chip whose list names each folded verb with its chord and runs the one chosen. `'drop'`, the default, keeps today's behaviour.
- `TextLink` (`@bigpixelrocket/uiok/button`): a link in words, with an optional glyph, the code face, a tooltip, and a chord.
- `ConfirmDialogProps.confirmDisabled`: holds the primary off and its key inert, for a typed-name confirmation.
- `DialogStatementsProps.count` (also through `ConfirmDialog` `statements`): a host's own count words in place of the line count, or none.
- `SegmentedChoiceProps.disabled`: holds the whole choice while it cannot change.
- `RowIconActionProps.shortcut`: the chord written after the words in its tooltip.
- The invalid filter field look (an `aria-invalid="true"` input draws a danger edge and focus ring), `.overline.keep-case`, and `.notice code` in the code face.
- The `Delete` key's name and ⌦ glyph in the `keys` labels.
- `docs/tokens.md`: italic also marks a tab whose place is not fixed yet (a following tab).

### Changed

- Every single place in `KeyLegendStrip` has a tooltip naming its verb and chord, as a paired cap's does.
- Arrow, Home, and End moves in `DataGrid` scroll the cursor's column into view sideways.

### Fixed

- `SelectAllBar`'s default count uses thousands separators ("1,000 of 20,000 selected").
- A chosen option in a `select.field` list box (`multiple` or `size`) is no longer painted away.
- A failed `.pane-empty[role=alert]` draws its glyph in `--danger`.
- A `.notice` inside `.pane-summary` is cut with an ellipsis instead of wrapping.

## [0.2.2] - 2026-11-20

### Added

- `LineChart` `references` (`LineReference`: `value`, `label`, `tone`; `LineReferenceTone`: `'neutral'`, `'warning'`, `'danger'`): dashed horizontal lines across the plot under the series, in `--text-dim`, `--warning`, or `--danger`. The legend lists each after the series with a dashed swatch and its value ("Warning: 90 °C"); the read-out and hover dots leave them out, and the automatic value axis grows to show them. A reference whose value is not finite is left out.
- `LineChart` `valueMin` and `valueMax`: fix either end of the value axis exactly; an unset end still scales to the values. A non-finite end counts as unset, and a `valueMax` not above `valueMin` drops both. Lines beyond a fixed end are cut at the plot's edge, and references and dots there are not drawn; the read-out still shows the true value.
- `LineChart` `valueAxisWidth`: a fixed gutter for the value labels, so charts stacked over one time window line up.
- `LineSeries` `colour`: a CSS colour for one series' line, dots, and swatches; the other series keep their positions' `--chart-*` tokens.

### Fixed

- A number or time axis over a narrow span far from zero (a fixed `LineChart` range, a deep `ScatterChart` zoom) no longer puts a tick outside the axis.

## [0.2.1] - 2026-11-16

### Added

- `DataGridColumn` `sortable`: `false` keeps a column's heading a plain label in a grid that sorts, for values with no order such as a JSON document or a geometric point. It draws no sort button or mark, keeps no room for the mark in its first width, has no `aria-sort`, and a click on it never asks `onSort`; it still marks, resizes, and drags as any heading does. Other columns sort as before.

## [0.2.0] - 2026-11-13

### Added

- Scale tokens in `@bigpixelrocket/uiok/styles.css`, the same in every theme: type sizes (`--font-size-key` to `--font-size-heading`, and `--font-size-display` for a startup or splash title), line heights, weights, `--tracking-caps`, spacing (`--space-1` to `--space-16`), corners (`--radius-xs` to `--radius-pill`), line widths (`--line`, `--line-strong`), motion (`--duration-*`, `--ease-out`, `--ease-in-out`, `--transition-control`; `--duration-base`, 120ms, is the longest a state change takes and `--duration-slow` is for signals such as a refusal or a bell; the fast, base, and slow durations drop to zero under reduced motion), control, row, and bar heights (`--control-height`, `-sm`, `-xs`, `--row-height`, `--bar-height`, `--hit-target`), focus geometry (`--focus-ring-width`, `--focus-offset*`), icon sizes (`--icon-sm` to `--icon-xl`, `--icon-column`, `--dot`), and a fuller layer scale (`--z-below`, `--z-raised`, `--z-local-overlay`, `--z-menu`, `--z-drag`, `--z-overlay`, `--z-dialog-popover` beside the existing `--z-panel`, `--z-dialog`, `--z-tooltip`). See `docs/tokens.md`.
- Colour roles in every theme, each with a contrast floor: text roles (`--accent-text`, `--danger-text`, `--warning-text`, `--success-text`, `--text-dim-on-surface`, `--text-faint`, `--text-placeholder`), control outlines (`--control-border`, `--control-border-strong`, `--control-track`), washes and lines per hue (`--accent-wash`, `--danger-wash`, `--warning-line`, and their strong forms), pressed fills (`--primary-pressed`, `--tonal-pressed`, `--accent-pressed`, `--danger-pressed`, `--warning-pressed`, `--accent-wash-pressed`), row states (`--cursor-row`, `--cursor-bar`, `--row-hover`, `--row-zebra`, `--selected-bg`, `--on-selected`, `--marked-bg`, `--marked-bar`), the current item (`--current-bg`, `--current-text`, `--current-mark`, `--current-ring`), search matches (`--match-bg`, `--match-mark`), scrollbars, text selection, scrims, `--terminal-selection-text`, and three shadow levels (`--shadow-raised`, `--shadow-popover`, `--shadow-modal`). See `docs/themes.md`.
- Form controls (`@bigpixelrocket/uiok/field`, `docs/components/field.md`): classes for native elements (`.field` with `.field-sm` and `.field-xs`, `.field-short` for a short value such as a port or a count, `.field-box`, `.check` with `data-tone`, `.switch`, `.range`, `.field-label`, `.field-note`, `.field-problem`, `.field-group`, `.field-choice`, `.field-grid`), a themed `meter`, and `Check` (`CheckProps`), a checkbox whose `checked` may be `'mixed'`. A toned field adds a 2px bar in its tone inside its leading edge; a number field shows a stepper at its end; a textarea shows no corner grip. `.field-grid`'s label column is as wide as its longest label, capped at 40% of the form (`--field-label-width` fixes it), and centres a label on a 28px field. `.field-problem` leads with the danger glyph and sets its words in `--text`. Under `data-window-inactive` a check box or switch that is on greys to `--control-border-strong`.
- `labelHelp` (`LabelHelp`) in `@bigpixelrocket/uiok/field`: help that explains a control goes in its label's tooltip and the control's `aria-description`, with a dashed `--text-faint` underline cue on the label (`data-label-help`). The tooltip opens above the label, or at its end where the window has no room above, never over the control. `SegmentedChoice` takes `aria-description` for the same help.
- Notices and shared recipes (`docs/components/surface.md`): `.notice` with `.notice-danger`, `.notice-warning`, and `.notice-success`, an application's status line rather than a web alert (a glyph in the tone, the words in `--text`, `.notice-actions` right after the words); `.notice-card`, a window's status line under its header (a hairline under it, no fill, one line cut with an ellipsis); `.card`, a framed panel that groups one subject's lines (`--card-bg`); and the shared recipes in the base sheet: `.quiet-control`, `.quiet-track-item`, `.toggle-chip` (`-sm`, `-xs`; it keeps its `--control-border` outline when off), the on look of any `button[aria-pressed='true']`, `.overline`, `.scroll-fade` (`-end`, `-x`), `.hit-target`, `.selectable`, `.spinner`, and the `uiok-spin` keyframes. Only a control holding a pop-up open (`aria-expanded` with `aria-haspopup`) keeps its hovered face.
- A shell stylesheet (`docs/components/shell.md`): classes for a Settings dialog (frame, a sidebar whose subsection in view is bold beside a rail with its segment in the accent, pages, subsections, a settings file's problems), a theme picker with theme miniatures, the Updates page (the check cadence and the update's status, each a `.card`, with a hairline between the status's head and its download or release notes; a failure is a headline in `--danger-text` with its glyph, the system's reason, and the time; the release notes list scrolls in a frame that draws its focus ring), an update pill and its failed state, `.channel-tag`, an About window in a fixed frame, sign-in prompts with the secret on the label column, and a load failure block.
- `.disclosure` (`docs/components/button.md`): a disclosure chevron (the icon family's `ChevronRight`) and a plain label on a `button` with `aria-expanded`, for a section a user shows or hides, in place of a push button with a chevron.
- Icons (`@bigpixelrocket/uiok/icon`, `docs/components/icon.md`): `ICON_SM`, `ICON_MD`, `ICON_LG`, and `ICON_XL` for lucide's `size` prop, and `Spinner` (`SpinnerProps`), the one turning ring.
- `DialogLayer` (`DialogLayerProps`) and `ModalDialog`'s `container` prop: dialogs rendered inside the layer mount after the content, so they paint above every pane. Dialog width steps `.dialog-size-md`, `.dialog-size-lg`, and `.dialog-size-xl`, and body classes `.dialog-body`, `.dialog-help`, `.dialog-label`, and `.dialog-value`. The `--dialog-inset-top` hook sets the backdrop's top inset. See `docs/components/dialog.md`.
- `ConfirmDialog`'s `items` (`DialogItem`: `name`, `detail`, `icon`), `itemIcon`, `itemCount`, `groups` (`DialogItemGroup`), and `facts` props, with the `DialogItems` (`DialogItemsProps`, `shownItems`, `DIALOG_ITEMS_SHOWN`) and `DialogFacts` (`DialogFact`, `DialogFactsProps`) components they draw through; both take an `id`. The `dialog` label group gains `moreItems(count)` and `itemCount(count)`. See "One anatomy for every case" under Changed.
- `DialogStatements` (`DialogStatementsProps`) and `ConfirmDialog`'s `statements` prop (`{ label, lines }`): the statements a confirmation runs, every one, under the host's label and their count in a framed block in the code face, each wrapping whole under a hanging indent and selectable. Past about eight lines the block scrolls on its own; it is never sliced and never ends in "+N more". The block is a named region and a Tab stop, so the keys scroll it and a screen reader reads every statement. A confirmation that holds the block, from the prop or as a `DialogStatements` child, takes the 480px confirmation width. See "Statements" in `docs/components/dialog.md`.
- A dialog legend verb takes `help` (`DialogLegendVerb.help`), its slot's tooltip and accessible description, so a dialog says what a verb does without a sentence in its body.
- `useToolbarFit()` in `@bigpixelrocket/uiok/pane`: a ref for a toolbar of `QuietAction`s that shows each tool's glyph and word while they fit on its one line and steps every tool to its glyph alone (its word then its tooltip) when they do not, as a path bar does, counting the bar's other items at their full size; `QuietAction` `keepWord` keeps a consequential command's word until last. See `docs/components/pane.md`.
- `PathFact` (`PathFactProps`) in `@bigpixelrocket/uiok/pane`: a page's state at the end of a `PanePathBar`, with a tone and a mark. Its `tone` colours the mark only; its words stay in `--text` and are cut in one clamped line with a tooltip while cut (a host box that may cut takes `.path-fact-text`). See `docs/components/pane.md`.
- Tooltip options: `tooltip()` takes a `Chord` and draws it as key glyphs, and an options argument (`TooltipOptions`: `value` for a monospace value, `side` for a tooltip beside or above its control); `describedTooltip()` takes the same options; `cutTooltip()` opens an element's own text only while it is cut; `cutsItsText`, `tooltipChord`, `TooltipSide` (with `'above'`), and `TooltipBeside`. `placeTooltip()` takes optional `beside`, `rtl`, `glyph`, and `preferAbove` arguments after `pointerX`. See `docs/components/tooltip.md`.
- `KeyChord` `tone` (`KeyChordTone`: `accent`, `lit`, `quiet`) and `recording` props, and the `.keycap` class that draws every chord inside an element as the shared key cap. See `docs/components/keychord.md`.
- `SegmentedChoice` `disabledChoices`; its look can be drawn on plain `aria-pressed` buttons with `segmented-choice` and `segmented-choice-option`. `Pager` `size` (`'inline'`, `'small'`, `'regular'`). `DateTimePicker` `size` (`'small'` by default, `'regular'` beside a 28px field). `DataGrid` `empty`, the content of a grid with no rows, and `initialWidth`'s optional fourth argument for a sort mark's room.
- Danger tones: `Button` `variant="danger"` (`.button-danger`), `LegendSecondary.danger` (`.legend-danger`) in a dialog's key legend, a `danger` prop on `QuietAction` and `RowIconAction`, and `.folder-menu-option.danger` for a menu row.
- `Button` `size="xs"` (`.button-xs`): the 20px push button for a row or a strip, with the 4px corner, caption words at medium weight, a 12px glyph, and a pointer target grown to `--hit-target` in the block axis. It has the strip action's values, so the library draws one 20px push button. See `docs/components/button.md`.
- Listing row states: `.row.selected`, `.row.marked`, `.row.pane-add`, `.pane-list.pointer` for a hover wash on rows that act on a click, and `.pane-listing.pane-pin-end`, which pins the actions column while the listing scrolls sideways. A host colours its own parts of a selected row with the `--row-selected-text` and `--row-selected-text-dim` hooks, which follow the selection into its grey look. `.pane-well-note` (`.beside-terminal`) sets an empty well's note in the terminal's type, and `.pane-empty-detail` sets a failed pane's error under its actions. See `docs/components/listing.md`.
- Desktop menu looks (`docs/components/menu.md`): a row with `aria-checked="true"` shows a check mark in its icon column, a row with `aria-haspopup="menu"` ends in a submenu chevron, a row may be a `button`, and `.folder-menu-separator` draws a plain hairline between groups.
- `.filter-field` draws a listing's filter row; `.folder-menu-compact` and the `--menu-font-size` hook size a menu; `.palette-command` sets a palette row's context as a command line; `.chart-empty`, `.chart-empty-text`, and `.chart-swatch` for charts and legends a host draws.
- `DataGrid` styles `cell-null` and `cell-binary` cells.
- A test fails on a delivered token that nothing in the library or its site reads, apart from the ones listed there as read by script or by an app.

### Changed

- Breaking: theme tokens retired. `--shadow-menu`, `--shadow-notice`, `--shadow-card`, and `--shadow-card-hover` are gone: read `--shadow-popover`. Read `--shadow-modal` for `--shadow-dialog`, `--shadow-raised` for `--shadow-segment` and `--shadow-knob`, `--surface` (off) or `--on-primary` (on) for `--switch-knob`, and the `--tonal-hover` colour for `--tonal-hover-brightness`. `--page-tabs-fade-start` and `--page-tabs-fade-end` are gone with the tab fades. See "Retired names" in `docs/themes.md`.
- Breaking: `ThemeOverrides` takes a six-digit hex colour for colour tokens only; a factor override such as `--tonal-hover-brightness` no longer type-checks. Move a factor override into the host's own stylesheet.
- Breaking: `themeStylesheet()` throws when `extraFixed` or an app token names any token the library now defines, the new scale tokens and colour roles included (`--space-4`, `--control-border`). Rename such an app token.
- Breaking: the base stylesheet now themes elements that carry no class: a text input, textarea, or select gets the field outline and ground; a checkbox or radio gets the `.check` look; scrollbars, the caret, `accent-color`, `::selection`, `::placeholder`, and `meter` take theme colours; every focusable element gets a 2px accent ring on `:focus-visible`; a `button[aria-pressed='true']` gets the on look. The text-field floor, scrollbars, the caret, and `accent-color` weigh nothing (`:where()`), so any host rule wins over them. The rest carry some weight: the `.check` look on a checkbox or radio with no class weighs a class (it is `.check`'s own rule), the focus ring and the on look weigh one pseudo-class or attribute, and `meter`, `::placeholder`, and `::selection` one element. A host rule of more weight, or of the same weight after the base sheet (a class, for most), wins over them; a bare element rule such as `button { outline: none }` does not. To keep a native checkbox's platform drawing, give it a class.
- Breaking: chrome is not selectable. The base sheet sets `user-select: none` on the body; fields, the new `.selectable` class, and each component's content (values, paths, messages, statements, a load failure, output) opt back in at zero weight. `code`, `pre`, and `samp` are chrome by their tag (a command in a label, a token in a menu). Listings and grids select rows and cells, not text: a drag, Shift-click, or double-click on a row never starts a text selection, even inside a region a host opts into selection; status summaries, pane messages, an empty grid's line, and output in a well stay selectable. Selected text greys to `--fill` under `data-window-inactive` on the root. Mark a host's own copyable content, a code value included, `.selectable`.
- Breaking: the pointer is the arrow over every control (buttons, tabs, rows, links, crumbs, toggles), as in a desktop application, from a zero-weight `cursor: default` on links, buttons, labels, and control roles; no stylesheet sets the hand, and a dragged `DataGrid` heading no longer shows the grabbing hands. The I-beam stays in text and the resize cursors on column edges. Drop `cursor: pointer` from a host's own controls (`docs/tokens.md`, "Pointer").
- Breaking: the menu, palette, and match-highlight classes (`.folder-menu*`, `.entry-menu-heading`, `.palette*`, `.name-hit`) apply anywhere, not only under `.listing-root`. Rename a host's own elements that used these class names outside the scope, or they take the library's look.
- Breaking: `ActivityBar` draws its own track and fill (`.activity-bar`, `.activity-fill`); `className` and `fillClassName` are optional and add to them. Remove host rules that sized or coloured the track. A determinate fill that is not `moving` now dims to `--progress-idle`: a static meter passes `moving`.
- Breaking: `DataGrid` markup. `role="grid"`, the keyboard focus, and the scrolling moved from `.data-grid` to a new `.data-grid-scroll` inside it, which holds the header row and the `rowgroup`; `.data-grid` is now the frame. Point selectors, tests, and scroll handling at `.data-grid-scroll`.
- Breaking: `PageTabs` markup and look. The `.page-tabs` strip sits in a `.page-tabs-frame` with `.page-tabs-more` chevron buttons at an edge that hides tabs, and the edge fades are gone. A tab that does not fit whole carries `data-clipped`, is not drawn, and takes no click, though it stays reachable by the arrow keys; a tab wider than the span between both chevrons is drawn cut instead. Every strip is small cornered tabs, the current one on `--current-bg` with a `--current-ring` edge and no `--current-mark` underline, with room above and below: 24px tabs in a 36px strip, and in a `pills` strip 20px tabs in a 28px one. The strip scrolls at once, never smoothly. Point selectors at the new frame and `data-clipped`, and give the strip its new height.
- Breaking: `Pager` keeps a step that cannot act in its place as a disabled button. It used to be an empty `span.pager-step` (icon steps) or left out (worded steps). Update tests that count the pager's buttons.
- Breaking: `ResultChart` shows the hovered value in a `.result-chart-float` panel beside the mark. `.result-chart-readout` is now a visually hidden live line for assistive technology and has no styles; style `.result-chart-float` instead.
- Breaking: listing labels, row names, `StateMark` words, `PaneStatus` summaries, `RunHeader`'s headline, and a `PanePathBar` string crumb carry their tooltip only while the text is cut (`cutTooltip`, `data-tooltip-cut`), not always. A string crumb's tooltip moved from `.crumb-label` to its inner `.crumb-text`, and a control crumb without `tip` gains the same cut-only tooltip there. `StateMark` wraps its word in `.pane-state-word`, draws a shape per tone (dot, diamond, square, rings), and its busy spinner is the shared `Spinner`; with `word=""` it draws no gap after its mark. `QuietAction` wraps its verb in `.pane-act-word`. Tests that look for these tooltips need a cut element.
- Breaking: `KeyLegendStrip` drops verbs that do not fit whole instead of clipping the last one at the edge. Tests that expect a clipped verb need a wider strip.
- Breaking: the terminal's context menu is portalled to the document body at `--z-dialog-popover`, and `BELL_FLASH_MS` is 280 (was 250), matching `--duration-slow`. Point selectors for the menu at the body, not the terminal.
- Breaking: `DateTimePicker`'s panel is `position: fixed` at `--z-menu` and opens above its button when the room below is short, so a scrolling pane or dialog no longer clips it. Remove host rules that positioned it inside its container.
- Breaking: a terminal that cannot start shows `.terminal-failure` as terminal text: a `role="alert"` block holding the danger glyph (`.terminal-failure-glyph`) and the words (`.terminal-failure-text`) in the terminal's monospace and text colour at its inset. Point selectors that read the `p.terminal-failure` at `.terminal-failure-text`.
- Breaking: a dialog's title is always one line, `ConfirmDialog`'s included: a title too long for its strip is cut with an ellipsis, and a string title carries its text as a tooltip only while cut. A title names the action and carries no data ("Delete Now?", not "Delete 7 Items Now?"): the count, names, and paths go in the body. Nothing stands beside the title: `ModalDialog`'s `titleAside` and `ConfirmDialog`'s `context` are gone; put that context in the body's first line. See "The title" in `docs/components/dialog.md`.
- Breaking: one confirmation anatomy for every case. `ConfirmDialog` has four parts whatever it acts on: a one-line title with no count, the lead (`message`), the things it acts on as one framed list, and the buttons. `items` draws one row per item (the kind's glyph, the name in monospace, a dim detail at the row's end) in a framed well: five rows in full, then "+N more"; `groups` adds a labelled, counted list per further group. The name and the detail share the row by what they hold, so a short detail keeps one line while the row has room. A name or detail wraps, up to three lines and after a separator where it can; a name still too long is cut at its end, a detail at its start behind an ellipsis, so a folder keeps its nearest folders, and either shows its whole text as a tooltip while cut. A confirmation with items is 480px wide whatever their number (`.confirm-items`), and its description reads the lead, the count, then the names. `facts` are for facts about the action, drawn under the items; a fact's value wraps up to three lines before it is cut, and `more` ends the row in "+N more". `message` is optional: without it no empty `.dialog-message` is drawn and the items (or else the facts) describe the dialog. `paths` is deprecated and draws through the same list (a path's last part as the name, its folder as the detail); `.dialog-paths` is gone. Pass `items` with the kind's glyph and a detail instead of `paths`, and move the things acted on out of `facts` into `items`. See "One anatomy for every case" in `docs/components/dialog.md`.
- Breaking: an action is never drawn as a link. `.pane-strip-link` (Update all, Clear) is a small push button: words in `--text` inside a 20px `--control-border` bezel (a `--danger` bezel for `.danger`), with the shared quiet hover and press; in a column strip it takes its height from the strip and draws its focus ring inside. A `DataGrid` cell with `onOpen` leads to another record, so it keeps a link's look (`--accent-text` over an `--accent-line` underline) with the arrow pointer, and an `ArrowRight` glyph at its trailing edge on the cursor cell; a download cell (`cell-binary`) keeps a quieter `--text-faint` underline. Give `onOpen` to a value that leads out of its row, never the row's own name or id, and size a strip for the 20px button.
- Breaking: lists select as a desktop list does. Whatever marks a row (the cursor, a mark, a checked box, a selection) goes quiet in a pane that does not hold the keys and, under the new root attribute `data-window-inactive`, in every pane, where the active pane's frame takes `--border-strong`. A quiet selection or mark stands on `--fill` with its words in `--text` and `--text-on-surface`, a quiet mark's bar and a checked box on the row take `--control-border-strong`, and a quiet cursor is a hairline frame in `--control-border-strong` with no fill and no bar. A `DataGrid` goes quiet under the same conditions: its marked rows and columns take `--fill`, its cursor cell takes the hairline frame, and its row checkboxes grey. Set `data-window-inactive` on the root while the host's window is not focused.
- Breaking: row actions are glyphs; tools say their words. In a listing row the keys reach, `QuietAction` follows `RowLinkLookContext` as `RowIconAction` does: under the default `icons` it draws its glyph alone (`.pane-act.wordless`), its `word` as its tooltip (with `shortcut`) and kept for assistive technology; under `text` or `both`, which a host sets from a user's preference, its glyph and word. In a `PanePathBar`, in a `tabbable` row, and anywhere else it draws its glyph and word. A lit `QuietAction` and the cursor row's actions are full words in `--text`, a lit one a weight up with its glyph in `--accent`. A row's `.pane-hover-cell` icons stay in view on every row in their quiet tone instead of appearing on hover. A listing that sized an action column for words (`ACTION_COLUMN`) can take `iconLinksColumn(1, 0)` for a glyph.
- Breaking: `SelectAllBar` says how many rows are checked ("3 of 8 selected", `.select-all-count`) where it said "With selected:"; `SelectAllLabels.withSelected` is replaced by `selected(checked, total)`, and its checkbox is a `.check`. Rename a `withSelected` label override to `selected`.
- Breaking: `.pane-message.danger` leads with the danger glyph and sets its words in `--text`, not the danger colour. Give a host's own glyph-led message the glyph as its first child, which the rule then leaves alone.
- Every component stylesheet reads the new scale tokens and colour roles instead of fixed values, so sizes, spacing, corners, and colours line up across components. Most visual changes in this release follow from this.
- A listing lays its strip and rows on one grid (subgrid) with a name column floor (`--pane-name-floor`, 14 characters), so a narrow pane scrolls sideways instead of cutting every name. A listing with no rows hides its column labels. Rows keep their state bar and a fade at the scroller's start edge while scrolled sideways. The pane's end glyphs share one edge (`--pane-glyph-reach`).
- Empty and failed panes: `Listing`'s `empty` line (`.pane-message.empty`) is a quiet row starting where a row's icon starts, in the rows' own type, for a list with nothing in it and nothing to do. `.pane-empty` stays the centred block of glyph, heading, sentence, and actions as buttons, now also for a pane that could not load, with the system's error under the actions. Every `.pane-message` starts on the row inset. `DataGrid`'s `empty` content sits where the first row would be, in the grid's cell type. See "Empty" in `docs/components/listing.md`.
- Hover is one clear step from rest and a press one clear step from hover in every theme; every outlined control and key cap shares one pressed look (`--press-frost`). A disabled primary, tonal, or danger button is drawn as a disabled neutral one. A neutral `Button`, an `IconButton`, or a strip action that is on draws one ring, and a toggle that is on stays on under the pointer.
- Key caps are one shared look across `KeyChord`, `KeyLegendStrip`, dialog legends, and `FilterEscape`. `SegmentedChoice`, `PageTabs`, `Pager`, menus, palettes, tooltips, `RunHeader`, and `SelectAllBar` take the shared hover, press, focus, and field looks.
- Dialogs set their own type (monospace for values, the interface font for sentences and labels), cap their height to the window and scroll their body under a pinned title strip and legend, and carry the lit top edge and `--shadow-modal`. Nothing animates in: a dialog and its frosted wash appear on the next frame, with no fade, drop, or scale.
- `PanePathBar` cuts every crumb in an inner `.crumb-text` and gives way in one stated order (`docs/components/pane.md`, "How a narrow bar gives way"): the crumbs before the last, the last to a stem of eight characters, a fact's words, then the crumbs before the last scroll out of view, then its quiet actions' words step down to icons (`data-tight` on the row), then the last crumb. Nothing is drawn over anything and no control leaves the row. A trail its row cannot hold scrolls sideways with its scrollbar hidden and fades the side that hides crumbs; a focused crumb scrolls into view clear of the fade, and the trail rests on its end, a slash first (`data-cramped`, `--pane-crumb-fit`). The bar re-fits when any box in it resizes and once fonts load. It sets `--pane-crumb-count` and `--pane-crumb-here-room` on `.pane-path-row`; a hand-written trail sets them there too.
- A tooltip wider than its control hangs from the control's leading edge (its right edge in a right-to-left page), as a desktop tooltip starts where the pointer is. A glyph button (a button, link, tab, radio, or input no wider than it is tall) keeps its tooltip centred, a control wider than its tooltip still centres it on the pointer, and the window-margin clamp and `side` are unchanged.
- `RunHeader`'s figure is 14px, the headline's size, its running glyph is the `Spinner`, and a failed headline keeps the text colour: only the glyph and the bar carry the danger tone, and the reason is `--text-dim`. A palette's `.palette-failure` leads with the danger glyph and sets its words in `--text`.
- A menu's `.folder-menu-note` wraps to two lines before it is cut with an ellipsis; a reason a row cannot act goes in that row's tooltip.
- `DataGrid` fills the width it is given, as a desktop table view fills its pane, and leaves the slack after its last column empty.
- Charts share one look (axis, grid lines, swatches, hovered mark); a chart with no values keeps its plot's place and centres a dim line; a `ScatterChart` axis and a `ResultChart`'s numeric horizontal axis write numbers from a million up short (`2.5M`); a pie with more than eight slices hatches the later ones, and a `ResultChart` legend ends in a `+N` count of entries it leaves out. A plot that takes a range or zoom drag keeps the arrow, and the scatter frame's corner still resizes it without drawing the browser's striped grip.
- The terminal's scrollback thumb behaves as an overlay scroll bar, hidden at rest and shown while the reader scrolls (`data-scrolling`) or the pointer or keyboard is on the rail, and the pointer stays the I-beam over a link.
- Syntax tokens (`--syntax-*`) and `--on-tonal` in Catppuccin Latte are adjusted to keep 4.5:1 on the ground and a panel.

### Fixed

- The terminal keeps every cell's text at 4.5:1 against that cell's background, draws selected text in `--terminal-selection-text`, shows a quiet outline cursor while unfocused, and shows a start failure in its place.
- `NameCut` never leaves a gap between an ellipsis and the next part, nor after a head shorter than an ellipsis's room (`~/` in `~/n1000/.controller 85977`), and cuts a right-to-left name the mirrored way.
- `DataGrid` keeps an open editor inside the grid's frame with its cell's text inset, and its focus ring on the frame. `DateTimePicker` keeps its time fields on one row.
- The pinned actions column and side fades follow a right-to-left `dir`, and scroll fades never cover a scroller's border or scrollbar.
- A pinned actions column (`.pane-pin-end`) in a scroller of the host's own (neither a `.pane-list` nor the listing itself) stops with its end inset inside that scroller, so its words no longer end against the scroller's edge. A pinned listing now ends its grid with an empty track as wide as the row inset in place of its end padding, and its pinned cells stick at `inset-inline-end: 0` wherever they scroll; a host style that sticks another cell at the last column's track width from the end must add the row inset to that width.
- On a state row, every control the shared recipes wash keeps the row's fill under its words, in listings and the `DataGrid`; a quiet row's busy ring and spinner take `--text-on-surface` on a quiet mark or selection and keep the accent on a quiet cursor.

### Removed

- The tokens retired under Changed: `--shadow-menu`, `--shadow-dialog`, `--shadow-notice`, `--shadow-card`, `--shadow-card-hover`, `--shadow-segment`, `--shadow-knob`, `--switch-knob`, `--tonal-hover-brightness`, `--page-tabs-fade-start`, and `--page-tabs-fade-end`.
- `ModalDialog`'s `titleAside` prop and its `.dialog-context` class, `ConfirmDialog`'s `context` prop, and `.dialog-paths`.
- `SelectAllLabels.withSelected` and `.select-all-with` (see `selected` and `.select-all-count`).
- The `.result-chart-readout` styles, and the `dialog-settle` and `dialog-wash-in` keyframes.

## [0.1.4] - 2026-11-12

### Fixed

- The package declares `@types/react` `^19.0.0` as an optional peer dependency. Its type declarations import types from `react`, so a package manager that isolates each package's dependencies, such as pnpm with a global virtual store, can now link the app's `@types/react` to UIOK and its types resolve. Apps written in JavaScript need not install it.

## [0.1.3] - 2026-11-09

### Fixed

- `PageTabs` shows when a strip too narrow for its tabs hides some: it fades each edge with tabs past it and marks the strip `data-overflow` (`start`, `end`, or both). It also keeps the current tab in view when it first draws tabs and whenever `current` or the tabs change, scrolling only the strip, smoothly unless the reader prefers reduced motion. See `docs/components/tabs.md`.

## [0.1.2] - 2026-11-08

### Added

- `legibleOn` and `firstLegible`, the WCAG contrast picks UIOK's own tokens are derived with, exported from `@bigpixelrocket/uiok` and `@bigpixelrocket/uiok/themes` so an app can derive legible tokens of its own for `themeStylesheet()`. See `docs/themes.md`.
- `seriesColour`, the `--chart-1` to `--chart-8` token a series index is drawn in, exported from `@bigpixelrocket/uiok/charts` so a series drawn outside the charts matches theirs.

### Fixed

- `DateTimePicker` widens a fraction field of more than three digits to fit them, so six digits of microseconds show whole; a millisecond field keeps its width.

## [0.1.1] - 2026-11-08

### Changed

- The package's npm homepage now links to the documentation site at https://bigpixelrocket.github.io/uiok/.

## [0.1.0] - 2026-11-07

The first published version. The package is published to npm as `@bigpixelrocket/uiok`: install it with `npm install @bigpixelrocket/uiok` and import from `@bigpixelrocket/uiok` and `@bigpixelrocket/uiok/<area>`.

### Added

- `@bigpixelrocket/uiok/styles.css`, the base stylesheet: the `--font-ui` and `--font-mono` stacks, the `--z-panel`, `--z-dialog`, and `--z-tooltip` scale, the `--frost` backdrop filter, and the `visually-hidden` utility class.
- `VisuallyHidden`, a component for text that only assistive technology reads.
- Themes: 18 light and dark themes as generated colour tokens inside `@bigpixelrocket/uiok/styles.css`, chosen with `data-light-theme` and `data-dark-theme` on the root element (`wearThemes`, `subscribeThemeChange`). The catalog, colour helpers, token rules, and `themeStylesheet()`, whose options let an app derive and emit tokens of its own, are exported. See `docs/themes.md`.
- `@bigpixelrocket/uiok/styles.css` declares `color-scheme: light dark` and fades every disabled control to `--disabled-opacity`.
- `UiokProvider`, `useLabels`, and `mergeLabels`: shared chrome strings (`UiokLabels`), English by default, with key names and glyphs in the `keys` group.
- Core components: `Button`, `IconButton`, `TooltipLayer` with `tooltip()` and `describedTooltip()`, `ActivityBar`, `SegmentedChoice`, `KeyChord`, `FilterIcon`, and `FilterEscape`, styled through `@bigpixelrocket/uiok/styles.css`.
- Keyboard policy: `shouldSuppressBrowserDocumentKey`, `cancelBrowserDocumentKey`, `isKeyKept`, the `MODAL_SELECTOR` and `OVERLAY_SELECTOR` overlay contract, `watchOverlays`, `holdPageSelectAll`, and chord helpers (`chordSpoken`, `chordGlyphs`, `chordParts`).
- Render helpers: `createValueStore`, `unheard`, `sameData`, `sameProps`, `useStableHandlers`, `keepUnchangedById`, `keepUnchangedBy`, and `useClock`.
- Key legend: `KeyLegendStrip`, a strip of the verbs the keyboard offers under a dock of held modifiers, with app-supplied pair labels, and the `legendUnits`, `fittingUnits`, `moreLabel`, and `moreListAction` rules (`@bigpixelrocket/uiok/legend`, `docs/components/legend.md`). Its chrome strings are the `legend` label group.
- Dialogs (`@bigpixelrocket/uiok/dialog`): `ModalDialog`, `DialogLegend` with `legendKeyAction`, `legendSignature`, and `filterLeaveLabel`, `ConfirmDialog`, and `containTab`; the `dialog` label group (`cancel`, `clear`, `affectedItems`). Run progress (`@bigpixelrocket/uiok/run`): `RunHeader`, `isSettledRun`, `runElapsedMs`, and `runClock`. See `docs/components/dialog.md` and `docs/components/run.md`.
- Listings and panes: `Listing`, `Strip`, `Row`, `Cell`, `RowCursorContext`, `StateMark`, `PathCell`, `WellColumn`, `CurrentDot`, and column widths (`column`, `ACTION_COLUMN`, `iconLinksColumn`, `linksColumn`) in `@bigpixelrocket/uiok/listing`; `PanePathBar`, `PaneStatus`, `QuietAction`, `RowIconAction`, `RowLinkLookContext`, and the two-pane keyboard `usePaneKeys` with `paneKeyAction` and its DOM helpers in `@bigpixelrocket/uiok/pane`. Styled under the `.listing-root` scope; a sorting column's accessible name comes from the new `listing` label group.
- `NameCut` with `labelParts` and `nameParts` (`@bigpixelrocket/uiok/namecut`), and `MarkedText` with `highlightSegments` (`@bigpixelrocket/uiok/text`).
- Data widgets: `DataGrid` with its row-window and cursor rules (`@bigpixelrocket/uiok/grid`); `DateTimePicker` with `parsePicker` and `formatPicker`, ISO 8601 by default and replaceable through `format` and `parse` (`@bigpixelrocket/uiok/datetime`); `Pager` with `pageCount`, `clampPage`, `pageSlice`, `pageOf`, and `selectorPages` (`@bigpixelrocket/uiok/pager`); `PageTabs` (`@bigpixelrocket/uiok/tabs`); `SelectAllBar` with `checkedAfterClick` (`@bigpixelrocket/uiok/selectall`). Their shared words come from the new `dateTime`, `pager`, and `selectAll` label groups.
- Filtered menus and palettes: the fuzzy matcher `matchQuery` with `hasQueryTerms` and `hasNegativeTerms`, the menu rules (`menuQueryRefused`, `moveMenuCursor`, `pickableCursor`, `movedPickableCursor`, and the level trail helpers), `useBellBeat`, and the menu look in `@bigpixelrocket/uiok/menu`; `Palette` and `PaletteQuery` in `@bigpixelrocket/uiok/palette`, whose words come from the new `palette` label group.
- Charts (`@bigpixelrocket/uiok/charts`): `LineChart`, `PieChart`, `ScatterChart`, and `ResultChart` (bar, column, line, spline, area, pie, timeline, scatter; stackable), painted from the `--chart-*` tokens, and `tokenColour`, `svgMarkup`, and `svgPng` to save a chart as a picture. Their shared words are the `charts` label group (`ChartLabels`).
- Each area is importable on its own as `@bigpixelrocket/uiok/<area>` (`@bigpixelrocket/uiok/button`, `@bigpixelrocket/uiok/keyboard`, …).
- `lucide-react` 1.31 or later within 1.x is a peer dependency.
- Terminal (`@bigpixelrocket/uiok/terminal`, `docs/components/terminal.md`): `Terminal`, Ghostty's VT engine as WebAssembly drawn on a canvas, read-only without `onInput`, with a Copy and Paste menu whose chords come from `menuChords`, a visual bell, line-editing actions bound by `actionForKey`, and `TerminalScrollbackContext`. The package root does not export it, so an app without a terminal never loads its assets. Its words are the new `terminal` label group; the package now ships a `NOTICE` with the engine's, adapter's, and font's licences.

[Unreleased]: https://github.com/Bigpixelrocket/uiok/compare/v0.7.5...HEAD
[0.7.5]: https://github.com/Bigpixelrocket/uiok/compare/v0.7.4...v0.7.5
[0.7.4]: https://github.com/Bigpixelrocket/uiok/compare/v0.7.3...v0.7.4
[0.7.3]: https://github.com/Bigpixelrocket/uiok/compare/v0.7.2...v0.7.3
[0.7.2]: https://github.com/Bigpixelrocket/uiok/compare/v0.7.1...v0.7.2
[0.7.1]: https://github.com/Bigpixelrocket/uiok/compare/v0.7.0...v0.7.1
[0.7.0]: https://github.com/Bigpixelrocket/uiok/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/Bigpixelrocket/uiok/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/Bigpixelrocket/uiok/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/Bigpixelrocket/uiok/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/Bigpixelrocket/uiok/compare/v0.2.3...v0.3.0
[0.2.3]: https://github.com/Bigpixelrocket/uiok/compare/v0.2.2...v0.2.3
[0.2.2]: https://github.com/Bigpixelrocket/uiok/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/Bigpixelrocket/uiok/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.4...v0.2.0
[0.1.4]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Bigpixelrocket/uiok/releases/tag/v0.1.0
