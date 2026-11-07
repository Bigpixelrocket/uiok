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

## Pull requests

- Branch from `main` and keep each pull request to one purpose.
- Title pull requests and commits with [Conventional Commits](https://www.conventionalcommits.org/): `feat: add Tooltip`, `fix: keep focus in ModalDialog`, `chore: update dependencies`.
- Pull requests are squash-merged, so the title becomes the commit on `main`.
- Add a line under `Unreleased` in `CHANGELOG.md` for any change a consumer would notice.
- `npm run check` must pass.
