import { render } from '@testing-library/react';
import { Play } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PanePathBar, PaneStatus, PathFact } from './PaneFrame.js';
import { InRowContext, QuietAction, RowLinkLookContext } from './PaneActions.js';

describe('PaneStatus', () => {
  it('carries a summary in words whole as its tooltip, opened while a pane cuts it', () => {
    const { container } = render(<PaneStatus>390 GB in 142 folders and 858 files</PaneStatus>);

    expect(container.querySelector('.pane-summary')?.getAttribute('data-tooltip')).toBe(
      '390 GB in 142 folders and 858 files'
    );
    // Opened only while the pane cuts it.
    expect(container.querySelector('.pane-summary')?.hasAttribute('data-tooltip-cut')).toBe(true);
  });

  it('gives a summary drawn as markup no tooltip of its own', () => {
    const { container } = render(
      <PaneStatus>
        <strong>3</strong> items
      </PaneStatus>
    );

    expect(container.querySelector('.pane-summary')?.hasAttribute('data-tooltip')).toBe(false);
  });
});

describe('PanePathBar', () => {
  it('cuts every crumb in an inner box that opens its label only while it is cut', () => {
    const { container } = render(
      <PanePathBar heading trail={['Servers', { label: 'local', onOpen: () => {} }, 'shop']} />
    );
    const words = [...container.querySelectorAll('.crumb-text')];

    expect(words.map((box) => box.textContent)).toEqual(['Servers', 'local', 'shop']);
    for (const box of words) {
      expect(box.getAttribute('data-tooltip')).toBe(box.textContent);
      expect(box.hasAttribute('data-tooltip-cut')).toBe(true);
    }
    // No crumb repeats its label in a tooltip that opens whether cut or not.
    expect(container.querySelectorAll('.crumb-label[data-tooltip]')).toHaveLength(0);
    expect(container.querySelector('h2.crumb-label > .crumb-text')?.textContent).toBe('shop');
  });

  it("keeps a control crumb's tip on the crumb itself, open whether cut or not", () => {
    const { container } = render(
      <PanePathBar trail={[{ label: 'Servers', onOpen: () => {}, tip: 'Back to servers' }, 'x']} />
    );
    const button = container.querySelector('button.crumb-label');

    expect(button?.getAttribute('data-tooltip')).toBe('Back to servers');
    expect(button?.hasAttribute('data-tooltip-cut')).toBe(false);
    expect(button?.querySelector('.crumb-text')?.hasAttribute('data-tooltip')).toBe(false);
  });
});

describe('QuietAction', () => {
  it('draws its verb in a box of its own, which a host can hide in an icons-only look', () => {
    const { container } = render(
      <QuietAction icon={Play} label="Start web" onClick={() => undefined} word="Start" />
    );
    const button = container.querySelector('button.pane-act');

    expect(button?.querySelector('.pane-act-word')?.textContent).toBe('Start');
    expect(button?.getAttribute('aria-label')).toBe('Start web');
    // Outside a row or a bar it keeps its word in sight.
    expect(button?.classList.contains('wordless')).toBe(false);
  });

  it('is a glyph alone in a row and a path bar, its word its tooltip, unless the look asks for words', () => {
    const action = (
      <QuietAction
        icon={Play}
        label="Start web"
        onClick={() => undefined}
        shortcut="⌥↩"
        word="Start"
      />
    );
    const inRow = render(<InRowContext.Provider value>{action}</InRowContext.Provider>);
    const rowButton = inRow.container.querySelector('button.pane-act');

    expect(rowButton?.classList.contains('wordless')).toBe(true);
    expect(rowButton?.querySelector('svg')).not.toBeNull();
    expect(rowButton?.querySelector('.pane-act-word')?.textContent).toBe('Start');
    expect(rowButton?.getAttribute('data-tooltip')).toBe('Start');
    expect(rowButton?.getAttribute('data-tooltip-shortcut')).toBe('⌥↩');
    inRow.unmount();

    const bar = render(<PanePathBar trail={[]}>{action}</PanePathBar>);
    expect(bar.container.querySelector('.path-tools > .pane-act.wordless')).not.toBeNull();
    bar.unmount();

    const worded = render(
      <RowLinkLookContext.Provider value="text">
        <InRowContext.Provider value>{action}</InRowContext.Provider>
      </RowLinkLookContext.Provider>
    );
    const wordedButton = worded.container.querySelector('button.pane-act');
    expect(wordedButton?.classList.contains('wordless')).toBe(false);
    // Drawn with its word, it carries no tooltip of its own unless given one.
    expect(wordedButton?.hasAttribute('data-tooltip')).toBe(false);
  });
});

