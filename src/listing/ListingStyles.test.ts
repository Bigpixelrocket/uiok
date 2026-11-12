/**
 * The listing look's contract: its metrics, the size of the frame's compact
 * controls, a focus ring that sits inside them and outweighs a host's own,
 * and no highlight on a disabled one. jsdom lays nothing out, so these read
 * what the rules set.
 */

import { describe, expect, it, onTestFinished } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';

const sheet = readStylesheet('src/listing/listing.css');
const styles = readStylesheet('src/styles.css');

/** A pane in the listing look: path bar, column strip, one row, status line. */
const listingPane = `
  <div class="pane active">
    <div class="pane-path-row"><div class="pane-crumbs">
      <span class="crumb here"><span class="crumb-label">here</span></span>
    </div></div>
    <div class="pane-list">
      <div class="pane-columns"><span class="row-name"><span class="pane-sort">
        <span class="pane-sort-label">Name</span>
      </span></span></div>
      <div class="row"><span class="row-icon"></span><span class="row-name">name</span></div>
    </div>
    <footer class="pane-status"><span class="pane-summary">1 item</span></footer>
  </div>`;

/** The metrics a piece of the listing look must keep wherever it is drawn. */
const METRICS = {
  '.pane-path-row': ['flex-basis', 'border-bottom-width'],
  '.pane-columns': ['height', 'position', 'grid-template-columns', 'border-bottom-width'],
  '.row': ['height', 'grid-template-columns', 'padding-left', 'padding-right'],
  '.row-name': ['white-space', 'text-overflow'],
  '.pane-list': ['font-family', 'font-size', 'overflow-y'],
  '.pane-status': ['height', 'font-family', 'font-size', 'border-top-width', 'padding-left']
} as const;

const measured = (root: Element): Record<string, string[]> =>
  Object.fromEntries(
    Object.entries(METRICS).map(([selector, properties]) => {
      const style = getComputedStyle(root.querySelector(selector) as Element);

      return [selector, properties.map((property) => style.getPropertyValue(property))];
    })
  );

/** A path bar's compact verb and a status line's icon control, as an app draws them. */
const paneControls = `
  <div class="pane">
    <div class="pane-path-row"><div class="pane-crumbs"></div>
      <div class="path-tools"><button class="pane-act lit" type="button">Start</button></div>
    </div>
    <footer class="pane-status"><span class="pane-summary">~/a</span>
      <span class="pane-status-tools"><button class="pane-icon-act" type="button"></button></span>
    </footer>
  </div>`;

describe('the listing look', () => {
  it('is declared under the listing scope with its metrics', () => {
    expect(sheet).toMatch(/:where\(\.listing-root\) \.row\s*\{[^}]*height:\s*var\(--row-height\);/);
    expect(sheet).toMatch(
      /\.listing-root\s*\{[^}]*--pane-columns-height:\s*var\(--row-height-dense\);/
    );
    expect(sheet).toMatch(/\.listing-root\s*\{[^}]*--pane-path-height:\s*var\(--bar-height\);/);
    expect(sheet).toMatch(
      /:where\(\.listing-root\) \.pane-status\s*\{[^}]*height:\s*var\(--bar-height\);/
    );
  });

  it('draws a pane with the base metrics, which an app class beside the scope keeps', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `
      <section class="listing-root" id="plain">${listingPane}</section>
      <section class="my-view listing-root" id="app">${listingPane}</section>`;

    const plain = measured(document.getElementById('plain') as Element);

    expect(measured(document.getElementById('app') as Element)).toEqual(plain);
    // jsdom resolves no var(), so a metric reads as the token it is drawn from.
    expect(plain['.row']?.[0]).toBe('var(--row-height)');
    expect(plain['.pane-status']?.[0]).toBe('var(--bar-height)');
    expect(plain['.pane-list']?.[1]).toBe('var(--font-size-body)');
    document.body.innerHTML = '';
  });

  it('lets an app adjust a piece with one scoped rule, whatever order the sheets load in', () => {
    applyStylesheets('.my-view .row { height: 28px; }', styles);
    document.body.innerHTML = `<section class="my-view listing-root">${listingPane}</section>`;

    expect(getComputedStyle(document.querySelector('.row') as Element).height).toBe('28px');
    document.body.innerHTML = '';
  });

  it('holds a busy mark still: its heavy ring says it, with no pulse', () => {
    expect(sheet).toMatch(
      /:where\(\.listing-root\) \.pane-tone-busy > \.pane-state-dot\s*\{[^}]*var\(--line-strong\)/
    );
    expect(sheet).not.toMatch(/uiok-pulse/);
    expect(sheet).not.toMatch(/\.pane-state-dot\s*\{[^}]*animation/);
  });
});

