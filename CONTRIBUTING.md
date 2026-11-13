# Contributing

## Setup

[mise](https://mise.jdx.dev) installs the Node and pnpm versions pinned in `mise.toml` (and the Zig that `scripts/build-libghostty-vt.sh` needs). In a new clone, trust the config once, install, then install dependencies with pnpm:

```sh
mise trust && mise install
pnpm install
```

pnpm links every checkout's packages to one shared copy in its store (`enableGlobalVirtualStore` in `pnpm-workspace.yaml`), so a second clone or worktree installs in about a second and takes almost no disk.

## Commands

| Command                 | What it does                                                                  |
| ----------------------- | ----------------------------------------------------------------------------- |
| `pnpm run typecheck`    | Type-checks sources, tests, and configs (`tsconfig.json`).                    |
| `pnpm run lint`         | Runs ESLint.                                                                  |
| `pnpm run format`       | Formats every file with Prettier.                                             |
| `pnpm run format:check` | Fails on a file Prettier would change.                                        |
| `pnpm test`             | Runs the Vitest suites under jsdom.                                           |
| `pnpm run build`        | Builds `dist/`: ESM modules, declarations, and stylesheets.                   |
| `pnpm run verify:pack`  | Fails if a source map or a missing `exports` target would reach the tarball.  |
| `pnpm run check`        | Runs all of the above in order; CI runs it on every pull request and on main. |
| `pnpm run site:dev`     | Serves the documentation site from source with hot reload.                    |
| `pnpm run site:build`   | Builds the site into `site/dist` and fails if a source map lands there.       |

Pass a script's arguments after its name without `--` (`pnpm run site:dev --port 5174`); pnpm would hand a `--` on to the script.

## Pull requests

- Branch from `main` and keep each pull request to one purpose.
- Title pull requests and commits with [Conventional Commits](https://www.conventionalcommits.org/): `feat: add Tooltip`, `fix: keep focus in ModalDialog`, `chore: update dependencies`.
- Pull requests are squash-merged, so the title becomes the commit on `main`.
- A pull request that changes the published package (`src/` other than tests, fixtures, and Markdown, `NOTICE`, the build, or a `package.json` field a consumer sees) raises the version by one step and documents it: run `pnpm version patch --no-git-tag-version --no-git-checks` (`minor` for a breaking change before 1.0), then add a `## [X.Y.Z] - YYYY-MM-DD` section listing the changes, and its link reference, to `CHANGELOG.md`. CI checks this; run `node scripts/version.mjs check origin/main` to check it locally. Merging releases the new version to npm (`docs/releasing.md`).
- `pnpm run check` must pass.
