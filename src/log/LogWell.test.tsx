import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, readStylesheet } from '../../test/stylesheets.js';

import { LogWell } from './LogWell.js';

describe('LogWell', () => {
  it('writes each source in its own colour, the same colour on each of its lines', () => {
    const { container } = render(
      <LogWell
        label="Combined log"
        lines={[
          { key: 1, source: 'vite', text: 'ready in 412 ms' },
          { key: 2, source: 'web', text: 'Server running' },
          { key: 3, source: 'vite', text: 'hmr update' },
          { key: 4, source: 'reverb', text: 'Exited with code 1', tone: 'danger' }
        ]}
      />
    );

    expect(screen.getByRole('log', { name: 'Combined log' })).toBeTruthy();
    const sources = [...container.querySelectorAll<HTMLElement>('.log-source')].map((source) =>
      source.style.getPropertyValue('--log-source')
    );
    expect(sources).toEqual([
      'var(--log-source-1)',
      'var(--log-source-2)',
      'var(--log-source-1)',
      'var(--log-source-3)'
    ]);
    expect(
      (container.querySelector('.log-well') as HTMLElement).style.getPropertyValue(
        '--log-source-width'
      )
    ).toBe('6ch');
    expect(container.querySelectorAll('.log-line')[3]?.getAttribute('data-tone')).toBe('danger');
  });

  it('draws the words alone when no line has a source, and says when it is empty', () => {
    const { container, rerender } = render(
      <LogWell
        empty="No output yet."
        label="Output"
        lines={[{ key: 'a', text: 'listening on 5432' }]}
      />
    );

    expect(container.querySelector('.log-source, .log-bar')).toBeNull();
    rerender(<LogWell empty="No output yet." label="Output" lines={[]} />);
    expect(screen.getByText('No output yet.')).toBeTruthy();
  });

  it("draws a line's SGR colours with ansi, and leaves the escapes as written without it", () => {
    const text = '\u001b[44;97m INFO \u001b[0m Server \u001b[32mready\u001b[0m';
    const { container, rerender } = render(
      <LogWell ansi label="Combined log" lines={[{ key: 1, source: 'web', text }]} />
    );
    const words = container.querySelector('.log-text') as HTMLElement;
    const runs = [...words.querySelectorAll('.log-ansi')] as HTMLElement[];

    expect(words.textContent).toBe(' INFO  Server ready');
    expect(runs.map((run) => [run.textContent, run.dataset.fg, run.dataset.bg])).toEqual([
      [' INFO ', 'white', 'blue'],
      ['ready', 'green', undefined]
    ]);

    rerender(<LogWell label="Combined log" lines={[{ key: 1, source: 'web', text }]} />);
    expect(container.querySelector('.log-ansi')).toBe(null);
    expect(container.querySelector('.log-text')?.textContent).toBe(text);
  });

  it("keeps a filled run's paired words when it is also dim, and dims a plain one", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(
      <LogWell
        ansi
        label="Combined log"
        lines={[{ key: 1, source: 'web', text: '\u001b[41;2m FAIL \u001b[0;2m quiet' }]}
      />
    );
    const [filled, plain] = [...container.querySelectorAll('.log-ansi')] as HTMLElement[];

    expect(getComputedStyle(filled as HTMLElement).color).toBe('var(--on-danger)');
    expect(getComputedStyle(plain as HTMLElement).color).toBe('var(--text-dim)');
  });
});

