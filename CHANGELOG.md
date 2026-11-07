# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Themes: 18 light and dark themes as generated colour tokens inside `uiok/styles.css`, chosen with `data-light-theme` and `data-dark-theme` on the root element (`wearThemes`, `subscribeThemeChange`). The catalog, colour helpers, token rules, and `themeStylesheet()`, whose options let an app derive and emit tokens of its own, are exported. See `docs/themes.md`.
- `uiok/styles.css` declares `color-scheme: light dark` and fades every disabled control to `--disabled-opacity`.
- `UiokProvider`, `useLabels`, and `mergeLabels`: shared chrome strings (`UiokLabels`), English by default, with key names and glyphs in the `keys` group.
- Core components: `Button`, `IconButton`, `TooltipLayer` with `tooltip()` and `describedTooltip()`, `ActivityBar`, `SegmentedChoice`, `KeyChord`, `FilterIcon`, and `FilterEscape`, styled through `uiok/styles.css`.
- Keyboard policy: `shouldSuppressBrowserDocumentKey`, `cancelBrowserDocumentKey`, `isKeyKept`, the `MODAL_SELECTOR` and `OVERLAY_SELECTOR` overlay contract, `watchOverlays`, `holdPageSelectAll`, and chord helpers (`chordSpoken`, `chordGlyphs`, `chordParts`).
- Render helpers: `createValueStore`, `unheard`, `sameData`, `sameProps`, `useStableHandlers`, `keepUnchangedById`, `keepUnchangedBy`, and `useClock`.
- Key legend: `KeyLegendStrip`, a strip of the verbs the keyboard offers under a dock of held modifiers, with app-supplied pair labels, and the `legendUnits`, `fittingUnits`, `moreLabel`, and `moreListAction` rules (`uiok/legend`, `docs/components/legend.md`). Its chrome strings are the `legend` label group.
- Dialogs (`uiok/dialog`): `ModalDialog`, `DialogLegend` with `legendKeyAction`, `legendSignature`, and `filterLeaveLabel`, `ConfirmDialog`, and `containTab`; the `dialog` label group (`cancel`, `clear`, `affectedItems`). Run progress (`uiok/run`): `RunHeader`, `isSettledRun`, `runElapsedMs`, and `runClock`. See `docs/components/dialog.md` and `docs/components/run.md`.
- Listings and panes: `Listing`, `Strip`, `Row`, `Cell`, `RowCursorContext`, `StateMark`, `PathCell`, `WellColumn`, `CurrentDot`, and column widths (`column`, `ACTION_COLUMN`, `iconLinksColumn`, `linksColumn`) in `uiok/listing`; `PanePathBar`, `PaneStatus`, `QuietAction`, `RowIconAction`, `RowLinkLookContext`, and the two-pane keyboard `usePaneKeys` with `paneKeyAction` and its DOM helpers in `uiok/pane`. Styled under the `.listing-root` scope; a sorting column's accessible name comes from the new `listing` label group.
- `NameCut` with `labelParts` and `nameParts` (`uiok/namecut`), and `MarkedText` with `highlightSegments` (`uiok/text`).
- Data widgets: `DataGrid` with its row-window and cursor rules (`uiok/grid`); `DateTimePicker` with `parsePicker` and `formatPicker`, ISO 8601 by default and replaceable through `format` and `parse` (`uiok/datetime`); `Pager` with `pageCount`, `clampPage`, `pageSlice`, `pageOf`, and `selectorPages` (`uiok/pager`); `PageTabs` (`uiok/tabs`); `SelectAllBar` with `checkedAfterClick` (`uiok/selectall`). Their shared words come from the new `dateTime`, `pager`, and `selectAll` label groups.
- Filtered menus and palettes: the fuzzy matcher `matchQuery` with `hasQueryTerms` and `hasNegativeTerms`, the menu rules (`menuQueryRefused`, `moveMenuCursor`, `pickableCursor`, `movedPickableCursor`, and the level trail helpers), `useBellBeat`, and the menu look in `uiok/menu`; `Palette` and `PaletteQuery` in `uiok/palette`, whose words come from the new `palette` label group.
- Charts (`uiok/charts`): `LineChart`, `PieChart`, `ScatterChart`, and `ResultChart` (bar, column, line, spline, area, pie, timeline, scatter; stackable), painted from the `--chart-*` tokens, and `tokenColour`, `svgMarkup`, and `svgPng` to save a chart as a picture. Their shared words are the `charts` label group (`ChartLabels`).
- Each area is importable on its own as `uiok/<area>` (`uiok/button`, `uiok/keyboard`, …).
- `lucide-react` 1.x is a peer dependency.

## [0.0.1] - 2026-11-07

### Added

- `uiok/styles.css`, the base stylesheet: the `--font-ui` and `--font-mono` stacks, the `--z-panel`, `--z-dialog`, and `--z-tooltip` scale, the `--frost` backdrop filter, and the `visually-hidden` utility class.
- `VisuallyHidden`, a component for text that only assistive technology reads.

[Unreleased]: https://github.com/Bigpixelrocket/uiok/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Bigpixelrocket/uiok/releases/tag/v0.0.1
