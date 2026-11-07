/**
 * Builds `dist/` from scratch: `tsc -p tsconfig.build.json` emits the ESM
 * modules and their declarations, then every stylesheet under `src/` is copied
 * to the same relative path, so `src/styles.css` ships as `@bigpixelrocket/uiok/styles.css`.
 */

import { execFileSync } from 'node:child_process';
import { cpSync, rmSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const src = fileURLToPath(new URL('../src', import.meta.url));
const dist = fileURLToPath(new URL('../dist', import.meta.url));

rmSync(dist, { recursive: true, force: true });

const tsc = createRequire(import.meta.url).resolve('typescript/bin/tsc');
execFileSync(process.execPath, [tsc, '-p', 'tsconfig.build.json'], { cwd: root, stdio: 'inherit' });

cpSync(src, dist, {
  recursive: true,
  filter: (source) => statSync(source).isDirectory() || source.endsWith('.css')
});
