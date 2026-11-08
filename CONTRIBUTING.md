# Contributing

## Setup

Use the Node version in `.nvmrc` (the current LTS) and npm:

```sh
npm ci
```

## Commands

| Command                | What it does                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run typecheck`    | Type-checks sources, tests, and configs (`tsconfig.json`).                    |
| `npm run lint`         | Runs ESLint.                                                                  |
| `npm run format`       | Formats every file with Prettier.                                             |
| `npm run format:check` | Fails on a file Prettier would change.                                        |
| `npm test`             | Runs the Vitest suites under jsdom.                                           |
| `npm run build`        | Builds `dist/`: ESM modules, declarations, and stylesheets.                   |
| `npm run verify:pack`  | Fails if a source map or a missing `exports` target would reach the tarball.  |
| `npm run check`        | Runs all of the above in order; CI runs it on every pull request and on main. |
| `npm run site:dev`     | Serves the documentation site from source with hot reload.                    |
| `npm run site:build`   | Builds the site into `site/dist` and fails if a source map lands there.       |

## Pull requests

- Branch from `main` and keep each pull request to one purpose.
- Title pull requests and commits with [Conventional Commits](https://www.conventionalcommits.org/): `feat: add Tooltip`, `fix: keep focus in ModalDialog`, `chore: update dependencies`.
- Pull requests are squash-merged, so the title becomes the commit on `main`.
- A pull request that changes the published package (`src/` other than tests and fixtures, `NOTICE`, the build, or a `package.json` field a consumer sees) raises the version by one step and documents it: run `npm version patch --no-git-tag-version` (`minor` for a breaking change before 1.0), then add a `## [X.Y.Z] - YYYY-MM-DD` section listing the changes, and its link reference, to `CHANGELOG.md`. CI checks this; run `node scripts/version.mjs check origin/main` to check it locally. Merging releases the new version to npm (`docs/releasing.md`).
- `npm run check` must pass.
