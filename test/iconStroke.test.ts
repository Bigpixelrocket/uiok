// @vitest-environment node

/**
 * One stroke weight and four sizes for every icon. The stroke is lucide's
 * default (2 on its 24-unit grid), so an icon never looks bolder or thinner
 * than its neighbours (`docs/components/icon.md`). No module of the library
 * or the docs site, and no code example in `docs/`, passes `strokeWidth` to
 * an icon; a glyph drawn larger than `ICON_LG` (`ICON_XL`, an empty state's
 * glyph) passes `absoluteStrokeWidth`, which keeps the default weight at 2px
 * on screen instead of scaling it up. A size is one of the constants
 * (`ICON_SM`, `ICON_MD`, `ICON_LG`, `ICON_XL`), never a number written at the
 * call site, the docs' examples included, since a reader copies them.
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

/** Every Markdown page of `docs/`, whose fenced code blocks a reader copies. */
const DOCS: readonly string[] = readdirSync(join(ROOT, 'docs'), {
  recursive: true,
  encoding: 'utf8'
})
  .map((path) => `docs/${path.split('\\').join('/')}`)
  .filter((file) => file.endsWith('.md'));

/**
 * The lines to check, each with its place: every line of a module, and every
 * line inside a fenced code block of a docs page (prose may name a prop).
 */
function codeLines(): { place: string; line: string }[] {
  const modules = MODULES.flatMap((file) =>
    readFileSync(join(ROOT, file), 'utf8')
      .split('\n')
      .map((line, index) => ({ place: `${file}:${index + 1}`, line }))
  );
  const examples = DOCS.flatMap((file) => {
    let fenced = false;
    return readFileSync(join(ROOT, file), 'utf8')
      .split('\n')
      .flatMap((line, index) => {
        if (/^\s*(?:```|~~~)/.test(line)) {
          fenced = !fenced;
          return [];
        }
        return fenced ? [{ place: `${file}:${index + 1}`, line }] : [];
      });
  });
  return [...modules, ...examples];
}

describe('icon stroke weight and size', () => {
  it('reads the library, the docs site, and the docs', () => {
    expect(MODULES.some((file) => file.startsWith('src/'))).toBe(true);
    expect(MODULES.some((file) => file.startsWith('site/src/'))).toBe(true);
    expect(DOCS).toContain('docs/components/icon.md');
  });

  it('passes no strokeWidth to an icon', () => {
    const found = codeLines().flatMap(({ place, line }) =>
      /\bstrokeWidth\s*=/.test(line) ? [`${place}: ${line.trim()}`] : []
    );

    expect(found).toEqual([]);
  });

  it('sizes an icon with a constant, not a number', () => {
    const found = codeLines().flatMap(({ place, line }) =>
      /\bsize=\{\d+\}/.test(line) ? [`${place}: ${line.trim()}`] : []
    );

    expect(found).toEqual([]);
  });
});
