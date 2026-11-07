# AGENTS.md

UIOK is an open-source (MIT) React 19 UI library published to npm as `uiok`. It is app-agnostic: any React app can use it, not only Bigpixelrocket's desktop apps.

- Keep the library free of app concerns: no Electron, no desktop bridge, no i18n runtime, no app package imports. Per-instance copy enters through props; chrome strings every instance shares come from `UiokLabels` through `UiokProvider`, English by default (`docs/labels.md`). Comments name no consuming app or its private features.
- Paint every colour through a theme token (`var(--…)`); no colour literal belongs in a component or the base stylesheet (`test/colorLiterals.test.ts`). A new colour is a rule in `src/themes/tokens.ts`; after changing the catalog or a rule, regenerate the stylesheet with `UPDATE_THEMES=1 npx vitest run src/themes/themes.test.ts` (`docs/themes.md`).
- Give every exported symbol a docblock; `test/api.test.ts` fails on an undocumented export of `src/index.ts`.
- Ship no source maps or declaration maps. `tsconfig.build.json` turns them off and `scripts/verify-pack.mjs` fails the gate if one reaches `dist/` or the tarball.
- Import local modules with the `.js` extension (`./VisuallyHidden.js`); the package is ESM only and `tsc` emits imports as written.
- Run `npm run check` before pushing; CI runs the same command.
- Title commits and pull requests with Conventional Commits; pull requests are squash-merged. Note consumer-visible changes under `Unreleased` in `CHANGELOG.md`.

## Architecture

```text
src/index.ts                  # the public API: one `export * from './<area>/index.js'` line per area
src/styles.css                # base stylesheet, shipped as uiok/styles.css: imports the theme tokens and one sheet per component; tokens no theme changes, utilities, the disabled-control rule
src/VisuallyHidden.tsx        # a root-level component, its test beside it (VisuallyHidden.test.tsx)
src/<area>/index.ts           # an area's public surface, importable as uiok/<area>; modules, tests, and its .css sit beside it
src/themes/ids.ts             # theme ids, names, appearances, the data-light-theme / data-dark-theme / data-theme-preview attributes
src/themes/color.ts           # hex parsing, sRGB mixes, translucent forms, WCAG contrast
src/themes/catalog.ts         # one palette per theme, with its upstream credit and any hand-tuned overrides
src/themes/tokens.ts          # palette-to-token rules, FIXED_TOKENS, PREVIEW_TOKENS, themeStylesheet() and its app extension options
src/themes/attributes.ts      # wearThemes and subscribeThemeChange for the root attributes
src/themes/themes.generated.css # the generated token stylesheet, committed; themes.test.ts fails when it is stale
src/themes/tokens.test.ts     # contrast invariants in every theme; Latte and Mocha frozen in catppuccin-tokens.fixture.json
src/labels/                   # UiokProvider, useLabels, mergeLabels; UiokLabels.ts composes one group per area (keys.ts); docs/labels.md
src/keyboard/                 # browser-key guard, overlay selectors and watchOverlays (public contract), page select-all hold, chord words and glyphs
src/tooltip/                  # TooltipLayer (mount once) and the tooltip() / describedTooltip() attributes it reads
src/button/                   # Button (primary, tonal, neutral) and IconButton
src/activity/ src/segmented/ src/keychord/ src/filter/  # ActivityBar, SegmentedChoice, KeyChord, FilterIcon and FilterEscape
src/store/ src/clock/         # ValueStore, sameData/sameProps, useStableHandlers, keepUnchanged*; useClock
docs/components/<area>.md     # per area: purpose, props, example, keyboard behaviour, labels read
test/colorLiterals.test.ts    # no colour literal in src/ outside the token blocks and the catalog; only ids and attributes imported from src/themes/
test/api.test.ts              # every public export has a docblock (TypeScript checker over src/index.ts)
test/cancelKey.test.ts        # no library module writes the ⌘. chord; Escape is the one cancel key
test/stylesheets.ts           # CSS test helpers: readStylesheet (follows @import), applyStylesheets, declaredValues
test/stylesheets.test.ts      # src/styles.css imports every component stylesheet
test/setup.ts                 # Testing Library cleanup after each test; calls no app code
scripts/build.mjs             # cleans dist/, runs tsc -p tsconfig.build.json, copies src/**/*.css
scripts/verify-pack.mjs       # no source maps; every exports target packed; each area resolves as uiok/<area>; packed @imports resolve
tsconfig.json                 # strict, NodeNext; type-checks src, test, and configs without emitting
tsconfig.build.json           # emits dist/: one .js and .d.ts per module, no maps, no Node types
vitest.config.ts              # jsdom by default; a suite opts into node with `@vitest-environment node`
.github/workflows/ci.yml      # npm ci and npm run check on pull requests and main
.github/workflows/release.yml # on a published GitHub Release: tag check, gate, npm publish via Trusted Publishing
docs/releasing.md             # how to cut a release and the one-time npm setup
docs/themes.md                # how themes work, the attribute contract, tokens by role, app tokens, the migration renames
```

`package.json` `exports` maps `.` (`dist/index.js` and its types), `./styles.css`, `./package.json`, and the pattern `./*` to `dist/<area>/index.js` and `index.d.ts`, so a new `src/<area>/index.ts` is importable as `uiok/<area>` with no exports change. A new stylesheet is imported from `src/styles.css`; any other public file needs its own `exports` entry. `verify-pack.mjs` checks each.

To add an area: create `src/<area>/` with an `index.ts` barrel (a docblock on every export), put its CSS beside it and `@import` it from `src/styles.css`, add one `export *` line to `src/index.ts`, write `docs/components/<area>.md`, and add any shared chrome strings as a label group (`docs/labels.md`). Per-instance copy is a prop. `lucide-react` is a peer dependency for icons.
