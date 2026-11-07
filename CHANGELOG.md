# Changelog

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Themes: 18 light and dark themes as generated colour tokens inside `uiok/styles.css`, chosen with `data-light-theme` and `data-dark-theme` on the root element (`wearThemes`, `subscribeThemeChange`). The catalog, colour helpers, token rules, and `themeStylesheet()`, whose options let an app derive and emit tokens of its own, are exported. See `docs/themes.md`.
- `uiok/styles.css` declares `color-scheme: light dark` and fades every disabled control to `--disabled-opacity`.

## [0.0.1] - 2026-11-07

### Added

- `uiok/styles.css`, the base stylesheet: the `--font-ui` and `--font-mono` stacks, the `--z-panel`, `--z-dialog`, and `--z-tooltip` scale, the `--frost` backdrop filter, and the `visually-hidden` utility class.
- `VisuallyHidden`, a component for text that only assistive technology reads.

[Unreleased]: https://github.com/Bigpixelrocket/uiok/compare/v0.0.1...HEAD
[0.0.1]: https://github.com/Bigpixelrocket/uiok/releases/tag/v0.0.1
