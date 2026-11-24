import { act, render, screen } from '@testing-library/react';
import { Activity, useState, type ReactElement } from 'react';
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

const pair = (from: number, firstWords = 'settings') => (
  <SideBySide
    first={<p>{firstWords}</p>}
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
    widen(root, 619);
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

  it('settles when the scrollbar two columns bring narrows the pair under the threshold', () => {
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
    const { container } = render(pair(640));
    const root = container.querySelector('.side-by-side') as HTMLElement;
    // A classic scrollbar shows only while the two stand side by side (taller than stacked).
    Object.defineProperty(root, 'clientWidth', {
      configurable: true,
      get: () => (root.dataset.layout === 'side-by-side' ? 625 : 640)
    });
    const layouts: string[] = [];

    for (let turn = 0; turn < 4; turn += 1) {
      act(() => observers.at(-1)?.());
      layouts.push(root.dataset.layout ?? '');
    }
    expect(layouts).toEqual(['side-by-side', 'side-by-side', 'side-by-side', 'side-by-side']);
  });

  it('applies a threshold changed while hidden whole when the pair comes back into view', () => {
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

    widen(root, 670);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('side-by-side');

    // Held out of sight, the threshold rises past the width it comes back at.
    widen(root, 0);
    act(() => observers.at(-1)?.());
    rerender(pair(680));
    expect(root.dataset.layout).toBe('side-by-side');
    widen(root, 670);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('stacked');
  });

  it('applies a threshold changed in view whole, then holds through a scrollbar', () => {
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

    widen(root, 670);
    act(() => observers.at(-1)?.());
    rerender(pair(680));
    expect(root.dataset.layout).toBe('stacked');
    widen(root, 690);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('side-by-side');
    widen(root, 675);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('side-by-side');
  });

  it('keeps the hold through a hide and a reveal by <Activity> when the threshold has not changed', () => {
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
    const shown = (mode: 'visible' | 'hidden') => <Activity mode={mode}>{pair(640)}</Activity>;
    const { container, rerender } = render(shown('visible'));
    const root = container.querySelector('.side-by-side') as HTMLElement;

    widen(root, 650);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('side-by-side');
    // Within the scrollbar's hold under the threshold: still side by side.
    widen(root, 630);
    act(() => observers.at(-1)?.());
    expect(root.dataset.layout).toBe('side-by-side');

    rerender(shown('hidden'));
    rerender(shown('visible'));
    expect(root.dataset.layout).toBe('side-by-side');
  });

  describe('by its content', () => {
    /** What each made ResizeObserver watches, by the order made. */
    const watched: Element[][] = [];

    const observe = (): void => {
      vi.stubGlobal(
        'ResizeObserver',
        class {
          readonly targets: Element[] = [];
          constructor(callback: () => void) {
            observers.push(callback);
            watched.push(this.targets);
          }
          observe(target: Element) {
            this.targets.push(target);
          }
          disconnect() {}
        }
      );
    };

    /** How many times a part's width was read while the pair measured. */
    let reads = 0;

    /**
     * Gives the parts min-content widths, as the one measuring column
     * (`data-measuring`) lays them out: each part as wide as the wider. Laid
     * out otherwise they read 0, so a width read outside the measuring
     * layout would ask for nothing.
     */
    const content = (root: HTMLElement, first: number, second: number): void => {
      for (const part of root.children) {
        (part as HTMLElement).getBoundingClientRect = () => {
          if (!root.hasAttribute('data-measuring')) return { width: 0 } as DOMRect;
          reads += 1;
          return { width: Math.max(first, second) } as DOMRect;
        };
      }
    };

    /** Lets a MutationObserver's callback run. */
    const settle = () => act(async () => undefined);

    afterEach(() => {
      watched.length = 0;
      reads = 0;
    });

    it('stacks wide content above the floor, standing it side by side once each half holds its part', () => {
      observe();
      const { container } = render(pair(400));
      const root = container.querySelector('.side-by-side') as HTMLElement;

      // The wider part needs 300px: equal halves need 600px.
      content(root, 300, 200);
      widen(root, 500);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
      widen(root, 600);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The measuring layout is gone once read.
      expect(root.hasAttribute('data-measuring')).toBe(false);
    });

    it('counts a one-line chip row at its full content width, and a wrapping one as laid out', () => {
      observe();
      const chipsPair = (wrap: boolean) => (
        <SideBySide
          first={
            <div className={wrap ? 'pane-quick-row pane-quick-row-wrap' : 'pane-quick-row'}>
              chips
            </div>
          }
          firstLabel="Settings"
          from={400}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const { container, rerender } = render(chipsPair(false));
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = () => root.querySelector('.pane-quick-row') as HTMLElement;
      /**
       * The chip row lays out 20px wide in the measuring column and hides
       * 200px more; in the halves it has all its room.
       */
      const hide = () => {
        Object.defineProperty(chips(), 'clientWidth', {
          configurable: true,
          get: () => (root.hasAttribute('data-measuring') ? 20 : 220)
        });
        Object.defineProperty(chips(), 'scrollWidth', { configurable: true, value: 220 });
      };

      // The parts' own boxes need 100px: the floor alone would stand them side by side.
      content(root, 100, 100);
      hide();
      widen(root, 500);
      act(() => observers.at(-1)?.());
      // The first needs 100 + 200 = 300px, so the halves need 600px.
      expect(root.dataset.layout).toBe('stacked');
      widen(root, 600);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');

      // Chips that wrap hide nothing sideways: only the part's box counts.
      rerender(chipsPair(true));
      hide();
      widen(root, 500);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
    });

    it('checks one-line chips in the halves themselves, where flexible columns share the room', () => {
      observe();
      const { container } = render(
        <SideBySide
          first={<div className="pane-quick-row">chips</div>}
          firstLabel="Settings"
          from={400}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = root.querySelector('.pane-quick-row') as HTMLElement;
      // The measuring column hides 100px of chips; side by side, a second
      // flexible column takes half of each extra pixel, so the half still
      // hides chips until the pair is 700px wide.
      Object.defineProperty(chips, 'clientWidth', {
        configurable: true,
        get: () =>
          root.hasAttribute('data-measuring')
            ? 20
            : root.getAttribute('data-layout') === 'side-by-side'
              ? Math.min(120, root.clientWidth / 2 - 230)
              : 120
      });
      Object.defineProperty(chips, 'scrollWidth', { configurable: true, value: 120 });
      content(root, 100, 100);

      // The bound alone ((100 + 100) * 2 = 400px) would stand them side by side.
      widen(root, 600);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
      widen(root, 700);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // A scrollbar narrows the pair held side by side: chips hiding less
      // than its width keep the layout, so it cannot flip back and forth.
      widen(root, 685);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The read in the halves is put back before the paint, and a stacked
      // pair keeps its height through it, so a scrolled pane keeps its scroll.
      widen(root, 600);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
      Object.defineProperty(root, 'offsetHeight', { configurable: true, value: 480 });
      let heldAt = '';
      const read = Object.getOwnPropertyDescriptor(chips, 'clientWidth')!.get!;
      Object.defineProperty(chips, 'clientWidth', {
        configurable: true,
        get: () => {
          if (root.getAttribute('data-layout') === 'side-by-side') heldAt = root.style.minHeight;
          return read();
        }
      });
      widen(root, 620);
      act(() => observers.at(-1)?.());
      expect(heldAt).toBe('480px');
      expect(root.style.minHeight).toBe('');
    });

    it('stacks a held pair whose chips grow at the same width, the floor masking the growth', () => {
      observe();
      const { container } = render(
        <SideBySide
          first={<div className="pane-quick-row">chips</div>}
          firstLabel="Settings"
          from={600}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = root.querySelector('.pane-quick-row') as HTMLElement;
      let chipsWide = 100;
      Object.defineProperty(chips, 'clientWidth', { configurable: true, value: 100 });
      Object.defineProperty(chips, 'scrollWidth', { configurable: true, get: () => chipsWide });
      // The parts' boxes are narrow, so the floor (600px) is the need throughout.
      content(root, 50, 50);

      widen(root, 620);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The chips grow 10px on their own at the same width (a word that
      // loads late): the need is the floor as before, but the chips hide.
      chipsWide = 110;
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
    });

    it('stacks a held pair whose chips grow after a scrollbar narrowed it', () => {
      observe();
      const { container } = render(
        <SideBySide
          first={<div className="pane-quick-row">chips</div>}
          firstLabel="Settings"
          from={600}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = root.querySelector('.pane-quick-row') as HTMLElement;
      let grown = 0;
      // The chip row's half: the pair's half less 210px, its words 100px and whatever they grew.
      Object.defineProperty(chips, 'clientWidth', {
        configurable: true,
        get: () => root.clientWidth / 2 - 210
      });
      Object.defineProperty(chips, 'scrollWidth', { configurable: true, get: () => 100 + grown });
      content(root, 50, 50);

      widen(root, 620);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // A scrollbar takes 15px: each half loses 7.5px, and so do the chips. Held.
      widen(root, 605);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // A late font widens the chips 10px at that width: more than the
      // narrowing took, so they stack the pair though the need (the floor) stood.
      grown = 10;
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
    });

    it('stacks a held pair whose chips grow by less than the narrowing, in a column the half shares', () => {
      observe();
      const { container } = render(
        <SideBySide
          first={<div className="pane-quick-row">chips</div>}
          firstLabel="Settings"
          from={600}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = root.querySelector('.pane-quick-row') as HTMLElement;
      let grown = 0;
      // Two flexible columns share the half: the chip row has a quarter of
      // the pair less 55px, so a 16px scrollbar takes 4px from it.
      Object.defineProperty(chips, 'clientWidth', {
        configurable: true,
        get: () => root.clientWidth / 4 - 55
      });
      Object.defineProperty(chips, 'scrollWidth', { configurable: true, get: () => 100 + grown });
      content(root, 50, 50);

      widen(root, 620);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The scrollbar: the row loses 4px and hides 4px of the same chips. Held.
      widen(root, 604);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The chips grow 4px: the row hides 8px, under half the narrowing (8px)
      // but past what its own column lost, so the pair stacks.
      grown = 4;
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
    });

    it('stacks a held pair whose chips grow into room their row had to spare', () => {
      observe();
      const { container } = render(
        <SideBySide
          first={<div className="pane-quick-row">chips</div>}
          firstLabel="Settings"
          from={600}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = root.querySelector('.pane-quick-row') as HTMLElement;
      let chipsWide = 97;
      // The row has a quarter of the pair less 55px; its chips, end to end, `chipsWide`.
      const room = () => root.clientWidth / 4 - 55;
      Object.defineProperty(chips, 'clientWidth', { configurable: true, get: room });
      Object.defineProperty(chips, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(chipsWide, room())
      });
      Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ width: chipsWide }) as DOMRect
      });
      content(root, 50, 50);

      // At 620px the row has 100px for 97px of chips: they fit, 3px to spare.
      widen(root, 620);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // A scrollbar: the row has 96px and hides 1px of the same chips. Held.
      widen(root, 604);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The chips grow to 100px, into what was spare room at the fit: the row
      // still reported 100px wide there, but the chips grew, so the pair stacks.
      chipsWide = 100;
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
      Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
    });

    it('stacks a held pair whose chip row a growing column beside it squeezes, its chips unchanged', () => {
      observe();
      const { container } = render(
        <SideBySide
          first={<div className="pane-quick-row">chips</div>}
          firstLabel="Settings"
          from={600}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = root.querySelector('.pane-quick-row') as HTMLElement;
      let neighbour = 0;
      // Half the pair less 210px, less what a growing column beside the row takes.
      const room = () => root.clientWidth / 2 - 210 - neighbour;
      Object.defineProperty(chips, 'clientWidth', { configurable: true, get: room });
      Object.defineProperty(chips, 'scrollWidth', {
        configurable: true,
        get: () => Math.max(100, room())
      });
      Object.defineProperty(Range.prototype, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ width: 100 }) as DOMRect
      });
      content(root, 50, 50);

      widen(root, 620);
      act(() => observers.at(-1)?.());
      widen(root, 604);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The column beside the chips grows 40px: the same chips now hide 48px,
      // far past what the scrollbar took from the half.
      neighbour = 40;
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
      Reflect.deleteProperty(Range.prototype, 'getBoundingClientRect');
    });

    it('keeps the hold when the host draws the same chips again, and bounds it to a scrollbar', () => {
      observe();
      const pairOf = (label: string) => (
        <SideBySide
          first={<div className="pane-quick-row">chips</div>}
          firstLabel={label}
          from={600}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const { container, rerender } = render(pairOf('Settings'));
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const chips = root.querySelector('.pane-quick-row') as HTMLElement;
      Object.defineProperty(chips, 'clientWidth', {
        configurable: true,
        get: () => root.clientWidth / 2 - 210
      });
      Object.defineProperty(chips, 'scrollWidth', { configurable: true, value: 100 });
      content(root, 50, 50);

      widen(root, 620);
      act(() => observers.at(-1)?.());
      widen(root, 605);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // New elements for the same parts (a chip pressed, any host render): still held.
      rerender(pairOf('Settings'));
      rerender(pairOf('Settings '));
      expect(root.dataset.layout).toBe('side-by-side');
      // Narrowed past a scrollbar's width under where the chips fit: no hold.
      widen(root, 598);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
    });

    it('keeps narrow content side by side from the floor', () => {
      observe();
      const { container } = render(pair(400));
      const root = container.querySelector('.side-by-side') as HTMLElement;

      content(root, 100, 150);
      widen(root, 420);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
    });

    it('never stands content that fits side by side under the floor', () => {
      observe();
      const { container } = render(pair(640));
      const root = container.querySelector('.side-by-side') as HTMLElement;

      content(root, 50, 50);
      widen(root, 600);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
    });

    it('settles when content sets the boundary and the scrollbar two columns bring narrows the pair', () => {
      observe();
      const { container } = render(pair(400));
      const root = container.querySelector('.side-by-side') as HTMLElement;

      content(root, 320, 320);
      Object.defineProperty(root, 'clientWidth', {
        configurable: true,
        get: () => (root.dataset.layout === 'side-by-side' ? 625 : 640)
      });
      const layouts: string[] = [];

      for (let turn = 0; turn < 4; turn += 1) {
        act(() => observers.at(-1)?.());
        layouts.push(root.dataset.layout ?? '');
      }
      expect(layouts).toEqual(['side-by-side', 'side-by-side', 'side-by-side', 'side-by-side']);
    });

    it('decides again when a part grows with no resize of the pair', () => {
      observe();
      const { container } = render(pair(400));
      const root = container.querySelector('.side-by-side') as HTMLElement;
      const parts = [...root.children];

      // Each part is watched, so its content changing its size calls back.
      expect(watched.at(-1)).toEqual([root, ...parts]);
      content(root, 200, 200);
      widen(root, 500);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      content(root, 200, 400);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
    });

    it('decides again when new parts change only the content, the parts’ boxes as they were', () => {
      observe();
      const parts = (tools: number) => (
        <SideBySide
          first={<p>{'tool '.repeat(tools)}</p>}
          firstLabel="Settings"
          from={400}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const { container, rerender } = render(parts(1));
      const root = container.querySelector('.side-by-side') as HTMLElement;

      content(root, 200, 100);
      widen(root, 500);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // A tool more, and no resize reported: it stacks.
      content(root, 300, 100);
      rerender(parts(2));
      expect(root.dataset.layout).toBe('stacked');
      // And back.
      content(root, 200, 100);
      rerender(parts(1));
      expect(root.dataset.layout).toBe('side-by-side');
    });

    it('decides again when a part’s own content changes inside it, and never for attributes', async () => {
      observe();
      let grow: (wide: boolean) => void = () => undefined;
      function Tools(): ReactElement {
        const [wide, setWide] = useState(false);

        grow = setWide;
        return <p>{wide ? 'Edit Reset Reload Open' : 'Edit'}</p>;
      }
      const { container } = render(
        <SideBySide
          first={<Tools />}
          firstLabel="Settings"
          from={400}
          second={<p>extensions</p>}
          secondLabel="Extensions"
        />
      );
      const root = container.querySelector('.side-by-side') as HTMLElement;

      content(root, 200, 100);
      widen(root, 500);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');

      content(root, 300, 100);
      await act(async () => grow(true));
      await settle();
      expect(root.dataset.layout).toBe('stacked');
      content(root, 200, 100);
      await act(async () => grow(false));
      await settle();
      expect(root.dataset.layout).toBe('side-by-side');

      // The layout's attributes and a row's classes wake no measure.
      const before = reads;
      for (let turn = 0; turn < 5; turn += 1) {
        root.dataset.layout = turn % 2 === 0 ? 'stacked' : 'side-by-side';
        root.firstElementChild?.classList.toggle('cursor');
        await settle();
      }
      expect(reads).toBe(before);
    });

    it('measures no content under the floor, nor in the hold when only the width moved', async () => {
      observe();
      const { container, rerender } = render(pair(640));
      const root = container.querySelector('.side-by-side') as HTMLElement;

      content(root, 100, 100);
      widen(root, 500);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
      expect(reads).toBe(0);
      widen(root, 650);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      let measured = reads;

      // Within the hold under it, side by side, the width alone moved: the
      // need read last still holds, and nothing is measured.
      widen(root, 630);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      expect(reads).toBe(measured);
      // Past the hold, stacked, it measures none either.
      widen(root, 619);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
      expect(reads).toBe(measured);
      // New content makes the need uncertain: held at 630 again, it measures.
      widen(root, 650);
      act(() => observers.at(-1)?.());
      widen(root, 630);
      measured = reads;
      rerender(pair(640, 'settings and more'));
      // Measured once for the change, both parts read once: the watch on
      // the content, given its chance, does not measure it again.
      await settle();
      expect(reads).toBe(measured + 2);
    });

    it('measures once as it mounts', () => {
      observe();
      const counted = { reads: 0 };
      const spy = vi
        .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
        .mockImplementation(function (this: HTMLElement) {
          if (this.parentElement?.hasAttribute('data-measuring')) counted.reads += 1;
          return { width: 100 } as DOMRect;
        });
      const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(700);

      try {
        render(pair(400));
        // One measure reads both parts once.
        expect(counted.reads).toBe(2);
      } finally {
        spy.mockRestore();
        width.mockRestore();
      }
    });

    it('holds through a scrollbar only while the content needs no more than it did', () => {
      observe();
      const { container } = render(pair(400));
      const root = container.querySelector('.side-by-side') as HTMLElement;

      content(root, 300, 300);
      widen(root, 610);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The same need, a scrollbar's width under it: held.
      widen(root, 595);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('side-by-side');
      // The content now needs more than the room: no hold, though the room is within 20px.
      content(root, 305, 300);
      act(() => observers.at(-1)?.());
      expect(root.dataset.layout).toBe('stacked');
    });
  });

  it('measures in one column as wide as the wider part, with the hairline the first has side by side', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(pair(640));
    const root = container.querySelector('.side-by-side') as HTMLElement;
    const first = root.firstElementChild as HTMLElement;

    root.setAttribute('data-measuring', '');
    expect(declaredValues(root, 'grid-template-columns').at(-1)).toBe('min-content');
    expect(declaredValues(first, 'border-inline-end').at(-1)).toBe(
      'var(--line) solid var(--border)'
    );
    // The hairline under the first stays, so a stacked pair is no shorter for the read.
    expect(declaredValues(first, 'border-block-end').at(-1)).toBe(
      'var(--line) solid var(--border)'
    );
    // The measuring layout wins over a pair already side by side, too.
    root.dataset.layout = 'side-by-side';
    expect(declaredValues(root, 'grid-template-columns').at(-1)).toBe('min-content');
    expect(declaredValues(first, 'border-block-end').at(-1)).toBe(
      'var(--line) solid var(--border)'
    );
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