describe('LogWell with many lines', () => {
  /** The well's laid-out height: ten lines of the 18px each counts as until measured. */
  const VIEW = 180;
  const lineOf = (index: number) => ({ key: index, source: 'web', text: `line ${index}` });
  const linesTo = (count: number) => Array.from({ length: count }, (_, index) => lineOf(index));
  const restore: (() => void)[] = [];

  /** Gives every log well a laid-out height, and a scroll height from what it holds. */
  beforeEach(() => {
    const own = (name: 'clientHeight' | 'scrollHeight', get: (well: HTMLElement) => number) => {
      const before = Object.getOwnPropertyDescriptor(HTMLElement.prototype, name);

      Object.defineProperty(HTMLElement.prototype, name, {
        configurable: true,
        get(this: HTMLElement) {
          return this.classList.contains('log-well') ? get(this) : 0;
        }
      });
      restore.push(() => {
        if (before !== undefined) Object.defineProperty(HTMLElement.prototype, name, before);
      });
    };

    own('clientHeight', () => VIEW);
    // The room between lines, then 18px for each line drawn.
    own('scrollHeight', (well) =>
      [...well.children].reduce(
        (height, child) =>
          height +
          (child.classList.contains('log-gap')
            ? parseFloat((child as HTMLElement).style.height)
            : 18),
        0
      )
    );
  });

  afterEach(() => {
    for (const undo of restore.splice(0)) undo();
  });

  const drawnLines = (container: HTMLElement): string[] =>
    [...container.querySelectorAll('.log-text')].map((text) => text.textContent ?? '');

  it('draws a bounded window of 20,000 lines, with room standing for the rest', () => {
    const { container } = render(<LogWell label="Combined log" lines={linesTo(20_000)} />);
    const well = container.querySelector('.log-well') as HTMLElement;

    expect(container.querySelectorAll('.log-line').length).toBeLessThan(120);
    // The room drawn and the lines drawn make the whole log's height.
    expect(well.scrollHeight).toBe(20_000 * 18);
    expect(drawnLines(container).at(-1)).toBe('line 19999');
  });

  it('follows the tail as lines arrive while the reader is at the foot', () => {
    const { container, rerender } = render(<LogWell label="Combined log" lines={linesTo(1000)} />);
    const well = container.querySelector('.log-well') as HTMLElement;

    expect(well.scrollTop).toBe(1000 * 18);
    expect(drawnLines(container)).not.toContain('line 0');
    expect(drawnLines(container)).toContain('line 990');

    rerender(<LogWell label="Combined log" lines={linesTo(1010)} />);
    expect(well.scrollTop).toBe(1010 * 18);
    expect(drawnLines(container).at(-1)).toBe('line 1009');
    // The view's own lines are drawn, not only the newest.
    expect(drawnLines(container)).toContain('line 1000');
  });

  it('keeps a reader scrolled up where they are, drawing what they read', () => {
    const { container, rerender } = render(<LogWell label="Combined log" lines={linesTo(1000)} />);
    const well = container.querySelector('.log-well') as HTMLElement;

    // Scrolled up to line 300.
    well.scrollTop = 300 * 18;
    fireEvent.scroll(well);
    expect(drawnLines(container)).toContain('line 300');
    expect(drawnLines(container)).toContain('line 309');

    rerender(<LogWell label="Combined log" lines={linesTo(1100)} />);
    expect(well.scrollTop).toBe(300 * 18);
    expect(drawnLines(container)).toContain('line 300');
    expect(drawnLines(container)).not.toContain('line 1099');
    expect(drawnLines(container)).not.toContain('line 700');
    expect(container.querySelectorAll('.log-line').length).toBeLessThan(150);
  });

  it('speaks new lines from a hidden region, never the lines a scroll draws', () => {
    const { container, rerender } = render(<LogWell label="Combined log" lines={linesTo(1000)} />);
    const well = screen.getByRole('log', { name: 'Combined log' });
    const live = container.querySelector('.log-live') as HTMLElement;
    const spoken = () => [...live.children].map((line) => line.textContent);

    expect(well.getAttribute('aria-live')).toBe('off');
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.getAttribute('aria-relevant')).toBe('additions');
    expect(spoken()).toHaveLength(50);
    expect(spoken().at(-1)).toBe('web line 999 ');

    // A scroll up draws old lines in the well; the region is untouched.
    const before = [...live.children];
    well.scrollTop = 300 * 18;
    fireEvent.scroll(well);
    expect(drawnLines(container)).toContain('line 300');
    expect([...live.children]).toEqual(before);

    // A batch while scrolled up reaches the region, its newest 50 lines.
    rerender(<LogWell label="Combined log" lines={linesTo(1100)} />);
    expect(spoken()).toHaveLength(50);
    expect(spoken()[0]).toBe('web line 1050 ');
    expect(spoken().at(-1)).toBe('web line 1099 ');
  });

  it('keeps the line at the top in place when the host drops lines before it', () => {
    const { container, rerender } = render(
      <LogWell follow={false} label="Combined log" lines={linesTo(1000)} />
    );
    const well = container.querySelector('.log-well') as HTMLElement;

    well.scrollTop = 300 * 18 + 5;
    fireEvent.scroll(well);
    // The host trims the first 100 lines and appends 100.
    rerender(
      <LogWell
        follow={false}
        label="Combined log"
        lines={Array.from({ length: 1000 }, (_, index) => lineOf(index + 100))}
      />
    );
    expect(well.scrollTop).toBe(200 * 18 + 5);
    expect(drawnLines(container)).toContain('line 300');
  });

  describe('measured at a width', () => {
    let lineHeight = 36;
    let resized: (() => void) | null = null;
    const boxOf = HTMLElement.prototype.getBoundingClientRect;

    beforeEach(() => {
      lineHeight = 36;
      vi.stubGlobal(
        'ResizeObserver',
        class {
          constructor(callback: () => void) {
            resized = callback;
          }
          observe(): void {}
          disconnect(): void {}
        }
      );
      HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
        return this.classList.contains('log-line')
          ? DOMRect.fromRect({ width: 100, height: lineHeight })
          : boxOf.call(this);
      };
    });

    afterEach(() => {
      vi.unstubAllGlobals();
      HTMLElement.prototype.getBoundingClientRect = boxOf;
      resized = null;
    });

    /** A log of 1,000 lines, 36px each at 400px wide, scrolled up to line 600. */
    const scrolledUp = () => {
      const { container } = render(
        <LogWell follow={false} label="Combined log" lines={linesTo(1000)} />
      );
      const well = container.querySelector('.log-well') as HTMLElement;
      let width = 400;
      let height = VIEW;

      Object.defineProperty(well, 'clientWidth', { configurable: true, get: () => width });
      Object.defineProperty(well, 'clientHeight', { configurable: true, get: () => height });
      act(() => resized?.());
      well.scrollTop = 600 * 36 + 4;
      fireEvent.scroll(well);
      expect(drawnLines(container)).toContain('line 600');
      return {
        container,
        well,
        resize: (to: { readonly width: number; readonly height: number }) => {
          width = to.width;
          height = to.height;
          act(() => resized?.());
        }
      };
    };

    it('keeps the line at the top in place when a new width wraps lines anew', () => {
      const { container, well, resize } = scrolledUp();

      // Wider, the lines no longer wrap: 18px each.
      lineHeight = 18;
      resize({ width: 800, height: VIEW });
      expect(well.scrollTop).toBe(600 * 18 + 4);
      expect(drawnLines(container)).toContain('line 600');
      expect(drawnLines(container)).not.toContain('line 1150');
    });

    it('keeps its heights and its reader through a spell out of layout', () => {
      const { well, resize } = scrolledUp();

      // Hidden: no box, and the browser drops its scroll.
      resize({ width: 0, height: 0 });
      well.scrollTop = 0;
      resize({ width: 400, height: VIEW });
      expect(well.scrollTop).toBe(600 * 36 + 4);
    });
  });

  it('keeps a scroll the well has not heard yet when lines arrive', () => {
    const { container, rerender } = render(
      <LogWell follow={false} label="Combined log" lines={linesTo(1000)} />
    );
    const well = container.querySelector('.log-well') as HTMLElement;

    well.scrollTop = 300 * 18;
    fireEvent.scroll(well);
    // The reader scrolls on; a batch renders before the scroll event comes.
    well.scrollTop = 500 * 18;
    rerender(<LogWell follow={false} label="Combined log" lines={linesTo(1010)} />);
    expect(well.scrollTop).toBe(500 * 18);
  });

  it('starts at the head without follow', () => {
    const { container } = render(
      <LogWell follow={false} label="Combined log" lines={linesTo(1000)} />
    );

    expect(drawnLines(container)[0]).toBe('line 0');
    expect((container.querySelector('.log-well') as HTMLElement).scrollTop).toBe(0);
  });

  it('keeps every line a selection covers drawn while it lasts, past the well too', () => {
    const { container } = render(
      <div>
        <LogWell follow={false} label="Combined log" lines={linesTo(1000)} />
        <p className="after">after the log</p>
      </div>
    );
    const well = container.querySelector('.log-well') as HTMLElement;
    const wordsOf = (text: string) =>
      (
        [...container.querySelectorAll('.log-text')].find(
          (words) => words.textContent === text
        ) as HTMLElement
      ).firstChild as Node;
    const selection = document.getSelection() as Selection;
    const changed = () =>
      act(() => {
        document.dispatchEvent(new Event('selectionchange'));
      });

    // A selection from line 5 to line 30, then a scroll far down.
    selection.setBaseAndExtent(wordsOf('line 5'), 2, wordsOf('line 30'), 4);
    changed();
    well.scrollTop = 400 * 18;
    fireEvent.scroll(well);
    let drawn = drawnLines(container);
    expect(drawn).toContain('line 5');
    expect(drawn).toContain('line 30');
    expect(drawn).toContain('line 400');
    expect(drawn).not.toContain('line 200');

    // Dragged past the well's foot, it covers every line to the last.
    selection.setBaseAndExtent(
      wordsOf('line 5'),
      2,
      container.querySelector('.after')?.firstChild as Node,
      3
    );
    changed();
    drawn = drawnLines(container);
    expect(drawn).toHaveLength(995);
    // The room after the lines stays, empty.
    expect((container.querySelector('.log-gap:last-child') as HTMLElement).style.height).toBe(
      '0px'
    );

    // An empty selection lets it go.
    selection.removeAllRanges();
    changed();
    expect(drawnLines(container)).not.toContain('line 5');

    // An empty selection lets it go.
    selection.removeAllRanges();
    changed();
    expect(drawnLines(container)).not.toContain('line 5');
    expect(drawnLines(container).length).toBeLessThan(150);
  });

  it('draws every line a select-all, a page-wide selection, or a copy covers', () => {
    const { container } = render(
      <div>
        <LogWell follow={false} label="Combined log" lines={linesTo(1000)} />
        <p className="after">after the log</p>
      </div>
    );
    const well = container.querySelector('.log-well') as HTMLElement;
    const wordsOf = (text: string) =>
      (
        [...container.querySelectorAll('.log-text')].find(
          (words) => words.textContent === text
        ) as HTMLElement
      ).firstChild as Node;
    const selection = document.getSelection() as Selection;
    const changed = () =>
      act(() => {
        document.dispatchEvent(new Event('selectionchange'));
      });

    // A select-all of the well, starting in the room before the lines drawn.
    well.scrollTop = 400 * 18;
    fireEvent.scroll(well);
    expect(well.firstElementChild?.classList.contains('log-gap')).toBe(true);
    selection.selectAllChildren(well);
    changed();
    expect(drawnLines(container)).toHaveLength(1000);
    expect(selection.toString()).toContain('line 0');
    expect(selection.toString()).toContain('line 999');

    // A page-wide selection around the well.
    selection.removeAllRanges();
    changed();
    expect(drawnLines(container).length).toBeLessThan(150);
    selection.selectAllChildren(container);
    changed();
    expect(drawnLines(container)).toHaveLength(1000);

    // A copy draws what the selection covers at once, before its text is taken.
    selection.removeAllRanges();
    changed();
    selection.setBaseAndExtent(
      wordsOf('line 400'),
      0,
      container.querySelector('.after') as Node,
      1
    );
    document.dispatchEvent(new Event('copy'));
    // Line 400 to the last, and the view's overscan above it.
    expect(drawnLines(container)).toHaveLength(620);
    expect(selection.toString()).toContain('line 700');
    expect(selection.toString()).toContain('line 999');

    selection.removeAllRanges();
    changed();
  });
});
