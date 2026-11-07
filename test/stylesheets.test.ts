/**
 * The single-stylesheet contract: consumers import `uiok/styles.css` alone,
 * so every stylesheet under `src/` (a component's beside it, the generated
 * theme tokens) must be reached from `src/styles.css`.
 */

import { readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  applyStylesheets,
  declaredValues,
  readStylesheet,
  stylesheetImports
} from './stylesheets.js';

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..', 'src');

/** Every `.css` under `src/` but the base sheet itself. */
const componentSheets = readdirSync(SRC, { recursive: true, withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.endsWith('.css'))
  .map((entry) => relative(SRC, join(entry.parentPath, entry.name)).split('\\').join('/'))
  .filter((path) => path !== 'styles.css');

describe('uiok/styles.css', () => {
  it('imports every stylesheet under src/', () => {
    const imported = stylesheetImports('src/styles.css').map((path) => path.replace(/^\.\//, ''));

    expect(componentSheets.length).toBeGreaterThan(0);
    expect(componentSheets.filter((sheet) => !imported.includes(sheet))).toEqual([]);
  });

  it('delivers the component rules once its imports are followed', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = '<button class="button button-primary">Save</button>';
    const button = document.querySelector('button') as HTMLButtonElement;

    expect(declaredValues(button, 'background')).toContain('var(--primary)');
    document.body.innerHTML = '';
  });

  it('leaves a disabled control out of every hover and press highlight', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    // Each rule's selector as if the pointer were over and pressing everything.
    // A rule that names the pointer only inside :not() draws a control at
    // rest, no highlight, so it is left out.
    const pointerRules = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
      .map((rule) => rule.selectorText)
      .filter((selector) => /:(?:hover|active)\b/.test(selector.replace(/:not\([^()]*\)/g, '')))
      .map((selector) => selector.replace(/:(?:hover|active)\b/g, ''));
    const highlighted = (disabled: boolean): string[] => {
      // A fieldset disables what it holds, so no control here takes its own prop.
      document.body.innerHTML = `<fieldset${disabled ? ' disabled' : ''} class="listing-root">
        <button class="button button-primary">Save</button>
        <button class="button button-tonal">Install</button>
        <button class="button button-neutral">Close</button>
        <button class="icon-button" aria-label="Refresh"></button>
        <button class="segmented-choice-option" role="radio" aria-checked="false">Day</button>
        <button class="filter-escape"><kbd class="keychord">esc</kbd></button>
      </fieldset>`;
      const elements = [...document.querySelectorAll('fieldset *')];
      const matched = elements.flatMap((element) =>
        pointerRules
          .filter((selector) => element.matches(selector))
          .map((selector) => `${element.className}: ${selector}`)
      );
      document.body.innerHTML = '';
      return matched;
    };

    expect(pointerRules.length).toBeGreaterThan(0);
    expect(highlighted(false).length).toBeGreaterThan(0);
    expect(highlighted(true)).toEqual([]);
  });
});
