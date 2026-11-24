import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { TreePane, TreeTool } from '../frame/Tree.js';
import { PaneBox } from './Pane.js';

const styles = readStylesheet('src/styles.css');

/**
 * What the rules inside the stylesheets' `prefers-reduced-motion: reduce`
 * blocks that match `element` declare for `property`, in source order.
 */
const reducedMotionValues = (element: Element, property: string): string[] =>
  [...document.styleSheets]
    .flatMap((sheet) => [...sheet.cssRules])
    .filter(
      (rule): rule is CSSMediaRule =>
        rule instanceof CSSMediaRule && rule.conditionText.includes('prefers-reduced-motion')
    )
    .flatMap((media) => [...media.cssRules])
    .filter(
      (rule): rule is CSSStyleRule =>
        rule instanceof CSSStyleRule && element.matches(rule.selectorText)
    )
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
});
