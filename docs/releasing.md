# Releasing

Publishing a GitHub Release publishes the package to npm. The release workflow (`.github/workflows/release.yml`) checks that the release tag is `v` plus the `package.json` version, runs `npm run check`, and runs `npm publish --provenance --access public`. It authenticates through npm Trusted Publishing (OIDC), so the repository stores no npm token.

## Cut a release

1. On a branch, set the version and move the `Unreleased` entries in `CHANGELOG.md` under a new heading for it:

   ```sh
   npm version <patch|minor|major> --no-git-tag-version
   ```

2. Open a pull request titled `chore: release vX.Y.Z` and squash-merge it once CI passes.
3. Create the release from `main`, tagging the merge commit:

   ```sh
   gh release create vX.Y.Z --repo Bigpixelrocket/uiok --target main --title vX.Y.Z --notes-file <notes.md>
   ```

4. Watch the Release workflow run under the repository's Actions tab, then confirm the version and its provenance badge on https://www.npmjs.com/package/@bigpixelrocket/uiok.

A failed run publishes nothing. Fix the cause on `main`, delete the release and its tag, and create them again.

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

4. Tag the commit you published so tags and npm versions line up. Push the tag alone rather than creating a GitHub Release, which would run the workflow against a version npm already has:

   ```sh
   git tag v0.1.0 <commit>
   git push origin v0.1.0
   ```

Every later version publishes through the workflow.
