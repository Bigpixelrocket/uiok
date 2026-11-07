/**
 * The publish guard, run after `npm run build`: fails when a source map could
 * ship, when an `exports` target is missing from the tarball, when an area
 * does not resolve as `uiok/<area>`, or when a packed stylesheet imports one
 * that is not packed.
 *
 * A source map is a `.map` file in `dist/` or in the file list
 * `npm pack --dry-run --json` reports, or a `sourceMappingURL` comment in a
 * built file, which would point consumers at a map the package does not ship.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const dist = join(root, 'dist');
const problems = [];

const built = (existsSync(dist) ? readdirSync(dist, { recursive: true, withFileTypes: true }) : [])
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name));
if (built.length === 0) problems.push('dist/ is empty; run npm run build first');

for (const file of built) {
  const path = relative(root, file);
  if (file.endsWith('.map')) problems.push(`${path}: source map in dist/`);
  else if (/[#@]\s*sourceMappingURL=/.test(readFileSync(file, 'utf8'))) {
    problems.push(`${path}: sourceMappingURL comment`);
  }
}

const [pack] = JSON.parse(
  execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: root,
    encoding: 'utf8'
  })
);
const packed = new Set(pack.files.map((file) => file.path));
for (const path of packed) {
  if (path.endsWith('.map')) problems.push(`${path}: source map in the npm tarball`);
}

/** Every file path an `exports` entry names, conditions included. */
function exportTargets(entry) {
  if (typeof entry === 'string') return [entry];
  return Object.values(entry ?? {}).flatMap(exportTargets);
}
const { name, exports } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

/** The areas under `src/` with an `index.ts`, each published as `<name>/<area>`. */
const areas = readdirSync(join(root, 'src'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(root, 'src', entry.name, 'index.ts')))
  .map((entry) => entry.name);

for (const target of exportTargets(exports)) {
  const path = target.replace(/^\.\//, '');
  if (!path.includes('*')) {
    if (!packed.has(path)) problems.push(`${path}: named in exports but missing from the tarball`);
    continue;
  }
  // A subpath pattern must resolve for every area, and only areas fill it.
  if (areas.length === 0) problems.push(`${path}: a pattern export with no area to fill it`);
  for (const area of areas) {
    const filled = path.replaceAll('*', area);
    if (!packed.has(filled)) problems.push(`${filled}: area ${area} missing from the tarball`);
  }
}

// Each area resolves through the exports map as a consumer's import would,
// by the package's own name (Node resolves a package's self-reference).
for (const area of areas) {
  try {
    const resolved = relative(root, fileURLToPath(import.meta.resolve(`${name}/${area}`)));
    if (!packed.has(resolved)) problems.push(`${name}/${area}: resolves to unpacked ${resolved}`);
  } catch (error) {
    problems.push(`${name}/${area}: does not resolve (${error.message})`);
  }
}

// A packed stylesheet's relative @import must land on a packed stylesheet,
// or a consumer's bundler fails on uiok/styles.css.
for (const path of packed) {
  if (!path.endsWith('.css')) continue;
  const source = readFileSync(join(root, path), 'utf8');
  for (const [, imported] of source.matchAll(/@import\s+(?:url\()?\s*['"](\.[^'"]+)['"]/g)) {
    const target = relative(root, join(root, dirname(path), imported));
    if (!packed.has(target))
      problems.push(`${path}: imports ${imported}, missing from the tarball`);
  }
}

if (problems.length > 0) {
  console.error(`Pack verification failed:\n${problems.map((p) => `  ${p}`).join('\n')}`);
  process.exit(1);
}
console.log(`Pack verification passed: ${pack.filename}, ${packed.size} files, no source maps.`);
for (const path of [...packed].sort()) console.log(`  ${path}`);
