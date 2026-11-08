# Releasing

Merging a version bump to `main` releases it. A pull request that changes the published package raises `version` in `package.json` by one step (the next patch, minor, or major) and adds a dated `CHANGELOG.md` section listing its changes; CI's version check (`scripts/version.mjs`) fails the pull request otherwise. Pull requests that change only docs, the site, tests, or CI keep the version.

## The release workflow

Every push to `main` runs `.github/workflows/release.yml`:

1. If npm already has `package.json`'s version, it skips to step 3. If the version is not above npm's `latest`, it fails rather than publish a downgrade.
2. Otherwise it runs `npm run check` and `npm publish --provenance --access public`. It authenticates through npm Trusted Publishing (OIDC), so the repository stores no npm token, and npm attaches a provenance statement.
3. If the GitHub Release `vX.Y.Z` does not exist yet, it creates it, and the tag with it on the commit npm published from, using the version's `CHANGELOG.md` section as the notes.

Each step checks before it acts, so a push without a version change does nothing. Runs queue one at a time, and GitHub keeps only the newest waiting run: a version whose pending Release run was cancelled by a later push is folded into the next, and the version in that push is the one published. Confirm a release under the repository's Actions tab, then check the version and its provenance badge on https://www.npmjs.com/package/@bigpixelrocket/uiok.

## When a run fails

- **The failure was transient** (a registry or GitHub outage): open the Release workflow under the Actions tab and run it again, or start it with **Run workflow** on `main`. It publishes and releases whatever is still missing for the version `main` has now; an older version that `main` has moved past stays unreleased.
- **The gate failed on test or CI code**: fix it in a pull request that changes no shipped file and keeps the version. The push that merges it publishes the same version.
- **The gate failed on the package itself, or the published package is wrong**: fix it in a new pull request with the next patch version. npm never accepts the same version twice, so a version that reached npm stays as it is; when the failed version never reached npm, move its `CHANGELOG.md` entries into the new section.

Leave tags and releases to the workflow. A tag created by hand is reused as it is by the next run, even when it names another commit.

## One-time setup

The package is `@bigpixelrocket/uiok`, owned by the `bigpixelrocket` npm organization; its `@bigpixelrocket:developers` team has read-write access. npm can only trust a workflow for a package that already exists, so the first version is published by hand.

1. Publish `0.1.0` from a clean checkout of `main`, signed in to an npm account in the `@bigpixelrocket:developers` team:

   ```sh
   npm ci
   npm publish --no-provenance --access public
   ```

   `prepublishOnly` runs `npm run check` first. `--no-provenance` overrides `publishConfig.provenance`, since provenance can only be generated in CI. `publishConfig.access` already makes the scoped package public, so `--access public` only states that explicitly.

2. Open the package settings at https://www.npmjs.com/package/@bigpixelrocket/uiok/access, find **Trusted Publisher**, choose **GitHub Actions**, and enter:
   - Organization or user: `Bigpixelrocket`
   - Repository: `uiok`
   - Workflow filename: `release.yml`
   - Environment: leave empty

3. In the same settings, under **Publishing access**, require two-factor authentication and disallow tokens, so only the trusted workflow can publish.

4. Tag the commit you published so tags and npm versions line up:

   ```sh
   git tag v0.1.0 <commit>
   git push origin v0.1.0
   ```

Every later version publishes through the workflow, which npm trusts by its filename: renaming `release.yml` breaks publishing until the Trusted Publisher entry is updated.
