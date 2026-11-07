/**
 * Builds `dist/` from scratch: `tsc -p tsconfig.build.json` emits the ESM
 * modules and their declarations, then every stylesheet under `src/` is copied
 * to the same relative path, so `src/styles.css` ships as `@bigpixelrocket/uiok/styles.css`.
 * So is every runtime asset a module names with `new URL('./…',
 * import.meta.url)` (the terminal's WebAssembly and symbols font), with the
 * licence files that travel beside vendored code.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, statSync } from 'node:fs';
import { basename } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = fileURLToPath(new URL('../src', import.meta.url));
const dist = fileURLToPath(new URL('../dist', import.meta.url));

/** The non-module files that ship: stylesheets, runtime assets, and vendored licences. */
const COPIED_EXTENSIONS = ['.css', '.wasm', '.woff2'];

rmSync(dist, { recursive: true, force: true });

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'inherit' });

cpSync(src, dist, {
  recursive: true,
  filter: (source) =>
    statSync(source).isDirectory() ||
    COPIED_EXTENSIONS.some((extension) => source.endsWith(extension)) ||
    basename(source) === 'LICENSE'
});
