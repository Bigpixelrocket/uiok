# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `UiokProvider`, `useLabels`, and `mergeLabels`: shared chrome strings (`UiokLabels`), English by default, with key names and glyphs in the `keys` group.
- Core components: `Button`, `IconButton`, `TooltipLayer` with `tooltip()` and `describedTooltip()`, `ActivityBar`, `SegmentedChoice`, `KeyChord`, `FilterIcon`, and `FilterEscape`, styled through `uiok/styles.css`.
- Keyboard policy: `shouldSuppressBrowserDocumentKey`, `cancelBrowserDocumentKey`, `isKeyKept`, the `MODAL_SELECTOR` and `OVERLAY_SELECTOR` overlay contract, `watchOverlays`, `holdPageSelectAll`, and chord helpers (`chordSpoken`, `chordGlyphs`, `chordParts`).
- Render helpers: `createValueStore`, `unheard`, `sameData`, `sameProps`, `useStableHandlers`, `keepUnchangedById`, `keepUnchangedBy`, and `useClock`.
- Each area is importable on its own as `uiok/<area>` (`uiok/button`, `uiok/keyboard`, …).
- `lucide-react` 1.x is a peer dependency.

## [0.0.1] - 2026-11-07

### Added

- `uiok/styles.css`, the base stylesheet: the `--font-ui` and `--font-mono` stacks, the `--z-panel`, `--z-dialog`, and `--z-tooltip` scale, the `--frost` backdrop filter, and the `visually-hidden` utility class.
- `VisuallyHidden`, a component for text that only assistive technology reads.

[Unreleased]: https://github.com/Bigpixelrocket/uiok/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Bigpixelrocket/uiok/releases/tag/v0.0.1