describe('PathFact', () => {
  it('writes the words in a box that cuts, with the cut-only tooltip, after its mark', () => {
    const { container } = render(
      <PathFact mark={<i className="mark" />} tone="danger">
        Stopped: port 5173 in use
      </PathFact>
    );
    const fact = container.querySelector('.path-facts');
    const text = fact?.querySelector(':scope > .path-fact-text');

    expect(fact?.className).toBe('path-facts danger');
    expect(fact?.firstElementChild?.className).toBe('mark');
    expect(text?.textContent).toBe('Stopped: port 5173 in use');
    expect(text?.getAttribute('data-tooltip')).toBe('Stopped: port 5173 in use');
    expect(text?.hasAttribute('data-tooltip-cut')).toBe(true);
  });

  it('is a plain fact without a tone', () => {
    const { container } = render(<PathFact>Synced</PathFact>);

    expect(container.querySelector('.path-facts')?.className).toBe('path-facts');
  });
});

describe('PanePathBar trail fit', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Lays the bar out: each element's box by class, and the trail's scroll size. */
  function layout(
    rects: Record<string, { left: number; right: number }>,
    scroll: { width: number; client: number }
  ): void {
    const box = (left: number, right: number) =>
      ({
        left,
        right,
        width: right - left,
        top: 0,
        bottom: 0,
        height: 0,
        x: left,
        y: 0
      }) as DOMRect;
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const key = Object.keys(rects).find((name) => this.classList.contains(name));
      return key === undefined ? box(0, 0) : box(rects[key]!.left, rects[key]!.right);
    });
    vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
      return this.classList.contains('pane-crumbs') ? scroll.width : 0;
    });
    vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
      return this.classList.contains('pane-crumbs') ? scroll.client : 0;
    });
  }

  it('sets the crumb count and the last crumb’s stem on the row', () => {
    const { container, rerender } = render(<PanePathBar trail={['a', 'b', 'web']} />);
    const row = container.querySelector('.pane-path-row') as HTMLElement;

    expect(row.style.getPropertyValue('--pane-crumb-count')).toBe('3');
    expect(row.style.getPropertyValue('--pane-crumb-here-room')).toBe('3ch');
    rerender(<PanePathBar trail={['a', 'a-very-long-name']} />);
    expect(row.style.getPropertyValue('--pane-crumb-here-room')).toBe('9ch');
  });

  it('rests a trail its row cannot hold on its end, a slash first, pinned to what it shows', () => {
    // A 100px trail whose crumbs run 300px: its slashes start at 150 and
    // 210; resting on the second shows every crumb after it whole.
    layout(
      {
        'pane-crumbs': { left: 0, right: 100 },
        'crumb-separator': { left: 210, right: 222 },
        here: { left: 222, right: 300 }
      },
      { width: 300, client: 100 }
    );
    const { container } = render(<PanePathBar trail={['a', 'b', 'c']} />);
    const trail = container.querySelector('.pane-crumbs') as HTMLElement;

    expect(trail.dataset.cramped).toBe('pinned');
    expect(trail.style.getPropertyValue('--pane-crumb-fit')).toBe('90px');
  });

  it('leaves a trail unpinned and at its start while it holds its crumbs', () => {
    layout({ 'pane-crumbs': { left: 0, right: 300 } }, { width: 300, client: 300 });
    const { container } = render(<PanePathBar trail={['a', 'b', 'c']} />);
    const trail = container.querySelector('.pane-crumbs') as HTMLElement;

    expect(trail.hasAttribute('data-cramped')).toBe(false);
    expect(trail.style.getPropertyValue('--pane-crumb-fit')).toBe('');
  });

  it('fits again when a tool resizes on its own, with no render of the bar', () => {
    const observed: Element[] = [];
    let resized: () => void = () => undefined;
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe(target: Element) {
          observed.push(target);
        }
        disconnect() {
          observed.length = 0;
        }
      }
    );
    const { container } = render(
      <PanePathBar trail={['a', 'b']}>
        <button className="pane-act" type="button">
          Start
        </button>
      </PanePathBar>
    );
    const trail = container.querySelector('.pane-crumbs') as HTMLElement;

    expect(observed).toContain(container.querySelector('.pane-act'));
    expect(trail.hasAttribute('data-cramped')).toBe(false);
    // The tool grows; the trail is left too narrow for its crumbs.
    layout({ 'pane-crumbs': { left: 0, right: 40 } }, { width: 80, client: 40 });
    resized();
    expect(trail.hasAttribute('data-cramped')).toBe(true);
    vi.unstubAllGlobals();
  });

  it('fits again once the document’s fonts are in', async () => {
    let loaded: () => void = () => undefined;
    const ready = new Promise<void>((resolve) => (loaded = resolve));
    Object.defineProperty(document, 'fonts', { configurable: true, value: { ready } });
    const { container } = render(<PanePathBar trail={['a', 'b']} />);
    const trail = container.querySelector('.pane-crumbs') as HTMLElement;

    expect(trail.hasAttribute('data-cramped')).toBe(false);
    layout({ 'pane-crumbs': { left: 0, right: 40 } }, { width: 80, client: 40 });
    loaded();
    await ready;
    await Promise.resolve();
    expect(trail.hasAttribute('data-cramped')).toBe(true);
    Reflect.deleteProperty(document, 'fonts');
  });

  it('gives a fact of bare words its whole words as a tooltip while cut, and leaves a host’s own', () => {
    const { container } = render(
      <PanePathBar trail={['a']}>
        <span className="path-facts" id="bare">
          Stopped
        </span>
        <span className="path-facts" data-tooltip="A comment" id="own">
          Commented
        </span>
      </PanePathBar>
    );
    const bare = container.querySelector('#bare') as HTMLElement;
    const own = container.querySelector('#own') as HTMLElement;

    expect([bare.dataset.tooltip, bare.hasAttribute('data-tooltip-cut')]).toEqual([
      'Stopped',
      true
    ]);
    expect([own.dataset.tooltip, own.hasAttribute('data-tooltip-cut')]).toEqual([
      'A comment',
      false
    ]);
  });

  it('steps the action words down to icons only where the last crumb would fall below its stem', () => {
    // "web" needs 30px; its box holds 20.
    layout({ 'crumb-text': { left: 0, right: 20 } }, { width: 100, client: 100 });
    Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ left: 0, right: 30, width: 30 }) as DOMRect
    });
    const { container, rerender } = render(
      <PanePathBar trail={['a', 'web']}>
        <button className="pane-act" data-word="Start" type="button">
          Start
        </button>
      </PanePathBar>
    );
    const row = container.querySelector('.pane-path-row') as HTMLElement;
    const act = container.querySelector('.pane-act') as HTMLElement;

    expect(row.hasAttribute('data-tight')).toBe(true);
    expect(act.dataset.tooltip).toBe('Start');
    // Room again: the words come back, and the tooltip the bar gave goes.
    layout({ 'crumb-text': { left: 0, right: 30 } }, { width: 100, client: 100 });
    rerender(
      <PanePathBar trail={['a', 'web']}>
        <button className="pane-act" data-word="Start" type="button">
          Start
        </button>
      </PanePathBar>
    );
    expect(row.hasAttribute('data-tight')).toBe(false);
    expect(act.hasAttribute('data-tooltip')).toBe(false);
    Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
  });
});
