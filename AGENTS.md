# AGENTS.md

UIOK is an open-source (MIT) React 19 UI library published to npm as `uiok`. It is app-agnostic: any React app can use it, not only Bigpixelrocket's desktop apps.

- Keep the library free of app concerns: no Electron, no desktop bridge, no i18n runtime. Copy enters through props, so the consuming app translates it.
- Paint every colour through a theme token (`var(--…)`); no colour literal belongs in a component or the base stylesheet (`test/colorLiterals.test.ts`). A new colour is a rule in `src/themes/tokens.ts`; after changing the catalog or a rule, regenerate the stylesheet with `UPDATE_THEMES=1 npx vitest run src/themes/themes.test.ts` (`docs/themes.md`).
- Give every exported symbol a docblock; `test/api.test.ts` fails on an undocumented export of `src/index.ts`.
- Ship no source maps or declaration maps. `tsconfig.build.json` turns them off and `scripts/verify-pack.mjs` fails the gate if one reaches `dist/` or the tarball.
- Import local modules with the `.js` extension (`./VisuallyHidden.js`); the package is ESM only and `tsc` emits imports as written.
- Run `npm run check` before pushing; CI runs the same command.
- Title commits and pull requests with Conventional Commits; pull requests are squash-merged. Note consumer-visible changes under `Unreleased` in `CHANGELOG.md`.

## Architecture

```text
src/index.ts                  # the public API: every export is part of the package contract
src/styles.css                # base stylesheet, shipped as uiok/styles.css: imports the theme tokens; tokens no theme changes, utilities, the disabled-control rule
src/VisuallyHidden.tsx        # one component per module, its test beside it (VisuallyHidden.test.tsx)
src/themes/ids.ts             # theme ids, names, appearances, the data-light-theme / data-dark-theme / data-theme-preview attributes
src/themes/color.ts           # hex parsing, sRGB mixes, translucent forms, WCAG contrast
src/themes/catalog.ts         # one palette per theme, with its upstream credit and any hand-tuned overrides
src/themes/tokens.ts          # palette-to-token rules, FIXED_TOKENS, PREVIEW_TOKENS, themeStylesheet() and its app extension options
src/themes/attributes.ts      # wearThemes and subscribeThemeChange for the root attributes
src/themes/themes.generated.css # the generated token stylesheet, committed; themes.test.ts fails when it is stale
src/themes/tokens.test.ts     # contrast invariants in every theme; Latte and Mocha frozen in catppuccin-tokens.fixture.json
test/colorLiterals.test.ts    # no colour literal in src/ outside the token blocks and the catalog; only ids and attributes imported from src/themes/
test/api.test.ts              # every public export has a docblock (TypeScript checker over src/index.ts)
test/setup.ts                 # Testing Library cleanup after each test
scripts/build.mjs             # cleans dist/, runs tsc -p tsconfig.build.json, copies src/**/*.css
scripts/verify-pack.mjs       # no .map or sourceMappingURL in dist/ or npm pack output; every exports target packed
tsconfig.json                 # strict, NodeNext; type-checks src, test, and configs without emitting
tsconfig.build.json           # emits dist/: one .js and .d.ts per module, no maps, no Node types
vitest.config.ts              # jsdom by default; a suite opts into node with `@vitest-environment node`
.github/workflows/ci.yml      # npm ci and npm run check on pull requests and main
.github/workflows/release.yml # on a published GitHub Release: tag check, gate, npm publish via Trusted Publishing
docs/releasing.md             # how to cut a release and the one-time npm setup
docs/themes.md                # how themes work, the attribute contract, tokens by role, app tokens, the migration renames
```

`package.json` `exports` maps `.` (`dist/index.js` and its types), `./styles.css`, and `./package.json`. A new public stylesheet or entry point needs an `exports` entry; `verify-pack.mjs` checks each target ships.
