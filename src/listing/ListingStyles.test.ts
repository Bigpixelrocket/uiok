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
    ]).toEqual(['var(--control-height-xs)', '22px', 'var(--control-height-xs)']);
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
      .map((selector) => selector.replace(/:hover\b/g, ''));
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