describe("the frame's compact controls", () => {
  it('measure the same wherever they are drawn', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">${paneControls}</section>`;

    const act = getComputedStyle(document.querySelector('.pane-act') as Element);
    const icon = getComputedStyle(document.querySelector('.pane-icon-act') as Element);

    // jsdom resolves no var(), so a metric reads as the token it is drawn from.
    expect([
      act.getPropertyValue('height'),
      icon.getPropertyValue('width'),
      icon.getPropertyValue('height')
    ]).toEqual([
      'var(--control-height-xs)',
      'var(--control-height-xs)',
      'var(--control-height-xs)'
    ]);
    // jsdom drops a padding shorthand that holds var(), so read the rule.
    expect(sheet).toMatch(/^\.pane-act \{[^}]*padding: 0 var\(--space-3\) 0 var\(--space-2\);/m);
    document.body.innerHTML = '';
  });

  it("keep their ring on their edge, and yield to a host's own ring", () => {
    // The ring is the base sheet's (no weight); the compact-control rule
    // only moves it onto the edge, so a host's own rule decides.
    expect(sheet).toMatch(
      /^:is\(\.crumb-label, \.path-star, \.pane-act, \.pane-icon-act\):focus-visible \{[^}]*outline-offset: var\(--focus-offset-flush\);/m
    );

    applyStylesheets(
      '.my-view button:focus-visible { outline: 2px solid var(--accent); outline-offset: 1px; }',
      styles
    );
    document.body.innerHTML = `<section class="my-view listing-root">${paneControls}</section>`;
    const act = document.querySelector('.pane-act') as HTMLButtonElement;

    act.focus();
    expect(getComputedStyle(act).outlineOffset).toBe('1px');
    document.body.innerHTML = '';
  });

  it('light no disabled control on hover', () => {
    applyStylesheets(styles);
    const pointerRules = [...document.styleSheets]
      .flatMap((sheet) => [...sheet.cssRules])
      .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule)
      .map((rule) => rule.selectorText)
      .filter((selector) => /:hover\b/.test(selector.replace(/:not\([^()]*\)/g, '')))
      // Hover stands as a match-anything test, so a selector that lists it
      // with other states (`:is(:hover, :active)`) stays valid.
      .map((selector) => selector.replace(/:hover\b/g, ':where(*)'));
    const lit = (disabled: boolean): string[] => {
      document.body.innerHTML = `<fieldset${disabled ? ' disabled' : ''} class="listing-root">
        <button class="pane-act">Start</button>
        <button class="pane-icon-act" aria-label="Reveal"></button>
        <button class="pane-icon-act worded">Drop</button>
        <button class="path-star" aria-label="Refresh"></button>
        <button class="pane-strip-link">Update all</button>
      </fieldset>`;
      const matched = [...document.querySelectorAll('fieldset button')].flatMap((element) =>
        pointerRules.filter((selector) => element.matches(selector))
      );
      document.body.innerHTML = '';
      return matched;
    };

    expect(lit(false).length).toBeGreaterThan(0);
    expect(lit(true)).toEqual([]);
  });

  it('keep a row’s secondary icons in view on every row, never appearing on hover', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">
      <div class="row"><span class="row-meta pane-hover-cell"><button class="pane-icon-act"></button></span></div>
      <div class="row cursor"><span class="row-meta pane-hover-cell"><button class="pane-icon-act"></button></span></div>
    </section>`;
    const [rest, cursor] = [...document.querySelectorAll('.pane-icon-act')] as Element[];

    expect(declaredValues(rest as Element, 'opacity')).toEqual([]);
    expect(declaredValues(cursor as Element, 'opacity')).toEqual([]);
    expect(getComputedStyle(rest as Element).getPropertyValue('color')).toBe('var(--text-dim)');
    document.body.innerHTML = '';
  });
});

describe('the listing states', () => {
  const colour = (element: Element | null): string =>
    getComputedStyle(element as Element).getPropertyValue('color');

  it('sets every quiet word on a cursor or marked row in the on-surface tone', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">
      <div class="row cursor" id="cursor"><span class="row-icon"></span><span class="row-name">a</span>
        <span class="row-meta"><span class="pane-state pane-tone-muted">idle</span></span>
        <span class="row-meta"><span class="pane-state pane-tone-busy">saving</span></span>
      </div>
      <div class="row marked" id="marked"><span class="row-icon"></span><span class="row-name">b</span>
        <span class="row-meta"><span class="pane-state pane-tone-muted">idle</span></span>
      </div>
      <div class="row" id="rest"><span class="row-icon"></span><span class="row-name">c</span>
        <span class="row-meta"><span class="pane-state pane-tone-muted">idle</span></span>
      </div>
    </section>`;

    for (const id of ['cursor', 'marked']) {
      for (const word of document.querySelectorAll(`#${id} :is(.row-meta, .pane-state)`)) {
        expect(colour(word)).toBe('var(--text-on-surface)');
      }
    }
    expect(colour(document.querySelector('#rest .pane-state'))).toBe('var(--row-meta-text)');
    document.body.innerHTML = '';
  });

  it('lights the row actions in full words, never the accent, only on the cursor row of the pane that holds the keys', () => {
    applyStylesheets(styles);
    const pane = (active: boolean): string => `<div class="pane${active ? ' active' : ''}">
      <div class="row cursor"><span class="row-meta">
        <button class="pane-act" type="button">Stop</button>
        <button class="pane-icon-act danger" type="button"></button>
      </span></div></div>`;
    document.body.innerHTML = `<section class="listing-root">${pane(true)}${pane(false)}</section>`;
    const [lit, danger, quiet, quietDanger] = document.querySelectorAll('button');

    expect(colour(lit as Element)).toBe('var(--text)');
    expect(colour(danger as Element)).toBe('var(--danger-text)');
    expect(colour(quiet as Element)).toBe('var(--text-on-surface)');
    expect(colour(quietDanger as Element)).toBe('var(--text-on-surface)');
    document.body.innerHTML = '';
  });

  it('keeps a worded action on a marked row in the on-surface tone, a lit one lit', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">
      <div class="row marked"><span class="row-meta">
        <button class="pane-icon-act worded" type="button">Drop</button>
        <button class="pane-act" type="button">Open</button>
        <button class="pane-act lit" type="button">Start</button>
      </span></div></section>`;
    const [worded, quiet, lit] = document.querySelectorAll('button');

    expect(colour(worded as Element)).toBe('var(--text-on-surface)');
    expect(colour(quiet as Element)).toBe('var(--text-on-surface)');
    expect(colour(lit as Element)).toBe('var(--text)');
    document.body.innerHTML = '';
  });

  it('draws a worded action on every state row in a tone floored on its fill', () => {
    // `:hover` reads as a class, so the hovered row matches as it would
    // under the pointer, and the action itself is not hovered.
    applyStylesheets(styles.replaceAll(':hover', '.is-hovered'));
    const row = (classes: string): string =>
      `<div class="row ${classes}"><span class="row-meta">
        <button class="pane-icon-act worded" type="button">Edit</button>
      </span></div>`;
    document.body.innerHTML = `<section class="listing-root">
      <div class="pane active"><div class="pane-list pointer">
        ${row('cursor')}${row('marked cursor')}${row('marked')}${row('is-hovered')}${row('')}
      </div></div>
      <div class="pane"><div class="pane-list">${row('cursor')}</div></div>
    </section>`;
    const tones = [...document.querySelectorAll('button')].map((button) => colour(button));

    expect(tones).toEqual([
      'var(--text)',
      'var(--text)',
      'var(--text-on-surface)',
      'var(--text-on-surface)',
      'var(--text-dim)',
      'var(--text-on-surface)'
    ]);
    document.body.innerHTML = '';
  });

  it("draws a state row's bar on its edge, not as an inset shadow that scrolls away", () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">
      <div class="pane active"><div class="pane-list">
        <div class="row cursor"></div><div class="row marked"></div>
        <div class="row marked cursor"></div><div class="row selected cursor"></div>
      </div></div>
      <div class="pane"><div class="pane-list"><div class="row cursor"></div></div></div>
    </section>`;
    const rows = [...document.querySelectorAll('.row')];
    const value = (row: Element, name: string): string =>
      getComputedStyle(row).getPropertyValue(name).trim();

    expect(rows.map((row) => value(row, '--row-bar'))).toEqual([
      'var(--cursor-bar)',
      'var(--marked-bar)',
      'var(--cursor-bar)',
      'var(--on-selected)',
      'transparent'
    ]);
    for (const row of rows) {
      expect(value(row, 'box-shadow')).not.toMatch(/var\(--line-strong\)/);
    }
    // The marked cursor row's ring, which its pinned cell repeats.
    expect(value(rows[2] as Element, '--pane-pin-ring')).toMatch(/var\(--cursor-bar\)/);
    document.body.innerHTML = '';
  });

  it('lets no cursor, mark, or pointer rule recolour a word on a selected row', () => {
    // Every element is hovered: `:hover` reads as a class each one carries,
    // so a hover rule weighs what it does and matches as it would under the
    // pointer, the excluding ones (`:not(:hover)`) included.
    applyStylesheets(styles.replaceAll(':hover', '.is-hovered'));
    const words = `<span class="row-icon"></span><span class="row-name">a</span>
      <span class="row-meta">2 MB</span>
      <span class="row-meta"><span class="pane-state pane-tone-muted"><span class="pane-state-dot"></span><span class="pane-state-word">stopped</span></span></span>
      <span class="row-meta"><span class="pane-state pane-tone-busy"><span class="pane-state-dot"></span><span class="pane-state-word">restarting</span></span></span>
      <span class="row-meta pane-path"><span class="pane-path-head">~/a/</span><span class="pane-path-tail">b/</span><span class="pane-path-name">c</span></span>
      <span class="row-meta pane-action-cell">
        <button class="pane-act" type="button">Open</button>
        <button class="pane-act lit" type="button">Start</button>
        <button class="pane-act danger" type="button">Remove</button>
        <button class="pane-icon-act worded" type="button">Drop</button>
        <button class="pane-icon-act danger" type="button"></button>
      </span>`;
    const rows = ['cursor selected', 'marked selected', 'marked cursor selected', 'selected']
      .map((states) => `<div class="row pane-add ${states}">${words}</div>`)
      .join('');
    // A lone pane, and the pane that holds the keys beside another: both
    // selections hold the keys (a pane that does not greys its own, below).
    document.body.innerHTML = `<section class="listing-root">
      <div class="pane"><div class="pane-list pointer">${rows}</div></div>
    </section><section class="listing-root">
      <div class="pane active"><div class="pane-list pointer">${rows}</div></div><div class="pane"></div>
    </section>`;
    for (const element of document.body.querySelectorAll('*')) element.classList.add('is-hovered');

    const dim = '.row-meta:not(.pane-path, .pane-action-cell), .pane-path-head, .pane-path-tail';
    const full =
      '.row-icon, .row-name, .pane-path-name, .pane-state-word, button, .row-meta > .pane-state';

    for (const element of document.querySelectorAll(dim)) {
      expect(colour(element)).toBe('var(--on-selected-dim)');
    }
    for (const element of document.querySelectorAll(full)) {
      expect([element.className, colour(element)]).toEqual([
        element.className,
        expect.stringMatching(/^(var\(--on-selected\)|)$/)
      ]);
      // A word that sets no colour of its own inherits its cell's.
      if (colour(element) === '') {
        expect(colour(element.closest('.pane-state, .row'))).toBe('var(--on-selected)');
      }
    }
  });

  it('rings the quiet and busy marks and the busy spinner in the selection tone', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">
      <div class="row selected"><span class="row-meta">
        <span class="pane-state pane-tone-muted"><span class="pane-state-dot" id="muted"></span></span>
        <span class="pane-state pane-tone-busy"><span class="pane-state-dot" id="busy"></span></span>
        <span class="pane-state pane-tone-busy"><svg class="pane-state-busy" id="spinner"></svg></span>
        <span class="pane-state pane-tone-ready"><span class="pane-state-dot" id="ready"></span></span>
      </span></div>
      <div class="row selected cursor"><span class="row-meta">
        <span class="pane-state pane-tone-busy"><span class="pane-state-dot" id="busy-cursor"></span></span>
      </span></div></section>`;
    const shadow = (id: string): string =>
      getComputedStyle(document.getElementById(id) as Element).getPropertyValue('box-shadow');

    expect(shadow('muted')).toBe('inset 0 0 0 var(--line) var(--on-selected)');
    expect(shadow('busy')).toBe('inset 0 0 0 var(--line-strong) var(--on-selected)');
    expect(shadow('busy-cursor')).toBe('inset 0 0 0 var(--line-strong) var(--on-selected)');
    // A filled mark keeps its outer hairline.
    expect(shadow('ready')).toBe('0 0 0 var(--line) var(--on-selected)');
    expect(colour(document.getElementById('spinner'))).toBe('var(--on-selected)');
    document.body.innerHTML = '';
  });

  it('greys a selection in a pane that does not hold the keys and in a window not in front', () => {
    applyStylesheets(styles);
    const words = `<span class="row-icon"></span><span class="row-name">a</span>
      <span class="row-meta">2 MB</span>
      <span class="row-meta"><span class="pane-state pane-tone-ready"><span class="pane-state-dot"></span>up</span></span>
      <span class="row-meta pane-action-cell"><button class="pane-act lit" type="button">Start</button></span>`;
    const pane = (active: boolean): string =>
      `<div class="pane${active ? ' active' : ''}"><div class="pane-list">
        <div class="row selected">${words}</div><div class="row selected cursor">${words}</div>
      </div></div>`;
    const read = (): Record<string, string>[] =>
      [...document.querySelectorAll('.row')].map((row) => ({
        fill: getComputedStyle(row).getPropertyValue('--row-fill').trim(),
        bar: getComputedStyle(row).getPropertyValue('--row-bar').trim(),
        name: colour(row),
        meta: colour(row.querySelector('.row-meta')),
        state: colour(row.querySelector('.pane-state')),
        action: colour(row.querySelector('button'))
      }));
    const held = {
      fill: 'var(--selected-bg)',
      name: 'var(--on-selected)',
      meta: 'var(--on-selected-dim)',
      state: 'var(--on-selected)',
      action: 'var(--on-selected)'
    };
    const grey = {
      fill: 'var(--fill)',
      name: 'var(--text)',
      meta: 'var(--text-on-surface)',
      state: 'var(--success-text)',
      action: 'var(--text-on-surface)'
    };

    document.body.innerHTML = `<section class="listing-root">${pane(true)}${pane(false)}</section>`;
    const [active, activeCursor, other, otherCursor] = read();
    expect(active).toEqual({ ...held, bar: '' });
    expect(activeCursor).toEqual({
      ...held,
      fill: 'var(--selected-cursor-bg)',
      bar: 'var(--on-selected)'
    });
    expect(other).toEqual({ ...grey, bar: '' });
    expect(otherCursor).toEqual({ ...grey, bar: 'transparent' });

    document.documentElement.setAttribute('data-window-inactive', '');
    onTestFinished(() => document.documentElement.removeAttribute('data-window-inactive'));
    const [front, frontCursor] = read();
    expect(front).toEqual({ ...grey, bar: '' });
    expect(frontCursor).toEqual({ ...grey, bar: 'transparent' });
    expect(sheet).toMatch(
      /:where\(:root\[data-window-inactive\] \.listing-root\) \.pane\.active::before\s*\{\s*border-color: var\(--border-strong\);/
    );
    document.body.innerHTML = '';
  });

  it('quiets every row mark where the keys are not: the cursor, a mark, a checked box, a selection', () => {
    applyStylesheets(styles);
    const row = (classes: string): string =>
      `<div class="row ${classes}"><input class="check" type="checkbox" checked>
        <span class="row-name">a</span><span class="row-meta">2 MB</span></div>`;
    const pane = (active: boolean): string =>
      `<div class="pane${active ? ' active' : ''}"><div class="pane-list">
        ${row('cursor')}${row('marked')}${row('marked cursor')}${row('selected')}
      </div></div>`;
    const read = (scope: Element): Record<string, string>[] =>
      [...scope.querySelectorAll('.row')].map((element) => {
        const style = getComputedStyle(element);
        const check = getComputedStyle(element.querySelector('input') as Element);
        return {
          fill: style.getPropertyValue('--row-fill').trim(),
          bar: style.getPropertyValue('--row-bar').trim(),
          shadow: style.boxShadow,
          meta: colour(element.querySelector('.row-meta')),
          checkOn: check.getPropertyValue('--check-on').trim(),
          checkMark: check.getPropertyValue('--check-mark').trim(),
          words: style.getPropertyValue('--row-selected-text').trim()
        };
      });
    const quietCheck = { checkOn: 'var(--control-border-strong)', checkMark: 'var(--fill)' };
    const quiet = [
      { fill: 'var(--fill)', bar: 'transparent', words: '' },
      { fill: 'var(--fill)', bar: 'var(--control-border-strong)', words: '' },
      { fill: 'var(--fill)', bar: 'var(--control-border-strong)', words: '' },
      { fill: 'var(--fill)', bar: '', words: 'var(--text)' }
    ];
    const expectQuiet = (rows: Record<string, string>[]) =>
      rows.forEach((found, index) => {
        expect(found).toMatchObject({ ...quiet[index], ...quietCheck });
        expect(found.shadow).toMatch(/^(none)?$/);
      });

    document.body.innerHTML = `<section class="listing-root">${pane(true)}${pane(false)}</section>`;
    const [held, beside] = [...document.querySelectorAll('.pane')];
    const heldRows = read(held as Element);
    expect(heldRows.map(({ fill }) => fill)).toEqual([
      'var(--cursor-row)',
      'var(--marked-bg)',
      'var(--marked-cursor-bg)',
      'var(--selected-bg)'
    ]);
    expect(heldRows[3]?.words).toBe('var(--on-selected)');
    expect(heldRows.every(({ checkOn }) => checkOn === 'var(--accent)')).toBe(true);
    expectQuiet(read(beside as Element));

    document.documentElement.setAttribute('data-window-inactive', '');
    onTestFinished(() => document.documentElement.removeAttribute('data-window-inactive'));
    expectQuiet(read(held as Element));
    document.body.innerHTML = '';
  });

  it('selects rows, not text, while its messages, summary, and output stay selectable', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root selectable"><div class="pane">
      <div class="pane-list"><div class="pane-listing" role="table">
        <div class="row cursor selected"><span class="row-icon"></span>
          <span class="row-name">app.ts</span><span class="row-meta">2 KB</span>
          <span class="row-meta pane-path"><span class="pane-path-name"><code>src</code></span></span>
          <span class="row-meta"><input class="field-xs" type="text" value="rename"></span>
        </div>
        <p class="pane-message empty">Nothing here.</p>
      </div></div>
      <pre class="pane-well">output</pre>
      <div class="pane-status"><span class="pane-summary">1 file</span></div>
    </div></section>`;
    const select = (selector: string): string =>
      getComputedStyle(document.querySelector(selector) as Element).getPropertyValue('user-select');

    for (const selector of ['.row', '.row-name', '.row-meta', '.pane-path-name', 'code']) {
      expect(select(selector), selector).toBe('none');
    }
    for (const selector of ['input', '.pane-message', '.pane-well', '.pane-summary']) {
      expect(select(selector), selector).toBe('text');
    }
    document.body.innerHTML = '';
  });

  it('stretches the pinned action cells and squares the strip cell over them', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">
      <div class="pane-listing pane-pin-end" role="table">
        <div class="pane-columns pane-strip"><span class="row-name"></span><span class="row-meta pane-col-blank"></span></div>
        <div class="row"><span class="row-name">a</span><span class="row-meta pane-action-cell"></span></div>
      </div></section>`;
    const [strip, cell] = [...document.querySelectorAll('.row-meta')].map((element) =>
      getComputedStyle(element)
    );

    expect([strip?.alignSelf, cell?.alignSelf]).toEqual(['stretch', 'stretch']);
    expect([strip?.position, cell?.position]).toEqual(['sticky', 'sticky']);
    expect(strip?.borderRadius).toBe('0px');
    document.body.innerHTML = '';
  });

  it('ends the pinned cells with their rows, past a self-scrolling listing’s padding', () => {
    // A sticky box stops at its scroller's padding; a listing that scrolls
    // itself pads its end by the row inset, so the cells reach back over it
    // (a marked cursor row's ring would otherwise show its end twice). Only
    // a list around the listing that scrolls sideways holds them at 0.
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root"><div class="pane-list">
      <div class="pane-listing pane-pin-end" role="table">
        <div class="row marked cursor"><span class="row-name">a</span><span class="row-meta pane-action-cell"></span></div>
      </div></div></section>`;
    const cell = getComputedStyle(document.querySelector('.row-meta') as Element);

    expect(cell.getPropertyValue('inset-inline-end').trim()).toBe(
      'calc(-1 * var(--pane-row-inset))'
    );
    expect(sheet).toMatch(
      /@container uiok-pane-pin-list scroll-state\(scrollable: inline\) \{\n\s*:where\(\.listing-root \.pane-listing\.pane-pin-end\) > :is\(\.row, \.pane-columns\) > :last-child \{\n\s*inset-inline-end: 0;/
    );
    expect(declaredValues(document.querySelector('.pane-list') as Element, 'container')).toEqual([
      'uiok-pane-pin-list / scroll-state'
    ]);
    document.body.innerHTML = '';
  });

  it('gives way in a narrow path bar in one order: the trail to its floor, the tools to their least, then the trail', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root"><div class="pane-path-row" style="--pane-crumb-count: 3">
      <div class="pane-crumbs"><span class="crumb"><span class="crumb-label">a</span></span>
        <span class="crumb-separator">/</span>
        <span class="crumb here"><span class="crumb-label">b</span><span class="current-dot"></span></span></div>
      <div class="path-tools"><span class="path-facts"><span class="path-fact-text">Stopped</span></span></div>
    </div></section>`;
    const style = (selector: string) =>
      getComputedStyle(document.querySelector(selector) as Element);

    // The trail gives way first and past its floor; it scrolls, so nothing
    // it holds is drawn under the tools.
    expect(style('.pane-crumbs').flexShrink).toBe('1000000');
    expect(style('.pane-crumbs').minWidth).toMatch(/^0(px)?$/);
    expect([style('.pane-crumbs').overflowX, style('.pane-crumbs').overflowY]).toEqual([
      'auto',
      'hidden'
    ]);
    // The tools take no more than the row less the trail's floor, and no
    // less than they need at their least, which wins.
    expect(style('.path-tools').maxWidth).toBe('calc(100% - var(--pane-crumb-room))');
    expect(style('.path-tools').minWidth).toBe('calc-size(min-content, min(size, 100%))');
    expect(style('.pane-path-row').getPropertyValue('--pane-crumb-room')).toContain(
      'var(--pane-crumb-here-room,9ch)'
    );
    expect(sheet).toMatch(
      /@property --pane-crumb-count \{\n\s*syntax: '<integer>';\n\s*inherits: true;/
    );
    // The last crumb keeps a stem of eight characters, and goes below it
    // only to what its trail holds, less a leading slash.
    expect(style('.crumb.here').minWidth).toContain(
      'min(10ch + var(--space-4) + var(--dot) + var(--space-2), 100% - 1ch - var(--space-1))'
    );
    // A trail pinned at rest gives the tools what it leaves.
    document.querySelector('.pane-crumbs')?.setAttribute('data-cramped', 'pinned');
    expect([style('.pane-crumbs').flexGrow, style('.pane-crumbs').width]).toEqual([
      '0',
      'var(--pane-crumb-fit)'
    ]);
    expect(style('.path-tools').maxWidth).toBe('none');
    // A crumb's open menu sits inside the trail; the trail clips nothing then.
    document.querySelector('.crumb-label')?.setAttribute('aria-expanded', 'true');
    expect(style('.pane-crumbs').overflowX).not.toBe('auto');
    document.body.innerHTML = '';
  });

  it('cuts a fact’s words in one clamped line in every form the bar can cut, its mark one gap away', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root"><div class="pane-path-row"><div class="path-tools">
      <span class="path-facts" id="pathfact"><span class="pane-state"><span class="pane-state-dot"></span><span class="pane-state-word"></span></span><span class="path-fact-text">Stopped</span></span>
      <span class="path-facts" id="bare">Stopped</span>
      <span class="path-facts" id="hostspan"><span class="host-dot"></span>Stopped</span>
      <span class="path-facts" id="boxes"><a href="#x">localhost:5173</a><span class="chip">8.3</span></span>
    </div></div></section>`;
    const style = (selector: string) =>
      getComputedStyle(document.querySelector(selector) as Element);

    for (const selector of ['#pathfact .path-fact-text', '#bare', '#hostspan']) {
      expect([
        style(selector).display,
        style(selector).overflow,
        style(selector).wordBreak,
        style(selector).whiteSpace
      ]).toEqual(['-webkit-box', 'hidden', 'break-all', 'normal']);
      expect(style(selector).getPropertyValue('-webkit-line-clamp')).toBe('1');
    }
    // The floors: a character and its ellipsis, after a mark and its gap.
    expect(style('#bare').minWidth).toContain('min(size, 2ch + var(--line))');
    expect(style('#hostspan').minWidth).toContain(
      'var(--dot) + var(--space-3) + 2ch + var(--line)'
    );
    // A host's own mark keeps its size in the line and stands a gap from the words.
    expect([
      style('#hostspan .host-dot').display,
      style('#hostspan .host-dot').marginInlineEnd
    ]).toEqual(['inline-block', 'var(--space-3)']);
    // A mark with no word carries no gap of its own.
    expect(style('#pathfact .pane-state-word').display).toBe('none');
    // A fact of a host's own boxes keeps its flex layout and its width.
    expect([style('#boxes').display, style('#boxes').minWidth]).toEqual(['inline-flex', 'auto']);
    // A fact that opens the tools stands clear of the trail.
    expect(style('.path-tools').paddingLeft).toBe('var(--space-3)');
    document.body.innerHTML = '';
  });

  it('steps a tight bar’s action words down to their icons, the words out of the drawing', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root"><div class="pane-path-row" data-tight>
      <div class="path-tools"><button class="pane-act"><span class="pane-act-word">Start</span></button></div>
    </div></section>`;
    const word = getComputedStyle(document.querySelector('.pane-act-word') as Element);

    expect([word.position, word.clipPath, word.overflow]).toEqual([
      'absolute',
      'inset(50%)',
      'hidden'
    ]);
    expect(getComputedStyle(document.querySelector('.pane-act') as Element).gap).toMatch(
      /^0(px)?$/
    );
    document.body.innerHTML = '';
  });

  it("starts a no-icon listing's first label past the icon column, below an app's own placement", () => {
    // The rule weighs what the label's default does, so any scoped app rule
    // that places the label wins, and a section's heading keeps the edge.
    expect(sheet).toMatch(
      /^:where\(\.listing-root \.pane-listing:has\(> \.row\):not\(:has\(> \.row > \.row-icon:not\(:empty\)\)\)\)\n\s*> \.pane-columns\n\s*> \.row-name:where\(:not\(:has\(h3\)\)\) \{\n\s*grid-column: 2;/m
    );
  });

  it('keeps the press of a crumb and a sort label over their hover', () => {
    // Their hover is the base sheet's shared recipe, which weighs what the
    // pressed one does; a heavier component hover would win over a press.
    expect(sheet).not.toMatch(/crumb-label:hover/);
    expect(sheet).not.toMatch(/\.pane-sort\.sortable:hover/);
  });
});
