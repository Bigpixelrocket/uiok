import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CircleArrowUp, Square } from 'lucide-react';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { TextLink } from '../button/TextLink.js';
import { FilterChips } from '../frame/FilterChips.js';
import { TreeFilterInput, TreePane, TreeTool } from '../frame/Tree.js';
import { ToneIcon } from '../icon/ToneIcon.js';
import { StateMark } from '../listing/Listing.js';
import { TimelineCell } from '../listing/Timeline.js';
import { PaneBox } from './Pane.js';
import { RowIconAction } from './PaneActions.js';

const styles = readStylesheet('src/styles.css');

/**
 * What the rules inside the stylesheets' `prefers-reduced-motion: reduce`
 * blocks that match `element` declare for `property`, in source order.
 */
const reducedMotionRules = (): CSSStyleRule[] =>
  [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-motion')
    )
    .flatMap((media) => [...media.cssRules])
    .filter((rule): rule is CSSStyleRule => rule instanceof CSSStyleRule);

const reducedMotionValues = (element: Element, property: string): string[] =>
  reducedMotionRules()
    .filter((rule) => !rule.selectorText.includes('::') && element.matches(rule.selectorText))
    .map((rule) => rule.style.getPropertyValue(property))
    .filter((value) => value !== '');

describe("PaneBox's bell", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rings once per rise, alternating its parity class, then rests', () => {
    const { container, rerender } = render(<PaneBox active bell={0} />);
    const pane = container.querySelector('.pane') as HTMLElement;

    expect(pane.className).toBe('pane active');

    rerender(<PaneBox active bell={1} />);
    expect(pane.classList.contains('bell-1')).toBe(true);

    rerender(<PaneBox active bell={2} />);
    expect(pane.classList.contains('bell-0')).toBe(true);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(pane.className).toBe('pane active');
  });

  it('shoves the cursor row on the nudge keyframes while it rings', () => {
    const { container, rerender } = render(
      <div className="listing-root">
        <PaneBox bell={0}>
          <div className="row cursor" />
        </PaneBox>
      </div>
    );
    applyStylesheets(styles);

    rerender(
      <div className="listing-root">
        <PaneBox bell={1}>
          <div className="row cursor" />
        </PaneBox>
      </div>
    );

    const row = container.querySelector('.row') as HTMLElement;

    expect(declaredValues(row, 'animation')).toEqual([
      'row-nudge-b var(--duration-slow) var(--ease-in-out)'
    ]);
  });

  it("rings the tree pane's cursor row the same way", () => {
    const tree = (bell: number) => (
      <div className="listing-root">
        <TreePane active bell={bell}>
          <div className="row cursor" />
        </TreePane>
      </div>
    );
    const { container, rerender } = render(tree(0));
    const pane = container.querySelector('.tree-pane') as HTMLElement;

    applyStylesheets(styles);
    expect(pane.className).toBe('pane tree-pane active');
    rerender(tree(1));
    expect(pane.classList.contains('bell-1')).toBe(true);
    expect(declaredValues(container.querySelector('.row') as HTMLElement, 'animation')).toEqual([
      'row-nudge-b var(--duration-slow) var(--ease-in-out)'
    ]);

    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(pane.className).toBe('pane tree-pane active');
  });
  it("shoves a tree's tool row under the cursor as it does a tree row", () => {
    const tree = (bell: number) => (
      <div className="listing-root">
        <TreePane active bell={bell}>
          <TreeTool cursor text="Show 20 more" />
        </TreePane>
      </div>
    );
    const { container, rerender } = render(tree(0));

    applyStylesheets(styles);
    rerender(tree(1));
    const tool = container.querySelector('.tree-tool') as HTMLElement;

    expect(tool.classList.contains('cursor')).toBe(true);
    expect(declaredValues(tool, 'animation')).toEqual([
      'row-nudge-b var(--duration-slow) var(--ease-in-out)'
    ]);
  });

  it("flashes without motion with every part of the tree's cursor row in the selection's ink", () => {
    const tree = (bell: number) => (
      <div className="listing-root">
        <TreePane active bell={bell}>
          <div className="row cursor">
            <span className="tree-glyph" />
            <span className="row-name tree-name">
              orders <span className="tree-detail">view</span>
            </span>
          </div>
          <TreeTool cursor text="Show 20 more" />
        </TreePane>
      </div>
    );
    const { container, rerender } = render(tree(0));

    rerender(tree(1));
    applyStylesheets(styles);
    const row = container.querySelector('.row') as HTMLElement;
    const tool = container.querySelector('.tree-tool') as HTMLElement;

    for (const element of [row, tool]) {
      expect(reducedMotionValues(element, 'animation')).toEqual(['none']);
      expect(reducedMotionValues(element, '--row-fill')).toEqual(['var(--selected-bg)']);
    }
    // Each part that sets its own ink takes the selection's, which holds
    // its contrast on the selection fill in every theme (tokens.test.ts).
    for (const part of [
      row.querySelector('.tree-glyph'),
      row.querySelector('.tree-detail'),
      row.querySelector('.row-name'),
      tool
    ]) {
      expect(reducedMotionValues(part as Element, 'color')).toEqual(['var(--on-selected)']);
    }
  });
  it('flashes without motion with the ink a selection gives every part of the row', () => {
    const tree = (bell: number) => (
      <div className="listing-root">
        <TreePane active bell={bell}>
          <div className="row cursor">
            <span className="row-name">postgres</span>
            <span className="row-meta">
              <StateMark tone="ready" word="5432" wordTone="warning" />
            </span>
            <ToneIcon icon={CircleArrowUp} label="Update available" tone="warning" />
            <RowIconAction icon={Square} label="Stop" onClick={() => undefined} />
            <TextLink onClick={() => undefined}>Details</TextLink>
          </div>
          <TreeTool cursor>
            <TreeFilterInput
              label="Filter"
              onChange={() => undefined}
              placeholder="Filter services"
              value=""
            />
          </TreeTool>
        </TreePane>
      </div>
    );
    const { container, rerender } = render(tree(0));

    rerender(tree(1));
    applyStylesheets(styles);
    const part = (selector: string) => container.querySelector(selector) as Element;
    const last = (element: Element, property: string) =>
      reducedMotionValues(element, property).at(-1);

    // A state, its word in a tone of its own, a toned icon, an icon action, and a link in words
    // each set an ink of their own that vanishes on the accent fill.
    for (const selector of [
      '.pane-state',
      '.pane-state-word',
      '.tone-icon',
      '.pane-icon-act',
      '.text-link'
    ]) {
      expect(last(part(selector), 'color'), selector).toBe('var(--on-selected)');
    }
    // A filled state mark wears a hairline in the selection's words.
    expect(last(part('.pane-state-dot'), 'box-shadow')).toBe(
      '0 0 0 var(--line) var(--on-selected)'
    );
    // The filter's caret, and its placeholder in the selection's quiet words.
    expect(last(part('.tree-filter-input'), 'caret-color')).toBe('var(--on-selected)');
    const placeholder = reducedMotionRules().filter(
      (rule) =>
        rule.selectorText.includes('.tree-filter-input::placeholder') &&
        rule.selectorText.includes('.bell-0')
    );
    expect(placeholder.map((rule) => rule.style.getPropertyValue('color'))).toEqual([
      'var(--on-selected-dim)'
    ]);
    // The filter's underline while it holds the keys, in the selection's words.
    const underline = reducedMotionRules().filter((rule) =>
      rule.selectorText.includes(':has(.tree-filter-input:focus-visible)')
    );
    expect(underline.map((rule) => rule.style.getPropertyValue('box-shadow'))).toEqual([
      'inset 0 calc(-1 * var(--line-strong)) 0 var(--on-selected)'
    ]);
  });
  it("flashes a listing's timeline and an on chip without motion in the selection's ink", () => {
    const pane = (bell: number) => (
      <div className="listing-root">
        <PaneBox active bell={bell}>
          <div className="row cursor">
            <span className="row-name">GET /orders</span>
            <TimelineCell emphasis end={6} label="From 2 to 6 ms" max={10} start={2} waited />
            <span className="row-meta">
              <FilterChips
                chips={[
                  { id: 'errors', label: 'Errors' },
                  { id: 'slow', label: 'Slow' }
                ]}
                label="Show"
                on={['errors']}
                onToggle={() => undefined}
              />
            </span>
          </div>
        </PaneBox>
      </div>
    );
    const { container, rerender } = render(pane(0));

    rerender(pane(1));
    applyStylesheets(styles);
    const part = (selector: string) => container.querySelector(selector) as Element;
    const last = (element: Element, property: string) =>
      reducedMotionValues(element, property).at(-1);

    // The solid bar in the selection's words, the wait in its quiet words:
    // in the accent they would vanish on the accent fill.
    expect(last(part('.timeline-bar'), 'background')).toBe('var(--on-selected)');
    expect(last(part('.timeline-wait'), 'background')).toBe('var(--on-selected-dim)');
    // The on chip on the selection's highlight inside a ring in its words.
    const on = part(".pane-quick-button[aria-pressed='true']");
    expect(last(on, 'background')).toBe('var(--selection-hit)');
    expect(last(on, '--current-ring')).toBe('var(--on-selected)');
    // A chip's focus ring in the selection's words.
    const focus = reducedMotionRules().filter(
      (rule) =>
        rule.selectorText.includes('.pane-quick-button:focus-visible') &&
        rule.selectorText.includes('.bell-0')
    );
    expect(focus.map((rule) => rule.style.getPropertyValue('outline-color'))).toEqual([
      'var(--on-selected)'
    ]);
  });
});
