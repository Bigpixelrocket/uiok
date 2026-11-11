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

describe('pointer states of the shared recipes and form controls', () => {
  /** Every style rule whose selector names a pointer state, with that state read as always on. */
  const pressedRules = (): { selector: string; rule: CSSStyleRule }[] => {
    applyStylesheets(readStylesheet('src/styles.css'));
    return [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
      .filter((rule) =>
        /:(?:hover|active)\b/.test(rule.selectorText.replace(/:not\([^()]*\)/g, ''))
      )
      .map((rule) => ({
        selector: rule.selectorText.replace(/:(?:hover|active)\b/g, ':where(*)'),
        rule
      }));
  };

  it('keeps a checked or mixed box filled while it is pressed', () => {
    const rules = pressedRules();
    document.body.innerHTML = `<input type="checkbox" class="check" checked>`;
    const box = document.querySelector('input') as HTMLInputElement;
    const washes = rules
      .filter(({ selector }) => box.matches(selector))
      .filter(({ rule }) => /pressed-wash/.test(rule.style.getPropertyValue('background-color')));

    expect(washes.map(({ rule }) => rule.selectorText)).toEqual([]);
    document.body.innerHTML = '';
  });

  it('gives the chosen tab, segment, or page neither hover nor press', () => {
    const rules = pressedRules();
    document.body.innerHTML = `
      <button class="page-tab" role="tab" aria-selected="true">Rows</button>
      <button class="segmented-choice-option" role="radio" aria-checked="true">Day</button>
      <button class="pager-step" aria-current="page">4</button>
      <button class="crumb-label" aria-current="location">site</button>`;
    const chosen = [...document.querySelectorAll('button')].flatMap((element) =>
      rules
        .filter(({ selector }) => selector.startsWith(':where(') && element.matches(selector))
        .map(({ rule }) => `${element.className}: ${rule.selectorText}`)
    );

    expect(chosen).toEqual([]);
    document.body.innerHTML = '';
  });

  it('keeps an on toggle on under hover and press', () => {
    const rules = pressedRules();
    // Every control that can carry aria-pressed, on. A pointer rule written
    // for the on state names [aria-pressed='true'] outside :not(); any other
    // that matches one would paint it as an off control under the pointer.
    document.body.innerHTML = `<div class="listing-root">
      <button aria-pressed="true">Plain</button>
      <button class="button button-primary" aria-pressed="true">Primary</button>
      <button class="button button-tonal" aria-pressed="true">Tonal</button>
      <button class="button button-neutral" aria-pressed="true">Neutral</button>
      <button class="button button-danger" aria-pressed="true">Danger</button>
      <button class="icon-button" aria-label="Wrap" aria-pressed="true"></button>
      <button class="filter-escape" aria-pressed="true">esc</button>
      <nav class="pager"><button class="pager-step" aria-pressed="true">Next</button></nav>
      <div class="key-legend"><button class="legend-slot" aria-pressed="true">Go</button></div>
      <div class="keylegend-verbs"><button aria-pressed="true">Run</button></div>
      <button class="pane-act" aria-pressed="true">Open</button>
      <button class="pane-icon-act" aria-label="Pin" aria-pressed="true"></button>
      <button class="path-star" aria-label="Star" aria-pressed="true"></button>
      <button class="crumb-label" aria-pressed="true">site</button>
      <button class="pane-strip-link" aria-pressed="true">All</button>
      <button class="palette-level" aria-pressed="true">Level</button>
      <button class="settings-sidebar-page" aria-pressed="true">Page</button>
      <button class="settings-sidebar-subsection" aria-pressed="true">Part</button>
    </div>`;
    const onRule = (selector: string): boolean =>
      /\[aria-pressed=['"]?true['"]?\]/.test(
        selector.replace(/:not\([^()]*(?:\([^()]*\))?[^()]*\)/g, '')
      );
    const painted = (rule: CSSStyleRule): boolean =>
      ['background', 'background-color', 'box-shadow', 'color'].some(
        (name) => rule.style.getPropertyValue(name) !== ''
      );
    const undone = [...document.querySelectorAll('button')].flatMap((element) =>
      rules
        .filter(({ rule }) => painted(rule) && !onRule(rule.selectorText))
        .filter(({ selector }) => element.matches(selector))
        .map(({ rule }) => `${element.className || element.textContent}: ${rule.selectorText}`)
    );

    expect(undone).toEqual([]);
    document.body.innerHTML = '';
  });

  it('lets a press win over a hover on every quiet control', () => {
    const rules = pressedRules();
    document.body.innerHTML = `
      <button class="page-tab" role="tab" aria-selected="false">Rows</button>
      <button class="pane-sort sortable">Size</button>
      <button class="crumb-label">site</button>
      <button class="pager-step">Next</button>`;
    for (const element of document.querySelectorAll('button')) {
      const matched = rules.filter(
        ({ selector, rule }) =>
          rule.style.getPropertyValue('background') !== '' && element.matches(selector)
      );
      const last = matched.at(-1);

      expect(last?.rule.selectorText, element.className).toMatch(/:active\b/);
    }
    document.body.innerHTML = '';
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
  // A theme picker's miniature sits in a [data-theme-preview] scope, which
  // sets only the palette names; the role aliases resolve on :root, so
  // inside the preview they would paint the worn theme, not the previewed one.
  const previewScope = (file: string, selector: string): boolean =>
    file === 'src/shell/shell.css' && selector.startsWith('.theme-preview');

  it('paints grounds through their role names, not the palette names', () => {
    const raw = sheetRules
      .filter(({ file, selector }) => !previewScope(file, selector))
      .flatMap(({ file, selector, body }) =>
        [...body.matchAll(/var\(--(?:bg|bg-panel|bg-header|cursor-bg|cursor-row-bg)\)/g)].map(
          ([use]) => `${file} ${selector}: ${use}`
        )
      );

    expect(raw).toEqual([]);
  });

  // A hue as a mark (an icon, a dot, a bar) needs 3:1, which the hue token
  // holds; as words it needs 4.5:1, which only its text role holds
  // (--accent-text, --danger-text, --warning-text, --success-text). A syntax
  // hue (--syntax-*) is a palette colour with no text floor at all. So a
  // hue is a text colour only on a selector that draws a mark, by its name
  // or by being an icon or a pseudo-element.
  it('sets words in a text role, never a bare hue', () => {
    const mark =
      /svg|icon|glyph|dot|mark|arrow|chevron|spinner|caret|bar\b|knob|thumb|::?(?:before|after)|\.keychord/;
    const hued = sheetRules.flatMap(({ file, selector, body }) =>
      [
        ...body.matchAll(
          /(?:^|;)\s*color:\s*(var\(--(?:accent|danger|warning|success|primary|syntax-[a-z-]+)\))/g
        )
      ]
        .filter(() => !mark.test(selector))
        .map(([, use]) => `${file} ${selector}: color ${use}`)
    );

    expect(hued).toEqual([]);
  });
});
