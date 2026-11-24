import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

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

  it('keeps a reader scrolled up where they are, drawing what they read and the newest lines', () => {
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
    // The newest lines stay drawn, so the log region still hears them.
    expect(drawnLines(container).at(-1)).toBe('line 1099');
    expect(drawnLines(container)).not.toContain('line 700');
    expect(container.querySelectorAll('.log-line').length).toBeLessThan(150);
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
    expect(container.querySelector('.log-gap:not(:first-child)')).toBeNull();

    // An empty selection lets it go.
    selection.removeAllRanges();
    changed();
    expect(drawnLines(container)).not.toContain('line 5');
    expect(drawnLines(container).length).toBeLessThan(150);
  });
});
