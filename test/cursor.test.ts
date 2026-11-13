// @vitest-environment node

/**
 * The cursor guard: the library is drawn for a desktop application, where
 * the pointer is the arrow over every control (a button, a tab, a row, a
 * link, a crumb, a toggle), disabled or not. The I-beam stays where text is
 * typed or selected, the resize cursors on splitters and column edges, and
 * the crosshair where a drag picks a region of a plot.
 *
 * So no hand-written stylesheet of the library or the docs site, and no
 * inline style in their scripts, sets a cursor a web page uses for a control:
 * the hand (`pointer`), the grabbing hands (`grab`, `grabbing`), or the
 * refusals (`not-allowed`, `no-drop`), prefixed or not. A host mirrors this
 * test over its own stylesheets with the same pattern.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

/** The cursor values a web page uses for a control, which no desktop control shows. */
const WEB_CURSOR =
  /(?<![\w-])cursor\s*:\s*['"]?(?:-webkit-|-moz-)?(?:pointer|hand|grab|grabbing|not-allowed|no-drop)\b/i;

/** Every stylesheet and script of the library and the docs site, tests left out. */
const SOURCES: readonly string[] = ['src', 'site/src'].flatMap((dir) =>
  readdirSync(join(ROOT, dir), { recursive: true, encoding: 'utf8' })
    .map((path) => `${dir}/${path.split('\\').join('/')}`)
    .filter((file) => /\.(?:css|tsx?)$/.test(file) && !/\.test\.tsx?$/.test(file))
    .sort()
);

/** Each line of `source` that sets a web cursor, comments left out, as `file:line: text`. */
function webCursors(file: string, source: string): string[] {
  const text = source.replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, ' '));
  return text
    .split('\n')
    .flatMap((line, index) =>
      WEB_CURSOR.test(line.replace(/\/\/.*$/, '')) ? [`${file}:${index + 1}: ${line.trim()}`] : []
    );
}

describe('cursors in the library and the docs site', () => {
  it('reads every stylesheet', () => {
    expect(SOURCES).toEqual(
      expect.arrayContaining(['src/styles.css', 'src/button/button.css', 'site/src/site.css'])
    );
  });

  it('never show the hand, a grabbing hand, or a refusal', () => {
    expect(
      SOURCES.flatMap((file) => webCursors(file, readFileSync(join(ROOT, file), 'utf8'))),
      'A desktop control keeps the arrow (cursor: default)'
    ).toEqual([]);
  });

  it('finds a web cursor in a rule or an inline style, not in a comment', () => {
    const sheet = [
      '.a { cursor: pointer; }',
      '.b { cursor: default; }',
      '/* cursor: pointer */',
      '.c {',
      '  cursor: -webkit-grab;',
      '}',
      '.d { cursor:not-allowed }',
      '.e { cursor: col-resize; }'
    ].join('\n');
    expect(webCursors('x.css', sheet)).toEqual([
      'x.css:1: .a { cursor: pointer; }',
      'x.css:5: cursor: -webkit-grab;',
      'x.css:7: .d { cursor:not-allowed }'
    ]);
    expect(
      webCursors('x.tsx', "const s = { cursor: 'pointer' };\n// cursor: 'grab'\nconst t = 1;")
    ).toEqual(["x.tsx:1: const s = { cursor: 'pointer' };"]);
  });
});
