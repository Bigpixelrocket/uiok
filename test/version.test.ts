// @vitest-environment node

/**
 * The version rules CI applies to pull requests (`scripts/version.mjs check`)
 * and the release notes the release workflow reads from CHANGELOG.md.
 */

import { describe, expect, it } from 'vitest';

import {
  changelogSection,
  compareVersions,
  nextVersions,
  packageJsonChanges,
  shipsInPackage,
  versionProblems
} from '../scripts/version.mjs';

const REPOSITORY = 'https://github.com/Bigpixelrocket/uiok';

function packageJson(version: string, extra: Record<string, unknown> = {}) {
  return {
    name: '@bigpixelrocket/uiok',
    version,
    repository: { type: 'git', url: `git+${REPOSITORY}.git` },
    ...extra
  };
}

function changelog(version: string, previous = '0.1.0') {
  return [
    '# Changelog',
    '',
    '## [Unreleased]',
    '',
    `## [${version}] - 2026-11-08`,
    '',
    '### Fixed',
    '',
    '- A fix.',
    '',
    `## [${previous}] - 2026-11-07`,
    '',
    '- The first version.',
    '',
    `[Unreleased]: ${REPOSITORY}/compare/v${version}...HEAD`,
    `[${version}]: ${REPOSITORY}/compare/v${previous}...v${version}`,
    `[${previous}]: ${REPOSITORY}/releases/tag/v${previous}`,
    ''
  ].join('\n');
}

function lockfile(version: string) {
  return { version, packages: { '': { version } } };
}

/** `from` is where the branch started; `base` is the base branch's version now. */
function problems(options: {
  from?: string;
  base?: string;
  to?: string;
  changedPaths: string[];
  log?: string;
  lock?: string;
  head?: Record<string, unknown>;
}) {
  const { from = '0.1.0', base = from, to = from, changedPaths, head = {} } = options;
  return versionProblems({
    startPackage: packageJson(from),
    baseVersion: base,
    headPackage: packageJson(to, head),
    lockfile: lockfile(options.lock ?? to),
    changelog: options.log ?? changelog(to, from),
    changedPaths,
    today: '2026-11-08'
  });
}

describe('shipsInPackage', () => {
  it('counts source modules, assets, and the build, not tests, fixtures, docs, or the site', () => {
    expect(shipsInPackage('src/button/Button.tsx')).toBe(true);
    expect(shipsInPackage('src/terminal/ghostty/vendor/ghostty-vt.wasm')).toBe(true);
    expect(shipsInPackage('NOTICE')).toBe(true);
    expect(shipsInPackage('scripts/build.mjs')).toBe(true);
    expect(shipsInPackage('tsconfig.build.json')).toBe(true);
    expect(shipsInPackage('src/button/Button.test.tsx')).toBe(false);
    expect(shipsInPackage('src/themes/catppuccin-tokens.fixture.json')).toBe(false);
    expect(shipsInPackage('docs/components/button.md')).toBe(false);
    expect(shipsInPackage('site/src/pages.tsx')).toBe(false);
    expect(shipsInPackage('README.md')).toBe(false);
  });
});

describe('packageJsonChanges', () => {
  it('ignores the version, devDependencies, and scripts other than install hooks', () => {
    const base = packageJson('0.1.0', { scripts: { test: 'vitest' }, devDependencies: { a: '1' } });
    const tooling = packageJson('0.1.1', { scripts: { test: 'x' }, devDependencies: { a: '2' } });
    expect(packageJsonChanges(base, tooling)).toEqual([]);
    const shipped = packageJson('0.1.0', {
      scripts: { test: 'vitest', postinstall: 'node x' },
      devDependencies: { a: '1' },
      peerDependencies: { react: '^19' }
    });
    expect(packageJsonChanges(base, shipped)).toEqual(['peerDependencies', 'scripts.postinstall']);
  });
});

