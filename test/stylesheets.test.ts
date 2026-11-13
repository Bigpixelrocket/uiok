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

  it('leads the Updates card and the progress header in it with one glyph size', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="update-card">
      <div class="update-card-head"><svg class="update-card-glyph"></svg></div>
      <div class="run-header"><div class="run-header-top"><svg class="run-header-glyph"></svg></div></div>
    </div>`;
    const size = (selector: string) => {
      const style = getComputedStyle(document.querySelector(selector) as Element);
      return [style.width, style.height];
    };

    expect(size('.run-header-glyph')).toEqual(size('.update-card-glyph'));
    // A figure on the card's status line shares its size and baseline.
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="update-card"><div class="run-header"><span class="run-header-headline">About 9 seconds left</span><span class="run-header-figure">0:09</span></div></div>`
    );
    const line = (selector: string, property: string) =>
      declaredValues(document.querySelectorAll(selector)[0] as Element, property).at(-1);
    for (const property of ['font-size', 'line-height']) {
      expect(line('.run-header-figure', property), property).toBe(
        line('.run-header-headline', property)
      );
    }
    expect(size('.update-card-glyph')).toEqual(['var(--icon-md)', 'var(--icon-md)']);
    document.body.innerHTML = '';
  });

  it("hangs the Updates card's glyph on the first line and never shrinks its status row", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="update-card with-notes">
      <div class="update-card-head"><svg class="update-card-glyph"></svg>
        <div class="update-card-said"></div><button class="button">Restart</button></div>
    </div>`;
    const head = document.querySelector('.update-card-head') as Element;
    const half = (size: string) => `calc((var(--control-height-sm) - ${size}) / 2)`;

    // Only the notes give way when the column is short.
    // jsdom writes `flex: none` out as its longhands.
    expect(declaredValues(head, 'flex').at(-1)).toMatch(/^(?:none|0 0 auto)$/);
    expect(declaredValues(head, 'align-items').at(-1)).toBe('start');
    expect(
      declaredValues(document.querySelector('.update-card-glyph') as Element, 'margin-top').at(-1)
    ).toBe(half('var(--icon-md)'));
    expect(
      declaredValues(document.querySelector('.update-card-said') as Element, 'padding-block').at(-1)
    ).toBe(half('var(--line-height-compact)'));
    expect(
      declaredValues(
        document.querySelector('.update-card-head > button') as Element,
        'align-self'
      ).at(-1)
    ).toBe('center');
    document.body.innerHTML = '';
  });

  it("gives a load failure's headline its whole width before the reason gets any", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="space-load-failure"><svg></svg>
      <strong>The list could not be loaded</strong><p>permission denied</p><button>Try Again</button></div>`;
    const line = document.querySelector('.space-load-failure') as Element;

    // A grid, not a flex row: a flex row with a tiny shrink factor still cut
    // the headline by a fraction of a pixel, enough to draw its ellipsis.
    expect(declaredValues(line, 'display').at(-1)).toBe('grid');
    expect(declaredValues(line, 'grid-template-columns').at(-1)).toBe(
      'auto minmax(0, max-content) minmax(3ch, 1fr) auto'
    );
    expect(declaredValues(document.querySelector('strong') as Element, 'flex-shrink')).toEqual([]);
    document.body.innerHTML = '';
  });

  it('centres a label on the field that leads its row, in a dialog or not', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const padding = `calc((var(--control-height) - var(--line-height-compact)) / 2)`;
    for (const host of ['dialog', 'settings-page', 'page']) {
      document.body.innerHTML = `<div class="${host}"><div class="field-grid">
        <label class="field-label">Name</label><input class="field">
        <label class="field-label">Port</label><input class="field field-sm">
      </div></div>`;
      const [regular, small] = [...document.querySelectorAll('label')];

      expect(declaredValues(regular as Element, 'padding-block').at(-1), host).toBe(padding);
      expect(declaredValues(small as Element, 'padding-block').at(-1), host).toBe('var(--space-2)');
    }
    document.body.innerHTML = '';
  });

  it("rings the What's New list's frame when the keyboard focuses the list", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="update-notes-frame">
      <ul class="update-notes-list scroll-fade" tabindex="0"><li>One</li></ul></div>`;
    const frame = document.querySelector('.update-notes-frame') as HTMLElement;
    (document.querySelector('ul') as HTMLElement).focus();

    expect(declaredValues(frame, 'outline').at(-1)).toBe(
      'var(--focus-ring-width) solid var(--accent)'
    );
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
        <button class="toggle-chip" aria-pressed="false">Wrap</button>
        <button class="quiet-control">Stop</button>
        <button class="quiet-track-item" role="tab" aria-selected="false">Log</button>
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

describe('delivered tokens', () => {
  // A token the library delivers in every theme has a reader: a rule or a
  // module under src/ or site/src/ that writes var(--name). The tokens
  // below are read where this suite cannot see: by script through their
  // names (chart series, the terminal's colours, group and syntax hues), by
  // the consuming apps, or by a size constant that mirrors them.
  const READ_ELSEWHERE = [
    /^--group-/,
    /^--chart-\d$/,
    /^--terminal-/,
    /^--syntax-/,
    // Palette-drawn roles and app-read tokens, documented in docs/themes.md
    // and docs/tokens.md.
    /^--primary-hue$/,
    /^--success-wash$/,
    /^--accent-line$/,
    /^--warning-line$/,
    /^--duration-base$/,
    /^--z-drag$/,
    // ICON_XL (src/icon/sizes.ts) mirrors it for lucide's size prop.
    /^--icon-xl$/
  ];

  it('delivers no token that nothing reads', () => {
    const sources = (dir: string): string[] =>
      readdirSync(join(SRC, '..', dir), { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.(css|tsx?)$/.test(entry.name))
        .map((entry) => join(entry.parentPath, entry.name))
        .filter((path) => !path.endsWith('themes.generated.css'));
    const text = [...sources('src'), ...sources('site/src')]
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    const delivered = new Set(
      ['themes/themes.generated.css', 'tokens.css'].flatMap((sheet) =>
        [...readFileSync(join(SRC, sheet), 'utf8').matchAll(/(--[\w-]+)\s*:/g)].map(
          ([, name]) => name as string
        )
      )
    );
    const unread = [...delivered].filter(
      (name) =>
        !READ_ELSEWHERE.some((pattern) => pattern.test(name)) &&
        !new RegExp(`var\\(${name}[,)\\s]`).test(text)
    );

    expect(unread).toEqual([]);
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

  it('sinks a checked, mixed, or invalid box onto the pressed fill of its tone', () => {
    const rules = pressedRules();
    document.body.innerHTML = `
      <input type="checkbox" class="check" checked data-want="--accent-pressed">
      <input type="checkbox" class="check" data-mixed data-want="--accent-pressed">
      <input type="radio" class="check" checked data-want="--accent-pressed">
      <input type="checkbox" checked data-want="--accent-pressed">
      <input type="checkbox" class="check" checked data-tone="danger" data-want="--danger-pressed">
      <input type="checkbox" class="check" checked data-tone="warning" data-want="--warning-pressed">
      <input type="checkbox" class="check" checked aria-invalid="true" data-want="--danger-pressed">
      <input type="checkbox" class="check" checked aria-invalid="true" data-tone="warning"
        data-want="--danger-pressed">`;
    const mixed = document.querySelector('[data-mixed]') as HTMLInputElement;
    mixed.indeterminate = true;
    for (const box of document.querySelectorAll('input')) {
      const fills = rules
        .filter(({ selector }) => box.matches(selector))
        .map(({ rule }) => rule.style.getPropertyValue('background-color'))
        .filter((value) => value !== '');
      const label = box.outerHTML;

      // A press paints the held fill, last, through the box's own hook.
      expect(fills.at(-1), label).toBe('var(--check-on-pressed)');
      expect(declaredValues(box, '--check-on-pressed').at(-1), label).toBe(
        `var(${box.dataset.want})`
      );
    }
    document.body.innerHTML = '';
  });

  it('gives an invalid box the danger tone, on and off', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `
      <input type="checkbox" class="check" aria-invalid="true">
      <input type="checkbox" class="check" aria-invalid="true" checked>
      <input type="radio" class="check" aria-invalid="true" checked>`;
    for (const box of document.querySelectorAll('input')) {
      expect(declaredValues(box, '--check-on').at(-1), box.outerHTML).toBe('var(--danger)');
      expect(declaredValues(box, '--check-mark').at(-1), box.outerHTML).toBe('var(--on-danger)');
    }
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
      <button class="toggle-chip" aria-pressed="true">Wrap</button>
      <button class="toggle-chip toggle-chip-xs" aria-pressed="true">Trace</button>
      <button class="quiet-control" aria-pressed="true">Mode</button>
      <button class="quiet-track-item" aria-pressed="true">Log</button>
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
      <button class="pager-step">Next</button>
      <button class="toggle-chip" aria-pressed="false">Wrap</button>
      <button class="quiet-control">Stop</button>
      <button class="quiet-track-item">Log</button>
      <button class="disclosure" aria-expanded="false">More</button>
      <button class="disclosure" aria-expanded="true">Less</button>`;
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

  it('draws a strip action as a quiet control, never a link', () => {
    // A plain strip action takes the shared press (words in --text) with no
    // press rule of its own; a destructive one holds its danger words while
    // pressed. No strip action is ever underlined.
    const rules = pressedRules();
    document.body.innerHTML = `<div class="listing-root">
      <button class="pane-strip-link">All</button>
      <button class="pane-strip-link danger">Clear</button>
    </div>`;
    const [plain, danger] = [...document.querySelectorAll('button')];
    const own = (link: Element | undefined) =>
      rules
        .filter(({ rule }) =>
          rule.selectorText.split(',').some((part) => /^\s*\.pane-strip-link\b.*:active/.test(part))
        )
        .filter(({ selector }) => link?.matches(selector) === true)
        .map(({ rule }) => rule);

    expect(own(plain)).toHaveLength(0);
    expect(own(danger).at(-1)?.style.getPropertyValue('color')).toBe('var(--danger-text)');
    const sheet = readStylesheet('src/styles.css');
    for (const block of sheet.match(/[^{}]*\.pane-strip-link[^{}]*\{[^}]*\}/g) ?? []) {
      expect(block).not.toMatch(/text-decoration:\s*underline/);
    }
    document.body.innerHTML = '';
  });

  it("keeps a state row's own fill under an action the pointer is over or holds", () => {
    // Words on a state row are floored on the row's fill; a wash over it
    // would make a ground nothing is floored on.
    const rules = pressedRules();
    document.body.innerHTML = `<section class="listing-root">
      <div class="pane active"><div class="pane-list">
        <div class="row cursor"><button class="pane-act">Open</button></div>
        <div class="row marked"><button class="pane-icon-act worded">Stop</button></div>
      </div></div>
      <div class="pane"><div class="pane-list">
        <div class="row selected"><button class="pane-act">Open</button></div>
      </div></div>
      <div class="data-grid"><div class="data-grid-row marked">
        <button class="pane-icon-act worded">Edit</button></div></div>
    </section>`;
    for (const element of document.querySelectorAll('button')) {
      const grounds = rules
        .filter(
          ({ selector, rule }) =>
            rule.style.getPropertyValue('background') !== '' && element.matches(selector)
        )
        .map(({ rule }) => rule.style.getPropertyValue('background'));

      // Rules are read in source order here, not by weight: the row's rule
      // outweighs the shared recipes, whose class list weighs nothing.
      expect(grounds, element.closest('.row, .data-grid-row')?.className).toContain('transparent');
    }
    document.body.innerHTML = '';
  });

  it('draws an outlined toggle that is on with one ring, not its outline and a ring', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="listing-root">
      <button class="button button-neutral" aria-pressed="true">Wrap</button>
      <button class="icon-button" aria-label="Wrap" aria-pressed="true"></button>
      <button class="pane-strip-link" aria-pressed="true">All</button>
    </div>`;
    for (const element of document.querySelectorAll('button')) {
      expect(declaredValues(element, 'border-color').at(-1), element.className).toBe(
        'var(--current-ring)'
      );
      expect(getComputedStyle(element).boxShadow, element.className).toBe('none');
    }
    document.body.innerHTML = '';
  });

  it('draws a strip action as a small push button, apart from the column labels', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="listing-root">
      <button class="pane-strip-link">Update all</button>
      <button class="pane-strip-link danger">Clear</button>
    </div>`;
    const [plain, danger] = [...document.querySelectorAll('button')];

    expect(declaredValues(plain as Element, 'border').at(-1)).toMatch(/var\(--control-border\)/);
    expect(getComputedStyle(plain as Element).color).toBe('var(--text)');
    expect(declaredValues(danger as Element, 'border-color').at(-1)).toBe('var(--danger)');
    expect(getComputedStyle(danger as Element).color).toBe('var(--danger-text)');
    document.body.innerHTML = '';
  });

  it('sizes a 20px push button in a column strip from the strip, its ring inside', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="listing-root"><div class="pane-listing">
      <div class="pane-columns pane-strip"><span class="row-meta">
        <button class="pane-strip-link">Update all</button>
        <button class="button button-neutral button-xs">Clear</button>
      </span></div></div>
      <button class="pane-strip-link">Outside</button></div>`;
    const [strip, button, outside] = [...document.querySelectorAll('button')];
    const fromStrip = 'calc(var(--pane-columns-height) - var(--line) - 2 * var(--space-1))';

    // Outside the strip's control cell (which stretches it, below): the
    // strip less its rule and 2px at each end, 17px in a 22px strip.
    expect(declaredValues(strip as Element, 'height').at(-1)).toBe(fromStrip);
    expect(declaredValues(button as Element, 'height').at(-1)).toBe(fromStrip);
    expect(declaredValues(outside as Element, 'height').at(-1)).toBe('var(--control-height-xs)');
    // A strip after a listing holds its upper rule inside its height too.
    document.body.insertAdjacentHTML(
      'beforeend',
      `<div class="listing-root"><div class="pane-listing"></div><div class="pane-listing">
        <div class="pane-columns"><span class="row-meta"><button class="pane-strip-link">Clear</button></span></div>
      </div></div>`
    );
    expect(declaredValues(document.querySelectorAll('button')[3] as Element, 'height').at(-1)).toBe(
      'calc(var(--pane-columns-height) - 2 * var(--line) - 2 * var(--space-1))'
    );
    // Pinned at the top of a scroller that clips, so the ring is drawn inside.
    for (const element of [strip, button]) {
      (element as HTMLElement).focus();
      expect(declaredValues(element as Element, 'outline-offset')).toContain(
        'var(--focus-offset-inset)'
      );
    }
    (outside as HTMLElement).focus();
    expect(declaredValues(outside as Element, 'outline-offset')).not.toContain(
      'var(--focus-offset-inset)'
    );
    document.body.innerHTML = '';
  });

  it('tones a quiet busy ring by the row fill, not by the cursor', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<section class="listing-root">
      <div class="pane active"></div>
      <div class="pane"><div class="pane-list">
        <div class="row cursor"><span class="pane-state pane-tone-busy"><span class="pane-state-dot"></span></span></div>
        <div class="row selected"><span class="pane-state pane-tone-busy"><span class="pane-state-dot"></span></span></div>
        <div class="row marked cursor"><span class="pane-state pane-tone-busy"><span class="pane-state-dot"></span></span></div>
      </div></div></section>`;
    const [cursor, selected, marked] = [...document.querySelectorAll('.pane-state-dot')];
    const onSurface = 'inset 0 0 0 var(--line-strong) var(--text-on-surface)';

    // A quiet cursor has a frame and no fill: its ring keeps the accent on the list.
    expect(declaredValues(cursor as Element, 'box-shadow').at(-1)).toBe(
      'inset 0 0 0 var(--line-strong) var(--accent)'
    );
    // A quiet selection and a quiet mark wear the neutral fill.
    expect(declaredValues(selected as Element, 'box-shadow').at(-1)).toBe(onSurface);
    expect(declaredValues(marked as Element, 'box-shadow').at(-1)).toBe(onSurface);
    document.body.innerHTML = '';
  });

  it('says an open disclosure is open by its chevron alone, so it answers the pointer', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<button class="disclosure" aria-expanded="true">Less</button>`;
    const open = document.querySelector('button') as HTMLButtonElement;

    // At rest an open disclosure keeps the dim words a closed one has.
    expect(getComputedStyle(open).color).toBe('var(--text-dim)');
    const hover = readStylesheet('src/button/button.css').match(
      /\.disclosure:is\(([^)]*)\):not\(:disabled\) \{\s*color: var\(--text\);/
    );
    expect(hover?.[1]).toBe(':hover, :focus-visible');
    document.body.innerHTML = '';
  });

  it("keeps a strip's control 2px clear of the strip's rules, never filling the strip", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="listing-root"><div class="pane-listing">
      <div class="pane-columns pane-strip"><span class="row-meta pane-col-control">
        <button class="pane-strip-link">Update all</button></span></div></div></div>`;
    const cell = document.querySelector('.pane-col-control') as Element;

    expect(declaredValues(cell, 'padding-block').at(-1)).toBe('var(--space-1)');
    expect(declaredValues(cell, 'align-items').at(-1)).toBe('stretch');
    expect(declaredValues(document.querySelector('button') as Element, 'height').at(-1)).toBe(
      'auto'
    );
    document.body.innerHTML = '';
  });

  it("leaves a strip's control cell around a label as tall as a plain label's", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="listing-root"><div class="pane-listing">
      <div class="pane-columns pane-strip"><span class="row-meta pane-col-control">
        <button class="pane-sort">Traffic</button></span></div></div></div>`;
    const cell = document.querySelector('.pane-col-control') as Element;

    expect(declaredValues(cell, 'padding-block')).not.toContain('var(--space-1)');
    expect(declaredValues(cell, 'align-items').at(-1)).toBe('center');
    document.body.innerHTML = '';
  });

  it('draws the 20px Button and the strip action from the same values', () => {
    const block = (sheet: string, selector: string): string =>
      new RegExp(`^${selector.replace('.', '\\.')} \\{([^}]*)\\}`, 'm').exec(
        readStylesheet(sheet)
      )?.[1] ?? '';
    const button = block('src/button/button.css', '.button-xs');
    const strip = block('src/listing/listing.css', '.pane-strip-link');

    for (const declaration of [
      'position: relative;',
      'gap: var(--space-2);',
      'height: var(--control-height-xs);',
      'padding: 0 var(--space-3);',
      'border-radius: var(--radius-sm);'
    ]) {
      expect(button).toContain(declaration);
      expect(strip).toContain(declaration);
    }
    expect(button).toContain('font-size: var(--font-size-caption);');
    expect(button).toContain('font-weight: var(--font-weight-medium);');
    expect(strip).toMatch(/font: var\(--font-weight-medium\) var\(--font-size-caption\)/);
  });

  it('keeps the open face for a control that holds a pop-up open, not for an open fold', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="listing-root">
      <button class="pane-strip-link" aria-expanded="true">Fold</button>
      <button class="quiet-track-item" aria-expanded="true">Section</button>
      <button class="pane-strip-link" aria-expanded="true" aria-haspopup="menu">More</button>
      <button class="quiet-track-item" aria-expanded="true" aria-haspopup="listbox">Group</button>
      <button class="crumb-label" aria-expanded="true">site</button>
    </div>`;
    const [fold, section, menu, listbox, crumb] = [...document.querySelectorAll('button')];

    // A crumb only ever opens its menu, so an expanded one keeps the face.
    expect(declaredValues(crumb as Element, 'background')).toContain('var(--hover-wash)');

    expect(declaredValues(fold as Element, 'background')).not.toContain('var(--hover-wash)');
    expect(declaredValues(section as Element, 'background')).not.toContain('var(--hover-wash)');
    expect(declaredValues(menu as Element, 'background')).toContain('var(--hover-wash)');
    expect(declaredValues(listbox as Element, 'background')).toContain('var(--hover-wash)');
    document.body.innerHTML = '';
  });

  it("keeps a state row's fill under every control the shared recipes wash", () => {
    // The class list of the press recipe (the widest of the three) is read
    // from the base sheet, so a class added to a recipe must be added to the
    // listing's and the grid's state-row rules too.
    const classList = (selector: string): string[] =>
      selector
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
        .sort();
    const recipe = /:where\(([^()]*)\):where\(button, a\[href\][^{]*\):active \{/.exec(
      readStylesheet('src/styles.css')
    )?.[1];
    expect(recipe).toBeDefined();
    for (const sheet of ['src/listing/listing.css', 'src/grid/grid.css']) {
      const own =
        /:is\(([^()]*)\):is\(\s*:hover,\s*:active,[^{]*\):enabled \{\s*background: transparent;/.exec(
          readStylesheet(sheet)
        )?.[1];
      expect(own, sheet).toBeDefined();
      expect(classList(own ?? ''), sheet).toEqual(classList(recipe ?? ''));
    }

    const rules = pressedRules();
    document.body.innerHTML = `<section class="listing-root">
      <div class="pane active"><div class="pane-list">
        <div class="row cursor"><button class="quiet-control">users</button></div>
        <div class="row marked"><button class="toggle-chip" aria-pressed="false">Trace</button></div>
      </div></div>
      <div class="data-grid"><div class="data-grid-row marked">
        <button class="quiet-control">42</button></div></div>
    </section>`;
    for (const element of document.querySelectorAll('button')) {
      const grounds = rules
        .filter(
          ({ selector, rule }) =>
            rule.style.getPropertyValue('background') !== '' && element.matches(selector)
        )
        .map(({ rule }) => rule.style.getPropertyValue('background'));

      expect(grounds, element.className).toContain('transparent');
    }
    document.body.innerHTML = '';
  });

  it('lets a host control join the quiet looks by class, the press with its hairline', () => {
    const rules = pressedRules();
    document.body.innerHTML = `
      <button class="quiet-control">Stop</button>
      <button class="toggle-chip" aria-pressed="false">Wrap</button>
      <button class="quiet-track-item">Log</button>`;
    const declared = (element: Element, property: string): string[] =>
      rules
        .filter(({ selector }) => element.matches(selector))
        .map(({ rule }) => rule.style.getPropertyValue(property))
        .filter((value) => value !== '');
    const [control, chip, item] = [...document.querySelectorAll('button')];

    for (const element of [control, chip, item]) {
      expect(declared(element as Element, 'box-shadow').at(-1)).toBe('var(--press-frost)');
      expect(declared(element as Element, 'background')).toContain('var(--hover-wash)');
    }
    // The frosted ring is the quiet control's and the chip's, not a track item's.
    expect(declared(control as Element, 'box-shadow')).toContain('var(--hover-frost)');
    expect(declared(chip as Element, 'box-shadow')).toContain('var(--hover-frost)');
    expect(declared(item as Element, 'box-shadow')).not.toContain('var(--hover-frost)');
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
