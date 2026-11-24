import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { TreePane } from '../frame/Tree.js';
import { PaneBox } from './Pane.js';

const styles = readStylesheet('src/styles.css');

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
});
