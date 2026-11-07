// @vitest-environment node

/**
 * Keeps the theme stylesheet (`themes.generated.css`) in step with the theme
 * catalog it is derived from. A palette, rule, or override changed in the
 * catalog fails here until the stylesheet follows it. Regenerate it with
 * `UPDATE_THEMES=1 npx vitest run src/themes/themes.test.ts`.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import * as prettier from 'prettier';
import { describe, expect, it } from 'vitest';

import { themeStylesheet } from './tokens.js';

const STYLESHEET_PATH = fileURLToPath(new URL('./themes.generated.css', import.meta.url));

describe('the theme stylesheet', () => {
  it('holds every token the catalog derives', async () => {
    const config = await prettier.resolveConfig(STYLESHEET_PATH);
    const generated = await prettier.format(themeStylesheet(), {
      ...config,
      filepath: STYLESHEET_PATH
    });

    if (process.env.UPDATE_THEMES === '1') writeFileSync(STYLESHEET_PATH, generated);

    expect(
      readFileSync(STYLESHEET_PATH, 'utf8'),
      'themes.generated.css is stale; run UPDATE_THEMES=1 npx vitest run src/themes/themes.test.ts'
    ).toBe(generated);
  });
});
