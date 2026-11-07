/**
 * Fails `npm run site:build` when the built site holds a source map. The
 * site is published to GitHub Pages, and public artifacts ship no maps;
 * `build.sourcemap: false` in vite.config.ts keeps them out, and this check
 * catches a plugin or a config change that brings one back.
 */

import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('./dist/', import.meta.url));

const files = readdirSync(dist, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile())
  .map((entry) => join(entry.parentPath, entry.name));

const maps = files.filter((file) => file.endsWith('.map'));
if (maps.length > 0) {
  console.error(`site/dist holds source maps:\n${maps.join('\n')}`);
  process.exit(1);
}

if (!files.some((file) => file.endsWith('index.html'))) {
  console.error('site/dist holds no index.html.');
  process.exit(1);
}

console.log(`site/dist: ${files.length} files, no source maps.`);
