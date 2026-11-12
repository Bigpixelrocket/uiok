/**
 * Types for the functions `scripts/version.mjs` exports, so its tests
 * (`test/version.test.ts`) type-check without compiling JavaScript.
 * Each function's contract is documented in the script.
 */

/** package.json, as far as the version rules read it. */
export interface PackageJson {
  version: string;
  repository?: string | { url?: string };
  scripts?: Record<string, string>;
  [field: string]: unknown;
}

/** Whether a changed path reaches the published package. */
export function shipsInPackage(path: string): boolean;

/** The package.json fields that differ in a way a consumer would see. */
export function packageJsonChanges(base: PackageJson, head: PackageJson): string[];

/** Orders two MAJOR.MINOR.PATCH versions; throws on any other form. */
export function compareVersions(a: string, b: string): number;

/** The next patch, minor, and major of a version. */
export function nextVersions(version: string): [string, string, string];

/** The trimmed body of a CHANGELOG.md section; undefined when the heading is missing. */
export function changelogSection(changelog: string, name: string): string | undefined;

/** What a pull request must fix before it can merge; empty when nothing. */
export function versionProblems(options: {
  startPackage: PackageJson;
  baseVersion: string;
  headPackage: PackageJson;
  changelog: string;
  changedPaths: string[];
  today: string;
}): string[];
