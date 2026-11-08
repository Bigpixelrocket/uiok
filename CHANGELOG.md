# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/Bigpixelrocket/uiok/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/Bigpixelrocket/uiok/releases/tag/v0.1.0
