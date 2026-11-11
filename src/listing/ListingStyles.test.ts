/**
 * The listing look's contract: its metrics, the size of the frame's compact
 * controls, a focus ring that sits inside them and outweighs a host's own,
 * and no highlight on a disabled one. jsdom lays nothing out, so these read
 * what the rules set.
 */

import { describe, expect, it } from 'vitest';

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

  it('pulses a busy mark, and holds it still under reduced motion', () => {
    expect(sheet).toMatch(
      /:where\(\.listing-root\) \.pane-tone-busy > \.pane-state-dot\s*\{[^}]*animation:\s*uiok-pulse /
    );
    expect(sheet).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*:where\(\.listing-root\) \.pane-tone-busy > \.pane-state-dot\s*\{\s*animation:\s*none;/
    );
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

  it('hide a row’s hover icons at rest, showing them on the cursor row', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root">
      <div class="row"><span class="row-meta pane-hover-cell"><button class="pane-icon-act"></button></span></div>
      <div class="row cursor"><span class="row-meta pane-hover-cell"><button class="pane-icon-act"></button></span></div>
    </section>`;
    const [rest, cursor] = [...document.querySelectorAll('.pane-icon-act')] as Element[];

    expect(declaredValues(rest as Element, 'opacity')).toEqual(['0']);
    expect(declaredValues(cursor as Element, 'opacity')).toEqual([]);
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

  it('lights the row actions only on the cursor row of the pane that holds the keys', () => {
    applyStylesheets(styles);
    const pane = (active: boolean): string => `<div class="pane${active ? ' active' : ''}">
      <div class="row cursor"><span class="row-meta">
        <button class="pane-act" type="button">Stop</button>
        <button class="pane-icon-act danger" type="button"></button>
      </span></div></div>`;
    document.body.innerHTML = `<section class="listing-root">${pane(true)}${pane(false)}</section>`;
    const [lit, danger, quiet, quietDanger] = document.querySelectorAll('button');

    expect(colour(lit as Element)).toBe('var(--accent-text)');
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
    expect(colour(lit as Element)).toBe('var(--accent-text)');
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
      'var(--accent-text)',
      'var(--accent-text)',
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
    const pane = (active: boolean): string =>
      `<div class="pane${active ? ' active' : ''}"><div class="pane-list pointer">${rows}</div></div>`;
    document.body.innerHTML = `<section class="listing-root">${pane(true)}${pane(false)}</section>`;
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

  it('gives way in a narrow path bar with the trail first, clipped at its box, then a fact’s words', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root"><div class="pane-path-row">
      <div class="pane-crumbs"><span class="crumb here"><span class="crumb-label">a</span></span></div>
      <div class="path-tools"><span class="path-facts"><span class="path-fact-text">Stopped</span></span></div>
    </div></section>`;
    const crumbs = getComputedStyle(document.querySelector('.pane-crumbs') as Element);
    const text = getComputedStyle(document.querySelector('.path-fact-text') as Element);

    expect(crumbs.flexShrink).toBe('1000000');
    // The floor holds every crumb cut (the count PanePathBar sets), or two
    // crumbs' worth without a count, and drops to what the row leaves it.
    expect(crumbs.minWidth).toMatch(/^min\(\s*100%,\s*var\(--pane-crumb-fit, 100%\),/);
    expect(crumbs.minWidth).toContain('var(--pane-crumb-room)');
    expect(crumbs.minWidth).toContain('(var(--pane-row-inset) + 10ch)');
    expect(crumbs.getPropertyValue('--pane-crumb-room')).toContain(
      'var(--pane-crumb-count)*(2ch + var(--space-4))'
    );
    expect(sheet).toMatch(/@property --pane-crumb-count \{\n\s*syntax: '<integer>';/);
    expect(crumbs.overflowX).toBe('clip');
    expect([text.overflow, text.textOverflow]).toEqual(['hidden', 'ellipsis']);
    // A cramped trail keeps its last crumbs and fades its start.
    document.querySelector('.pane-crumbs')?.setAttribute('data-cramped', '');
    expect(getComputedStyle(document.querySelector('.pane-crumbs') as Element).justifyContent).toBe(
      'flex-end'
    );
    expect(getComputedStyle(document.querySelector('.pane-crumbs') as Element).maskImage).toContain(
      'transparent'
    );
    // A crumb's open menu sits inside the trail; the trail clips nothing then.
    document.querySelector('.crumb-label')?.setAttribute('aria-expanded', 'true');
    expect(getComputedStyle(document.querySelector('.pane-crumbs') as Element).overflowX).not.toBe(
      'clip'
    );
    expect(getComputedStyle(document.querySelector('.pane-crumbs') as Element).maskImage).toBe(
      'none'
    );
    document.body.innerHTML = '';
  });

  it('lets a fact written as bare words cut too, its mark set in the line', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<section class="listing-root"><div class="pane-path-row">
      <div class="path-tools"><span class="path-facts danger"><span class="pane-state"></span>Stopped</span></div>
    </div></section>`;
    const fact = getComputedStyle(document.querySelector('.path-facts') as Element);
    const mark = getComputedStyle(document.querySelector('.pane-state') as Element);

    expect([fact.display, fact.overflow, fact.textOverflow]).toEqual([
      'inline-block',
      'hidden',
      'ellipsis'
    ]);
    expect(fact.minWidth).toContain('calc-size(max-content');
    expect([mark.verticalAlign, mark.marginInlineEnd]).toEqual(['middle', 'var(--space-3)']);
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
