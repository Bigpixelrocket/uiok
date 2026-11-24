/**
 * The tree's look holds against the listing rules it sits among: a chevron
 * keeps the rows' dim icon tone, a tree note an app also marks as a
 * listing's empty line keeps the tree's size and padding, and the filter
 * line shows focus by its underline alone (the ring kept in forced colours). jsdom lays nothing out, so these
 * read what the cascade resolves (a token reads as the `var()` it names).
 */

import { describe, expect, it } from 'vitest';

import { applyStylesheets, readStylesheet } from '../../test/stylesheets.js';

const styles = readStylesheet('src/styles.css');
const frame = readStylesheet('src/frame/frame.css');

/** A tree pane with a folded node, an empty note, and the filter line, as `Tree.tsx` draws them. */
const treePane = `
  <section class="listing-root">
    <div class="pane-list tree">
      <div class="row" id="rest"><button class="tree-chev row-icon" type="button"></button>
        <span class="row-name tree-name">orders</span></div>
      <div class="row cursor" id="cursor"><button class="tree-chev row-icon" type="button"></button>
        <span class="row-name tree-name">users</span></div>
      <div class="tree-tool tree-note pane-message empty" id="empty">No tables</div>
      <div class="tree-tool"><input class="tree-filter-input" /></div>
    </div>
  </section>`;

/**
 * The rules inside the sheet's `@media (forced-colors: none)` blocks, as
 * plain rules: jsdom applies no media rule, so a test of standard colours
 * adds them itself (before the sheet, so they win by weight, not order).
 */
const standardColours = (sheet: string): string => {
  const parsed = new CSSStyleSheet();
  parsed.replaceSync(sheet);
  return [...parsed.cssRules]
    .filter(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.media.mediaText === '(forced-colors: none)'
    )
    .flatMap((rule) => [...rule.cssRules].map((inner) => inner.cssText))
    .join('\n');
};

const style = (selector: string): CSSStyleDeclaration =>
  getComputedStyle(document.querySelector(selector) as Element);

