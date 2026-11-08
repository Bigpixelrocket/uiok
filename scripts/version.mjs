/**
 * Keeps package.json's version, CHANGELOG.md, and npm in step, so merging a
 * version bump to main is the whole release (`.github/workflows/release.yml`).
 *
 * - `check <base>`: run by CI on pull requests. A change that reaches the
 *   published package must raise the version to the next patch, minor, or
 *   major of `<base>`'s, and a raised version needs a dated CHANGELOG.md
 *   section listing its changes, its link reference, an empty
 *   `[Unreleased]`, and a matching package-lock.json. It compares the working
 *   tree, untracked files included, with the merge base of `<base>` and HEAD,
 *   so it also runs locally before a commit:
 *   `node scripts/version.mjs check origin/main`.
 * - `notes`: prints the current version's CHANGELOG.md section, the body of
 *   its GitHub Release.
 * - `exceeds <version>`: exits 1 unless the current version is greater, so
 *   the release never publishes below npm's latest.
 *
 * Versions are MAJOR.MINOR.PATCH only; the release flow has no pre-releases.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

/** The files outside `src/` that change what the package ships or how it is built. */
const SHIPPED_FILES = ['NOTICE', 'LICENSE', 'scripts/build.mjs', 'tsconfig.build.json'];

/** package.json fields that never reach a consumer; `scripts` counts only for its install hooks. */
const UNSHIPPED_FIELDS = new Set(['version', 'devDependencies', 'scripts']);
const INSTALL_SCRIPTS = ['preinstall', 'install', 'postinstall'];

const RELEASE_VERSION = /^(\d+)\.(\d+)\.(\d+)$/;

/**
 * Whether a changed path reaches the published package: anything under
 * `src/` but the tests and fixtures `tsconfig.build.json` and
 * `scripts/build.mjs` leave out, and the files in `SHIPPED_FILES`.
 * README.md and CHANGELOG.md ship too, but describe the package rather than
 * change it; package.json is judged field by field (`packageJsonChanges`).
 * tsconfig.json, the lockfile, and devDependencies count as tooling, though
 * the build extends tsconfig.json and compiles with the locked TypeScript, so
 * bump by hand when one of them changes what `dist/` holds.
 */
export function shipsInPackage(path) {
  if (path.startsWith('src/')) return !/\.test\.tsx?$|\.fixture\.[^/]+$/.test(path);
  return SHIPPED_FILES.includes(path);
}

/** The package.json fields that differ in a way a consumer would see, as display names. */
export function packageJsonChanges(base, head) {
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const changed = [...new Set([...Object.keys(base), ...Object.keys(head)])].filter(
    (field) => !UNSHIPPED_FIELDS.has(field) && !same(base[field], head[field])
  );
  for (const hook of INSTALL_SCRIPTS) {
    if (!same(base.scripts?.[hook], head.scripts?.[hook])) changed.push(`scripts.${hook}`);
  }
  return changed;
}

