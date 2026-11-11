# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.2.0] - 2026-11-11

### Added

- Scale tokens in `@bigpixelrocket/uiok/styles.css`, the same in every theme: type sizes (`--font-size-key` to `--font-size-display`), line heights, weights, `--tracking-caps`, spacing (`--space-1` to `--space-16`), corners (`--radius-xs` to `--radius-pill`), line widths (`--line`, `--line-strong`), motion (`--duration-*`, `--ease-out`, `--ease-in-out`, `--transition-control`; the fast, base, and slow durations drop to zero under reduced motion), control, row, and bar heights (`--control-height`, `-sm`, `-xs`, `--row-height`, `--bar-height`, `--hit-target`), focus geometry (`--focus-ring-width`, `--focus-offset*`), icon sizes (`--icon-sm` to `--icon-xl`, `--icon-column`, `--dot`), and a fuller layer scale (`--z-below`, `--z-raised`, `--z-local-overlay`, `--z-menu`, `--z-drag`, `--z-overlay`, `--z-dialog-popover` beside the existing `--z-panel`, `--z-dialog`, `--z-tooltip`). See `docs/tokens.md`.
- Colour roles in every theme, each with a contrast floor: text roles (`--accent-text`, `--danger-text`, `--warning-text`, `--success-text`, `--text-dim-on-surface`, `--text-faint`, `--text-placeholder`), control outlines (`--control-border`, `--control-border-strong`, `--control-track`), washes and lines per hue (`--accent-wash`, `--danger-wash`, `--warning-line`, and their strong forms), pressed fills (`--primary-pressed`, `--tonal-pressed`, `--accent-pressed`, `--danger-pressed`, `--warning-pressed`, `--accent-wash-pressed`), row states (`--cursor-row`, `--cursor-bar`, `--row-hover`, `--row-zebra`, `--selected-bg`, `--on-selected`, `--marked-bg`, `--marked-bar`), the current item (`--current-bg`, `--current-text`, `--current-mark`, `--current-ring`), search matches (`--match-bg`, `--match-mark`), scrollbars, text selection, scrims, `--terminal-selection-text`, and three shadow levels (`--shadow-raised`, `--shadow-popover`, `--shadow-modal`). See `docs/themes.md`.
- Form controls (`@bigpixelrocket/uiok/field`, `docs/components/field.md`): classes for native elements (`.field` with `.field-sm` and `.field-xs`, `.field-box`, `.check` with `data-tone`, `.switch`, `.range`, `.field-label`, `.field-note`, `.field-problem`, `.field-group`, `.field-choice`, `.field-grid`), a themed `meter`, and `Check` (`CheckProps`), a checkbox whose `checked` may be `'mixed'`.
- Notices and cards (`docs/components/surface.md`): `.notice` with `.notice-danger`, `.notice-warning`, `.notice-success`, and `.notice-card`; `.card`; and the shared recipes in the base sheet: `.quiet-control`, `.quiet-track-item`, `.toggle-chip` (`-sm`, `-xs`), the on look of any `button[aria-pressed='true']`, `.overline`, `.scroll-fade` (`-end`, `-x`), `.hit-target`, `.spinner`, and the `uiok-spin` and `uiok-pulse` keyframes.
- A shell stylesheet (`docs/components/shell.md`): classes for a Settings dialog (frame, sidebar, pages, subsections, a settings file's problems), a theme picker with theme miniatures, an Updates card and release notes, an update pill's entrance, `.channel-tag`, an About window, sign-in prompts, an exit confirmation, and a load failure.
- Icons (`@bigpixelrocket/uiok/icon`, `docs/components/icon.md`): `ICON_SM`, `ICON_MD`, `ICON_LG`, and `ICON_XL` for lucide's `size` prop, and `Spinner` (`SpinnerProps`), the one turning ring.
- `DialogLayer` (`DialogLayerProps`) and `ModalDialog`'s `container` prop: dialogs rendered inside the layer mount after the content, so they paint above every pane. Dialog width steps `.dialog-size-md`, `.dialog-size-lg`, and `.dialog-size-xl`, and body classes `.dialog-body`, `.dialog-help`, `.dialog-label`, and `.dialog-value`. The `--dialog-inset-top` hook sets the backdrop's top inset. See `docs/components/dialog.md`.
- Danger tones: `Button` `variant="danger"` (`.button-danger`), `LegendSecondary.danger` (`.legend-danger`) in a dialog's key legend, and a `danger` prop on `QuietAction` and `RowIconAction`.
- `PathFact` (`PathFactProps`) in `@bigpixelrocket/uiok/pane`: a page's state at the end of a `PanePathBar`, with a tone and a mark, cut with a tooltip when the bar is narrow. See `docs/components/pane.md`.
- Tooltip options: `tooltip()` takes a `Chord` and draws it as key glyphs, and an options argument (`TooltipOptions`: `value` for a monospace value, `side` for a tooltip beside its control); `describedTooltip()` takes the same options; `cutTooltip()` opens an element's own text only while it is cut; `cutsItsText`, `tooltipChord`, `TooltipSide`, and `TooltipBeside`. `placeTooltip()` takes an optional side. See `docs/components/tooltip.md`.
- `KeyChord` `tone` (`KeyChordTone`: `accent`, `lit`, `quiet`) and `recording` props, and the `.keycap` class that draws every chord inside an element as the shared key cap. See `docs/components/keychord.md`.
- `SegmentedChoice` `disabledChoices`; its look can be drawn on plain `aria-pressed` buttons with `segmented-choice` and `segmented-choice-option`. `Pager` `size` (`'inline'`, `'small'`, `'regular'`). `DateTimePicker` `size` (`'small'` by default, `'regular'` beside a 28px field). `DataGrid` `empty`, the content of a grid with no rows, and `initialWidth`'s optional fourth argument for a sort mark's room.
- Listing row states: `.row.selected`, `.row.marked`, `.row.pane-add`, `.pane-list.pointer` for a hover wash on rows that act on a click, and `.pane-listing.pane-pin-end`, which pins the actions column while the listing scrolls sideways. See `docs/components/listing.md`.
- `.filter-field` draws a listing's filter row; `.folder-menu-compact` and the `--menu-font-size` hook size a menu; `.palette-command` sets a palette row's context as a command line; `.chart-empty`, `.chart-empty-text`, and `.chart-swatch` for charts and legends a host draws.
- `DataGrid` styles `cell-null` and `cell-binary` cells.

### Changed

- Breaking: theme tokens retired. `--shadow-menu`, `--shadow-notice`, `--shadow-card`, and `--shadow-card-hover` are gone: read `--shadow-popover`. Read `--shadow-modal` for `--shadow-dialog`, `--shadow-raised` for `--shadow-segment` and `--shadow-knob`, `--surface` (off) or `--on-primary` (on) for `--switch-knob`, and the `--tonal-hover` colour for `--tonal-hover-brightness`. `--page-tabs-fade-start` and `--page-tabs-fade-end` are gone with the tab fades. See "Retired names" in `docs/themes.md`.
- Breaking: `ThemeOverrides` takes a six-digit hex colour for colour tokens only; a factor override such as `--tonal-hover-brightness` no longer type-checks. Move a factor override into the host's own stylesheet.
- Breaking: `themeStylesheet()` throws when `extraFixed` or an app token names any token the library now defines, the new scale tokens and colour roles included (`--space-4`, `--control-border`). Rename such an app token.
- Breaking: the base stylesheet now themes elements that carry no class: a text input, textarea, or select gets the field outline and ground; a checkbox or radio gets the `.check` look; scrollbars, the caret, `accent-color`, `::selection`, `::placeholder`, and `meter` take theme colours; every focusable element gets a 2px accent ring on `:focus-visible`; a `button[aria-pressed='true']` gets the on look. These rules weigh nothing (`:where()`), so any host rule wins. To keep a native checkbox's platform drawing, give it a class.
- Breaking: the menu, palette, and match-highlight classes (`.folder-menu*`, `.entry-menu-heading`, `.palette*`, `.name-hit`) apply anywhere, not only under `.listing-root`. A host that used these class names for its own elements outside the scope now gets the library's look on them.
- Breaking: `ActivityBar` draws its own track and fill (`.activity-bar`, `.activity-fill`); `className` and `fillClassName` are optional and add to them. Remove host rules that sized or coloured the track. A determinate fill that is not `moving` now dims to `--progress-idle`: a static meter passes `moving`.
- Breaking: `DataGrid` markup. `role="grid"`, the keyboard focus, and the scrolling moved from `.data-grid` to a new `.data-grid-scroll` inside it, which holds the header row and the `rowgroup`; `.data-grid` is now the frame. Point selectors, tests, and scroll handling at `.data-grid-scroll`.
- Breaking: `PageTabs` markup. The `.page-tabs` strip sits in a `.page-tabs-frame` with `.page-tabs-more` chevron buttons at an edge that hides tabs. A tab that does not fit whole carries `data-clipped`, is not drawn, and takes no click, though it stays reachable by the arrow keys. The edge fades are gone.
- Breaking: `Pager` keeps a step that cannot act in its place as a disabled button. It used to be an empty `span.pager-step` (icon steps) or left out (worded steps). Tests that count the pager's buttons need updating.
- Breaking: `ResultChart` shows the hovered value in a `.result-chart-float` panel beside the mark and writes it to a visually hidden live line; `.result-chart-readout` is gone.
- Breaking: listing labels, row names, `StateMark` words, and `PaneStatus` summaries carry their tooltip only while the text is cut (`cutTooltip`, `data-tooltip-cut`), not always. `StateMark` wraps its word in `.pane-state-word`, draws a shape per tone (dot, diamond, square, rings), and its busy spinner is the shared `Spinner`. `QuietAction` wraps its verb in `.pane-act-word`.
- Breaking: `KeyLegendStrip` drops verbs that do not fit whole instead of clipping the last one at the edge.
- Breaking: the terminal's context menu is portalled to the document body at `--z-dialog-popover`, and `BELL_FLASH_MS` is 280 (was 250), matching `--duration-slow`.
- Breaking: `DateTimePicker`'s panel is `position: fixed` at `--z-menu` and opens above its button when the room below is short, so a scrolling pane or dialog no longer clips it.
- Every component stylesheet reads the new scale tokens and colour roles instead of fixed values, so sizes, spacing, corners, and colours line up across components. Most visual changes in this release follow from this.
- A listing lays its strip and rows on one grid (subgrid) with a name column floor (`--pane-name-floor`, 14 characters), so a narrow pane scrolls sideways instead of cutting every name. A listing with no rows hides its column labels. Rows keep their state bar and a fade at the scroller's start edge while scrolled sideways.
- Hover is one clear step from rest and a press one clear step from hover in every theme; every outlined control and key cap shares one pressed look (`--press-frost`). A disabled primary, tonal, or danger button is drawn as a disabled neutral one.
- Dialogs set their own type (monospace for values, the interface font for sentences and labels), cap their height to the window and scroll their body under a pinned title strip and legend, and carry the lit top edge and `--shadow-modal`. `ConfirmDialog` wraps a long title to two lines, and its path list breaks after slashes and fades at a cut edge.
- `PanePathBar` cuts every crumb in an inner `.crumb-text` and gives way in one stated order (`docs/components/pane.md`, "How a narrow bar gives way"): the crumbs before the last, the last to a stem of eight characters, a fact's words, then the crumbs before the last scroll out of view, then its quiet actions' words step down to icons (`data-tight` on the row), then the last crumb. Nothing is drawn over anything and no control leaves the row, for every fact form. A trail its row cannot hold scrolls sideways with its scrollbar hidden and fades the side that hides crumbs; a focused crumb scrolls into view clear of the fade, and `PanePathBar` rests the trail on its end, a slash first (`data-cramped`, `--pane-crumb-fit`). The bar re-fits when any box in it resizes and once fonts load. It sets `--pane-crumb-count` and `--pane-crumb-here-room` on `.pane-path-row`; a hand-written trail sets them there too.
- A path fact of bare words, or of words after a mark (a `StateMark`, a host's empty span, an icon), cuts its words in one clamped line, and `PanePathBar` gives it its words as a tooltip while cut. A host box that may cut takes `.path-fact-text`; other host boxes keep their width. A `StateMark` with `word=""` draws no gap after its mark, so a fact's mark stands one `--space-3` from its words, and a fact that opens the tools stands clear of the trail.
- Key caps are one shared look across `KeyChord`, `KeyLegendStrip`, dialog legends, and `FilterEscape`. `SegmentedChoice`, `PageTabs`, `Pager`, menus, palettes, tooltips, `RunHeader`, and `SelectAllBar` take the shared hover, press, focus, and field looks; `SelectAllBar`'s checkbox is a `.check`. `RunHeader`'s running glyph is the `Spinner` and its headline carries a tooltip.
- Syntax tokens (`--syntax-*`) and `--on-tonal` in Catppuccin Latte are adjusted to keep 4.5:1 on the ground and a panel.
- Charts share one look (axis, grid lines, swatches, hovered mark); a chart with no values keeps its plot's place and centres a dim line; numbers from a million up are written short (`2.5M`); a pie with more than eight slices hatches the later ones, and its legend ends in a `+N` count of entries it leaves out.

### Fixed

- The terminal keeps every cell's text at 4.5:1 against that cell's background, draws selected text in `--terminal-selection-text`, shows a quiet outline cursor while unfocused, and shows a start failure as a danger notice.
- `NameCut` never leaves a gap between an ellipsis and the next part, and cuts a right-to-left name the mirrored way.
- `DataGrid` keeps an open editor inside the grid's frame, and its focus ring on the frame. `DateTimePicker` keeps its time fields on one row.
- The pinned actions column and side fades follow a right-to-left `dir`; a toggle that is on stays on under the pointer; scroll fades never cover a scroller's border or scrollbar.

### Removed

- The tokens and classes listed as breaking under Changed: `--shadow-menu`, `--shadow-dialog`, `--shadow-notice`, `--shadow-card`, `--shadow-card-hover`, `--shadow-segment`, `--shadow-knob`, `--switch-knob`, `--tonal-hover-brightness`, `--page-tabs-fade-start`, `--page-tabs-fade-end`, and `.result-chart-readout`.

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

[Unreleased]: https://github.com/Bigpixelrocket/uiok/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.3...v0.2.0
[0.1.3]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Bigpixelrocket/uiok/releases/tag/v0.1.0