describe('the tree look', () => {
  it("draws a chevron off the cursor in the rows' dim icon tone, not the row's words", () => {
    applyStylesheets(styles);
    document.body.innerHTML = treePane;

    expect(style('#rest .tree-chev').getPropertyValue('color')).toBe('var(--text-dim)');
    // The cursor row's tone still reaches it.
    expect(style('#cursor .tree-chev').getPropertyValue('color')).toBe('var(--text-on-surface)');
    document.body.innerHTML = '';
  });

  it("keeps a tree note's size and padding when it is also a listing's empty line", () => {
    applyStylesheets(styles);
    document.body.innerHTML = treePane;
    // The rule that wins the size is the one that restores the padding.
    expect(style('#empty').getPropertyValue('font-size')).toBe('var(--font-size-small)');
    // jsdom drops a padding-block that holds var(), so read the rule.
    expect(frame).toMatch(
      /^\.tree-tool\.pane-message\.empty \{[^}]*padding-block: var\(--space-1\);[^}]*font-size: var\(--font-size-small\);/m
    );
    document.body.innerHTML = '';
  });

  it('shows a focused filter by the underline alone, with no field ring', () => {
    // The block's rules go first, so the ring falls to their weight, not their order.
    applyStylesheets(standardColours(styles), styles);
    document.body.innerHTML = treePane;
    const input = document.querySelector('.tree-filter-input') as HTMLInputElement;

    input.focus();
    expect(input.matches(':focus-visible')).toBe(true);
    // jsdom keeps an outline holding var() as the shorthand, so read that.
    expect(getComputedStyle(input).outline).not.toContain('--focus-ring-width');
    document.body.innerHTML = '';
  });

  it('keeps the ring on a focused filter in forced colours, which draw no underline', () => {
    // Only the forced-colours-none block removes the ring, so without it the ring stands.
    applyStylesheets(styles);
    document.body.innerHTML = treePane;
    const input = document.querySelector('.tree-filter-input') as HTMLInputElement;

    input.focus();
    expect(getComputedStyle(input).outline).toContain('--focus-ring-width');
    expect(standardColours(styles)).toMatch(/\.tree-filter-input:focus-visible/);
    document.body.innerHTML = '';
  });

  it("dims a dim row's name as a listing's dim row, lifting it on the cursor, a mark, and the pointer", () => {
    applyStylesheets(styles.replaceAll(':hover', '.is-hovered'));
    document.body.innerHTML = `
      <section class="listing-root"><div class="pane-list tree pointer">
        <div class="row row-dim" id="rest"><span class="row-icon"></span><span class="tree-glyph"></span>
          <span class="row-name tree-name">composer</span></div>
        <div class="row row-dim cursor" id="cursor"><span class="row-icon"></span><span class="tree-glyph"></span>
          <span class="row-name tree-name">composer</span></div>
        <div class="row row-dim marked" id="marked"><span class="row-icon"></span><span class="tree-glyph"></span>
          <span class="row-name tree-name">composer</span></div>
        <div class="row" id="plain"><span class="row-icon"></span><span class="tree-glyph"></span>
          <span class="row-name tree-name">php</span></div>
      </div></section>`;

    expect(style('#rest .tree-name').getPropertyValue('color')).toBe('var(--row-meta-text)');
    expect(style('#cursor .tree-name').getPropertyValue('color')).toBe('var(--text-on-surface)');
    expect(style('#marked .tree-name').getPropertyValue('color')).toBe('var(--text-on-surface)');
    expect(style('#plain .tree-name').getPropertyValue('color')).not.toBe('var(--row-meta-text)');
    document.querySelector('#rest')?.classList.add('is-hovered');
    expect(style('#rest .tree-name').getPropertyValue('color')).toBe('var(--text-on-surface)');
    document.body.innerHTML = '';
  });

  it('dims a dim group’s name too, and lifts a hovered dim node in a tree that marks no pointer', () => {
    applyStylesheets(styles.replaceAll(':hover', '.is-hovered'));
    document.body.innerHTML = `
      <section class="listing-root"><div class="pane-list tree">
        <div class="row tree-group row-dim" id="group"><span class="row-icon"></span><span class="tree-glyph"></span>
          <span class="row-name tree-name">Services</span></div>
        <div class="row tree-group" id="plain-group"><span class="row-icon"></span><span class="tree-glyph"></span>
          <span class="row-name tree-name">Databases</span></div>
        <div class="row row-dim is-hovered" id="hovered"><span class="row-icon"></span><span class="tree-glyph"></span>
          <span class="row-name tree-name">composer</span></div>
      </div></section>`;

    expect(style('#group .tree-name').getPropertyValue('color')).toBe('var(--row-meta-text)');
    expect(style('#plain-group .tree-name').getPropertyValue('color')).toBe('var(--text-dim)');
    expect(style('#hovered .tree-name').getPropertyValue('color')).toBe('var(--text-on-surface)');
    document.body.innerHTML = '';
  });

  it("keeps an add row's accent plus on the cursor", () => {
    applyStylesheets(styles);
    document.body.innerHTML = `
      <section class="listing-root"><div class="pane-list tree">
        <div class="row cursor pane-add"><span class="row-icon"></span>
          <span class="tree-glyph" id="plus"></span><span class="row-name tree-name">Add</span>
          <span class="tree-detail" id="add-detail">to the stack</span></div>
        <div class="row cursor"><span class="row-icon"></span>
          <span class="tree-glyph" id="glyph"></span><span class="row-name tree-name">users</span></div>
      </div></section>`;

    expect(style('#plus').getPropertyValue('color')).toBe('var(--accent)');
    // Its quiet words still take the cursor's tone.
    expect(style('#add-detail').getPropertyValue('color')).toBe('var(--text-on-surface)');
    expect(style('#glyph').getPropertyValue('color')).toBe('var(--text-on-surface)');
    document.body.innerHTML = '';
  });
});