/** Orders two MAJOR.MINOR.PATCH versions: negative, zero, or positive as `a` is lower, equal, or higher. */
export function compareVersions(a, b) {
  const [left, right] = [a, b].map((version) => {
    const match = RELEASE_VERSION.exec(version);
    if (!match) throw new Error(`${version} is not a MAJOR.MINOR.PATCH version`);
    return match.slice(1).map(Number);
  });
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

/** The versions one step above `version`: its next patch, minor, and major. */
export function nextVersions(version) {
  const [major, minor, patch] = version.split('.').map(Number);
  return [`${major}.${minor}.${patch + 1}`, `${major}.${minor + 1}.0`, `${major + 1}.0.0`];
}

/**
 * The body of a CHANGELOG.md section (`## [<name>]`, dated or not), trimmed,
 * up to the next `## ` heading or the link references; undefined when the
 * heading is missing.
 */
export function changelogSection(changelog, name) {
  const lines = changelog.split(/\r?\n/);
  const start = lines.findIndex(
    (line) => line === `## [${name}]` || line.startsWith(`## [${name}] - `)
  );
  if (start === -1) return undefined;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## ') || /^\[[^\]]+\]: /.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join('\n').trim();
}

/**
 * What a pull request must fix before it can merge, each a one-line
 * instruction; empty when its version and changelog are in order.
 * `startPackage` is package.json where the branch left the base (the merge
 * base), so a branch that is only behind is judged by its own changes;
 * `baseVersion` is the base's version now, whose next patch, minor, or major
 * a raised version must be.
 * In CI the two coincide: the pull request's merge commit sits on the base.
 */
export function versionProblems({
  startPackage,
  baseVersion,
  headPackage,
  lockfile,
  changelog,
  changedPaths,
  today
}) {
  const from = baseVersion;
  const to = headPackage.version;
  const reasons = [
    ...changedPaths.filter(shipsInPackage),
    ...packageJsonChanges(startPackage, headPackage).map((field) => `package.json ${field}`)
  ];
  const rebase =
    startPackage.version === from ? '' : `Rebase on the base branch, which is at ${from}, then: `;
  const bump = `${rebase}Run \`npm version patch --no-git-tag-version\` (\`minor\` for a breaking change before 1.0; from 1.0, \`major\` for breaking, \`minor\` for a feature, \`patch\` for a fix), then add a "## [<new version>] - ${today}" section to CHANGELOG.md with its link reference.`;

  if (!RELEASE_VERSION.test(to)) {
    return [
      `package.json version ${to} is not MAJOR.MINOR.PATCH; the release flow publishes plain versions only.`
    ];
  }
  if (to === startPackage.version) {
    if (reasons.length === 0) return [];
    const shown = reasons.slice(0, 5).join(', ') + (reasons.length > 5 ? ', …' : '');
    return [
      `This change reaches the published package (${shown}) but does not raise package.json's version (${to}). ${bump}`
    ];
  }
  if (compareVersions(to, from) <= 0) {
    return [
      `package.json version ${to} is not above the base branch's ${from}, which already took it or a later one. Rebase on the base branch, set the version back to ${from} (package-lock.json too), drop your "## [${to}]" CHANGELOG.md heading and link reference, and bump again from ${from}.`
    ];
  }
  const next = nextVersions(from);
  if (!next.includes(to)) {
    return [
      `package.json version ${to} skips ahead of the base branch's ${from}; a bump is one step: ${next.join(', ')} (patch, minor, major). Set the version back to ${from} (package-lock.json too) and run \`npm version <patch|minor|major> --no-git-tag-version\`.`
    ];
  }

  const problems = [];
  const repository = String(headPackage.repository?.url ?? headPackage.repository ?? '')
    .replace(/^git\+/, '')
    .replace(/\.git$/, '');
  const escaped = to.replaceAll('.', '\\.');
  const newest = changelog.split(/\r?\n/).find((line) => /^## \[(?!Unreleased\])/.test(line));
  if (!new RegExp(`^## \\[${escaped}\\] - \\d{4}-\\d{2}-\\d{2}$`, 'm').test(changelog)) {
    problems.push(
      `CHANGELOG.md has no "## [${to}] - ${today}" heading. Add it below "## [Unreleased]" with the changes ${to} ships.`
    );
  } else if (!newest?.startsWith(`## [${to}] - `)) {
    problems.push(
      `CHANGELOG.md's "## [${to}]" section must be the newest version section, directly below "## [Unreleased]".`
    );
  } else if (!changelogSection(changelog, to)) {
    problems.push(
      `CHANGELOG.md's "## [${to}]" section is empty. List the changes ${to} ships under it; they become its GitHub Release notes.`
    );
  }
  if (!new RegExp(`^\\[${escaped}\\]: \\S+`, 'm').test(changelog)) {
    problems.push(
      `CHANGELOG.md has no link reference for ${to}. Add "[${to}]: ${repository}/compare/v${from}...v${to}" above "[${from}]: …" at the bottom.`
    );
  }
  if (changelogSection(changelog, 'Unreleased')) {
    problems.push(
      `CHANGELOG.md's "## [Unreleased]" section has entries. Move them under "## [${to}]"; merging publishes ${to}, so nothing stays unreleased.`
    );
  }
  const unreleasedLink = /^\[Unreleased\]: (\S+)$/m.exec(changelog)?.[1];
  if (unreleasedLink !== undefined && !unreleasedLink.endsWith(`/compare/v${to}...HEAD`)) {
    problems.push(
      `CHANGELOG.md's "[Unreleased]" link must compare from v${to}: "[Unreleased]: ${repository}/compare/v${to}...HEAD".`
    );
  }
  if (lockfile.version !== to || lockfile.packages?.['']?.version !== to) {
    problems.push(
      `package-lock.json does not have version ${to}. Run \`npm install --package-lock-only\` to match package.json.`
    );
  }
  return problems;
}

function git(...args) {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' });
}

function readText(path) {
  return readFileSync(join(root, path), 'utf8');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function check(base) {
  if (!base) fail('Usage: node scripts/version.mjs check <base commit or branch>');
  const mergeBase = git('merge-base', base, 'HEAD').trim();
  const startPackage = JSON.parse(git('show', `${mergeBase}:package.json`));
  const baseVersion = JSON.parse(git('show', `${base}:package.json`)).version;
  const headPackage = JSON.parse(readText('package.json'));
  const problems = versionProblems({
    startPackage,
    baseVersion,
    headPackage,
    lockfile: JSON.parse(readText('package-lock.json')),
    changelog: readText('CHANGELOG.md'),
    // NUL-separated, so git does not quote non-ASCII paths; untracked files count too.
    changedPaths: [
      ...git('diff', '--name-only', '--no-renames', '-z', mergeBase).split('\0'),
      ...git('ls-files', '--others', '--exclude-standard', '-z').split('\0')
    ].filter(Boolean),
    today: new Date().toISOString().slice(0, 10)
  });
  if (problems.length > 0) {
    // In GitHub Actions each problem also becomes an annotation on the pull request.
    if (process.env.GITHUB_ACTIONS === 'true') {
      for (const problem of problems) console.log(`::error title=Version check::${problem}`);
    }
    fail(`Version check failed against ${base}:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
  }
  console.log(
    headPackage.version === startPackage.version
      ? `Version check passed: no change to the published package; version stays ${headPackage.version}.`
      : `Version check passed: ${baseVersion} -> ${headPackage.version}.`
  );
}

function notes() {
  const { version } = JSON.parse(readText('package.json'));
  const section = changelogSection(readText('CHANGELOG.md'), version);
  if (!section) {
    fail(
      `CHANGELOG.md has no "## [${version}] - YYYY-MM-DD" section with entries to use as release notes.`
    );
  }
  process.stdout.write(`${section}\n`);
}

function exceeds(other) {
  if (!other) fail('Usage: node scripts/version.mjs exceeds <version>');
  const { version } = JSON.parse(readText('package.json'));
  if (compareVersions(version, other) <= 0)
    fail(`Version ${version} is not greater than ${other}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  const [command, argument] = process.argv.slice(2);
  if (command === 'check') check(argument);
  else if (command === 'notes') notes();
  else if (command === 'exceeds') exceeds(argument);
  else fail('Usage: node scripts/version.mjs <check <base> | notes | exceeds <version>>');
}
