/**
 * The single-stylesheet contract: consumers import `@bigpixelrocket/uiok/styles.css` alone,
 * so every stylesheet under `src/` (a component's beside it, the generated
 * theme tokens) must be reached from `src/styles.css`.
 */

import { readdirSync, readFileSync } from 'node:fs';
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

describe('@bigpixelrocket/uiok/styles.css', () => {
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
      // Each pointer state reads as always true; :where(*) keeps a list
      // such as :is(:hover, .cursor) a valid selector.
      .map((selector) => selector.replace(/:(?:hover|active)\b/g, ':where(*)'));
    const highlighted = (disabled: boolean): string[] => {
      // A fieldset disables what it holds, so no control here takes its own prop.
      document.body.innerHTML = `<fieldset${disabled ? ' disabled' : ''} class="listing-root">
        <button class="button button-primary">Save</button>
        <button class="button button-tonal">Install</button>
        <button class="button button-neutral">Close</button>
        <button class="icon-button" aria-label="Refresh"></button>
        <button class="segmented-choice-option" role="radio" aria-checked="false">Day</button>
        <button class="filter-escape"><kbd class="keychord">esc</kbd></button>
        <nav class="pager"><button class="pager-step">Next</button></nav>
        <button class="page-tab" role="tab" aria-selected="false">Rows</button>
        <div class="data-grid"><button class="data-grid-label data-grid-sort">id</button>
          <button class="data-grid-link">42</button></div>
        <button class="date-picker-day" role="gridcell">7</button>
        <label class="select-all-check"><input type="checkbox">Check all</label>
        <input class="field"><select class="field field-sm"></select>
        <input type="checkbox" class="check" checked><input type="radio" class="check">
        <input type="checkbox" role="switch" class="switch">
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

/** A rule of a component sheet: its file, selector, and declarations, comments blanked. */
interface SheetRule {
  readonly file: string;
  readonly selector: string;
  readonly body: string;
}

/** Every innermost rule of every component sheet (an @media's rules included). */
const sheetRules: readonly SheetRule[] = componentSheets
  .filter((sheet) => sheet !== 'themes/themes.generated.css')
  .flatMap((sheet) => {
    const text = readFileSync(join(SRC, sheet), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    return [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector = '', body = '']) => ({
      file: `src/${sheet}`,
      selector: selector.trim().replace(/\s+/g, ' '),
      body
    }));
  });

describe('colour roles in the component sheets', () => {
  // The palette-named grounds are the source the role aliases read
  // (docs/themes.md); a sheet names the role: --ground, --surface,
  // --surface-header, --fill, --cursor-row.
  it('paints grounds through their role names, not the palette names', () => {
    const raw = sheetRules.flatMap(({ file, selector, body }) =>
      [...body.matchAll(/var\(--(?:bg|bg-panel|bg-header|cursor-bg|cursor-row-bg)\)/g)].map(
        ([use]) => `${file} ${selector}: ${use}`
      )
    );

    expect(raw).toEqual([]);
  });

  // A hue as a mark (an icon, a dot, a bar) needs 3:1, which the hue token
  // holds; as words it needs 4.5:1, which only its text role holds
  // (--accent-text, --danger-text, --warning-text, --success-text). So a
  // hue is a text colour only on a selector that draws a mark, by its name
  // or by being an icon or a pseudo-element.
  it('sets words in a text role, never a bare hue', () => {
    const mark =
      /svg|icon|glyph|dot|mark|pane-state|arrow|chevron|spinner|caret|bar\b|knob|thumb|::?(?:before|after)|\.keychord/;
    const hued = sheetRules.flatMap(({ file, selector, body }) =>
      [...body.matchAll(/(?:^|;)\s*color:\s*(var\(--(?:accent|danger|warning|success|primary)\))/g)]
        .filter(() => !mark.test(selector))
        .map(([, use]) => `${file} ${selector}: color ${use}`)
    );

    expect(hued).toEqual([]);
  });
});
