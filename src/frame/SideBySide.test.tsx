import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { Listing, Row, RowCursorContext, type RowCursor } from '../listing/Listing.js';
import { PaneBox, PaneList } from '../pane/Pane.js';
import { paneRows, shownHome } from '../pane/PaneKeys.js';
import { SideBySide } from './SideBySide.js';

/** The callbacks of the ResizeObservers made in a test, to call as a resize would. */
const observers: (() => void)[] = [];

/** Gives `element` a laid-out width, as jsdom has none. */
const widen = (element: Element, width: number): void => {
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: width });
};

const pair = (from: number) => (
  <SideBySide
    first={<p>settings</p>}
    firstLabel="Settings"
    from={from}
    second={<p>extensions</p>}
    secondLabel="Extensions"
  />
);

afterEach(() => {
  vi.unstubAllGlobals();
  observers.length = 0;
});

describe('SideBySide', () => {
  it('stands the two side by side from the threshold of its own width, stacked under it', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      }
    );
    const { container, rerender } = render(pair(640));
    const root = container.querySelector('.side-by-side') as HTMLElement;

    // Not laid out yet: stacked, the narrow layout, until it has a width.
    expect(root.dataset.layout).toBe('stacked');
    expect(screen.getByRole('group', { name: 'Settings' }).textContent).toBe('settings');
    expect(screen.getByRole('group', { name: 'Extensions' }).textContent).toBe('extensions');

    widen(root, 640);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('side-by-side');
    widen(root, 639);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('stacked');
    // A page held out of sight measures 0 and keeps its layout.
    widen(root, 0);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('stacked');

    // The threshold is the instance's own: a lower one stands the same width side by side.
    widen(root, 639);
    rerender(pair(480));
    expect(root.dataset.layout).toBe('side-by-side');
  });

  it('draws two columns with the hairline after the first side by side, and one under it stacked', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(pair(640));
    const root = container.querySelector('.side-by-side') as HTMLElement;
    const first = root.firstElementChild as HTMLElement;

    expect(declaredValues(root, 'grid-template-columns').at(-1)).toBe('minmax(0, 1fr)');
    expect(declaredValues(first, 'border-block-end').at(-1)).toBe(
      'var(--line) solid var(--border)'
    );
    root.dataset.layout = 'side-by-side';
    expect(declaredValues(root, 'grid-template-columns').at(-1)).toBe(
      'minmax(0, 1fr) minmax(0, 1fr)'
    );
    expect(declaredValues(first, 'border-inline-end').at(-1)).toBe(
      'var(--line) solid var(--border)'
    );
    expect(declaredValues(first, 'border-block-end').at(-1)).toBe('none');
  });

  it("walks the page's one cursor through the first side's rows, then the second's, under one home", () => {
    const { container } = render(
      <PaneBox>
        <PaneList home>
          <SideBySide
            first={
              <Listing columns={[]} grid="20px 1fr" title="Settings">
                <Row name="memory" rowKey="memory" />
                <Row name="timeout" rowKey="timeout" />
              </Listing>
            }
            firstLabel="Settings"
            from={640}
            second={
              <Listing columns={[]} grid="20px 1fr" title="Extensions">
                <Row name="intl" rowKey="intl" />
              </Listing>
            }
            secondLabel="Extensions"
          />
        </PaneList>
      </PaneBox>
    );
    const pane = container.querySelector('.pane');

    expect(paneRows(pane).map((row) => row.dataset.rowKey)).toEqual(['memory', 'timeout', 'intl']);
    expect(shownHome(pane)).toBe(container.querySelector('.pane-list'));
  });

  it('lets each side keep a cursor of its own under its own RowCursorContext', () => {
    const cursorOn = (key: string): RowCursor => ({
      current: () => key,
      subscribe: () => () => undefined,
      point: () => undefined
    });
    render(
      <SideBySide
        first={
          <RowCursorContext value={cursorOn('b')}>
            <Listing columns={[]} grid="20px 1fr" title="Left">
              <Row name="a" rowKey="a" />
              <Row name="b" rowKey="b" />
            </Listing>
          </RowCursorContext>
        }
        firstLabel="Left"
        from={640}
        second={
          <RowCursorContext value={cursorOn('c')}>
            <Listing columns={[]} grid="20px 1fr" title="Right">
              <Row name="c" rowKey="c" />
              <Row name="d" rowKey="d" />
            </Listing>
          </RowCursorContext>
        }
        secondLabel="Right"
      />
    );

    expect(
      screen
        .getAllByRole('row')
        .filter((row) => row.getAttribute('aria-current') === 'true')
        .map((row) => row.dataset.rowKey)
    ).toEqual(['b', 'c']);
  });
});