describe('compareVersions', () => {
  it('compares numerically and refuses pre-releases', () => {
    expect(compareVersions('0.10.0', '0.9.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('0.1.1', '0.2.0')).toBeLessThan(0);
    expect(() => compareVersions('1.0.0-beta.1', '0.9.0')).toThrow(/MAJOR\.MINOR\.PATCH/);
  });
});

describe('nextVersions', () => {
  it('lists the next patch, minor, and major', () => {
    expect(nextVersions('0.1.9')).toEqual(['0.1.10', '0.2.0', '1.0.0']);
  });
});

describe('versionProblems', () => {
  it('passes a change that does not reach the package without a bump', () => {
    expect(problems({ changedPaths: ['docs/themes.md', 'src/button/Button.test.tsx'] })).toEqual(
      []
    );
  });

  it('asks for a bump when a shipped file changes and the version does not', () => {
    const [problem, ...rest] = problems({ changedPaths: ['src/button/Button.tsx'] });
    expect(rest).toEqual([]);
    expect(problem).toContain('src/button/Button.tsx');
    expect(problem).toContain('npm version patch --no-git-tag-version');
  });

  it('asks for a bump when a consumer-facing package.json field changes', () => {
    const [problem] = problems({
      changedPaths: ['package.json'],
      head: { peerDependencies: { react: '^20' } }
    });
    expect(problem).toContain('package.json peerDependencies');
  });

  it('passes a bump with a dated section, its link, and a matching lockfile', () => {
    expect(problems({ to: '0.1.1', changedPaths: ['src/button/Button.tsx'] })).toEqual([]);
  });

  it('passes a one-step minor or major bump', () => {
    for (const to of ['0.2.0', '1.0.0']) {
      expect(problems({ from: '0.1.1', to, changedPaths: ['src/a.ts'] })).toEqual([]);
    }
  });

  it('refuses a bump that skips ahead, and pre-release or build versions', () => {
    for (const to of ['0.3.0', '0.1.11', '2.0.0', '0.1.3']) {
      const [problem] = problems({ from: '0.1.1', to, changedPaths: ['src/a.ts'] });
      expect(problem).toContain('skips ahead');
      expect(problem).toContain('0.1.2, 0.2.0, 1.0.0');
    }
    for (const to of ['0.1.2-beta.1', '0.1.2+build.5']) {
      const [problem] = problems({ from: '0.1.1', to, changedPaths: ['src/a.ts'] });
      expect(problem).toContain('not MAJOR.MINOR.PATCH');
    }
  });

  it('refuses an empty section for the new version', () => {
    const log = changelog('0.1.1').replace('### Fixed\n\n- A fix.\n', '');
    const found = problems({ to: '0.1.1', changedPaths: ['src/a.ts'], log });
    expect(found).toEqual([expect.stringContaining('"## [0.1.1]" section is empty')]);
  });

  it('refuses a version below the base', () => {
    const [problem] = problems({ from: '0.2.0', to: '0.1.9', changedPaths: [] });
    expect(problem).toContain('not above the base branch');
  });

  it('judges a branch that is only behind the base by its own changes', () => {
    expect(problems({ base: '0.1.1', changedPaths: ['docs/themes.md'] })).toEqual([]);
    const [problem] = problems({ base: '0.1.1', changedPaths: ['src/button/Button.tsx'] });
    expect(problem).toContain('Rebase on the base branch, which is at 0.1.1');
  });

  it('asks for a fresh bump when the base took the same version first', () => {
    const [problem] = problems({ base: '0.1.1', to: '0.1.1', changedPaths: ['src/a.ts'] });
    expect(problem).toContain('bump again from 0.1.1');
  });

  it('names each missing changelog and lockfile piece of a bump', () => {
    const found = problems({
      to: '0.1.1',
      changedPaths: ['src/button/Button.tsx'],
      log: changelog('0.1.0', '0.0.9').replace(
        '## [Unreleased]\n',
        '## [Unreleased]\n\n- Pending.\n'
      ),
      lock: '0.1.0'
    });
    expect(found).toHaveLength(5);
    expect(found[0]).toContain('no "## [0.1.1] - 2026-11-08" heading');
    expect(found[1]).toContain(`"[0.1.1]: ${REPOSITORY}/compare/v0.1.0...v0.1.1"`);
    expect(found[2]).toContain('"## [Unreleased]" section has entries');
    expect(found[3]).toContain('compare from v0.1.1');
    expect(found[4]).toContain('npm install --package-lock-only');
  });

  it('wants the new section to be the newest', () => {
    const log = changelog('0.1.1')
      .replace('## [0.1.1]', '## [0.1.2]')
      .replace('## [0.1.0]', '## [0.1.1]');
    const found = problems({ from: '0.1.0', to: '0.1.1', changedPaths: [], log });
    expect(found.some((problem) => problem.includes('newest version section'))).toBe(true);
  });
});

describe('changelogSection', () => {
  it("returns a version's entries, stopping before the next section or the link references", () => {
    const log = changelog('0.1.1');
    expect(changelogSection(log, '0.1.1')).toBe('### Fixed\n\n- A fix.');
    expect(changelogSection(log, '0.1.0')).toBe('- The first version.');
    expect(changelogSection(log, 'Unreleased')).toBe('');
    expect(changelogSection(log, '9.9.9')).toBeUndefined();
  });
});
