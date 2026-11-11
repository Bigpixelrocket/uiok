// @vitest-environment node

/**
 * One stroke weight and three sizes for every icon. The stroke is lucide's
 * default (2 on its 24-unit grid),
 * so an icon never looks bolder or thinner than its neighbours
 * (`docs/components/icon.md`). No module of the library or the docs site
 * passes `strokeWidth` to an icon; a glyph drawn larger than `ICON_LG` (a hero
 * glyph) passes `absoluteStrokeWidth`, which keeps the default weight at 2px
 * on screen instead of scaling it up. A size is one of the constants
 * (`ICON_SM`, `ICON_MD`, `ICON_LG`), never a number written at the call site.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** Every TSX module of the library and the docs site, tests left out. */
const MODULES: readonly string[] = ['src', 'site/src'].flatMap((dir) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .map((path) => `${dir}/${path.split('\\').join('/')}`)
    .filter((file) => file.endsWith('.tsx') && !file.includes('.test.'))
);

describe('icon stroke weight and size', () => {
  it('reads the library and the docs site', () => {
    expect(MODULES.some((file) => file.startsWith('src/'))).toBe(true);
    expect(MODULES.some((file) => file.startsWith('site/src/'))).toBe(true);
  });

  it('passes no strokeWidth to an icon', () => {
    const found = MODULES.flatMap((file) =>
      readFileSync(join(ROOT, file), 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          /\bstrokeWidth\s*=/.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : []
        )
    );

    expect(found).toEqual([]);
  });

  it('sizes an icon with a constant, not a number', () => {
    const found = MODULES.flatMap((file) =>
      readFileSync(join(ROOT, file), 'utf8')
        .split('\n')
        .flatMap((line, index) =>
          /\bsize=\{\d+\}/.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : []
        )
    );

    expect(found).toEqual([]);
  });
});
