import { render } from '@testing-library/react';
import { Play, Skull, Square } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { QuietAction } from './PaneActions.js';
import { useToolbarFit } from './useToolbarFit.js';

const WORDED = 80;
const GLYPH = 24;
const FIELD = 200;
/** What a field a host lets shrink gives up while the bar is short of room. */
const FIELD_SHRUNK = 60;

/**
 * Lays the bar out as a browser would: each tool is `WORDED` wide with its
 * word shown and `GLYPH` wide stepped (the stylesheet's rules, read off the
 * bar's attributes), and a `.grow` field is `FIELD` wide only while held
 * at its full size (`flex-shrink: 0`), `FIELD_SHRUNK` otherwise.
 */
function layout(room: () => number): void {
  vi.spyOn(Element.prototype, 'scrollWidth', 'get').mockImplementation(function (this: Element) {
    const bar = this as HTMLElement;
    if (!bar.hasAttribute('data-tool-fit')) return 0;
    const tight = bar.dataset.tight;
    let width = 0;
    for (const tool of bar.querySelectorAll('.pane-act')) {
      const stepped =
        tight !== undefined && (!tool.hasAttribute('data-keep-word') || tight === 'all');
      width += stepped ? GLYPH : WORDED;
    }
    for (const field of bar.querySelectorAll<HTMLElement>('.grow')) {
      width += field.style.flexShrink === '0' ? FIELD : FIELD_SHRUNK;
    }
    return Math.max(width, room());
  });
  vi.spyOn(Element.prototype, 'clientWidth', 'get').mockImplementation(function (this: Element) {
    return this.hasAttribute('data-tool-fit') ? room() : 0;
  });
}

function Bar({ field = false, kill = false }: { field?: boolean; kill?: boolean }) {
  const fit = useToolbarFit();
  return (
    <div aria-label="Tools" ref={fit} role="toolbar">
      {field && <input className="grow" />}
      <QuietAction icon={Play} label="Start web" onClick={() => undefined} word="Start" />
      <QuietAction icon={Square} label="Stop web" onClick={() => undefined} word="Stop" />
      {kill && (
        <QuietAction
          danger
          icon={Skull}
          keepWord
          label="Kill process 42"
          onClick={() => undefined}
          word="Kill"
        />
      )}
    </div>
  );
}

const bar = (container: HTMLElement) => container.querySelector('[role="toolbar"]') as HTMLElement;
const tips = (container: HTMLElement) =>
  [...container.querySelectorAll<HTMLElement>('.pane-act')].map((tool) => tool.dataset.tooltip);

/** Stands in for the browser's ResizeObserver; the function it returns reports a resize. */
function stubResizes(): () => void {
  const callbacks: (() => void)[] = [];
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        callbacks.push(callback);
      }
      observe(): void {}
      disconnect(): void {}
    }
  );
  return () => {
    for (const callback of callbacks) callback();
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('useToolbarFit', () => {
  it('keeps every word while the tools fit on the line', () => {
    layout(() => 2 * WORDED);
    const { container } = render(<Bar />);

    expect(bar(container).hasAttribute('data-tool-fit')).toBe(true);
    expect(bar(container).hasAttribute('data-tight')).toBe(false);
    expect(tips(container)).toEqual([undefined, undefined]);
  });

  it('steps every tool to its glyph when the words do not fit, each word its tooltip and name kept', () => {
    layout(() => 2 * WORDED - 1);
    const { container } = render(<Bar />);

    expect(bar(container).dataset.tight).toBe('');
    expect(tips(container)).toEqual(['Start', 'Stop']);
    // The word stays in the button for assistive technology.
    expect(container.querySelector('.pane-act-word')?.textContent).toBe('Start');
    expect(container.querySelector('.pane-act')?.getAttribute('aria-label')).toBe('Start web');
  });

  it('steps back, taking back the tooltips it gave, when the room returns', () => {
    const resize = stubResizes();
    let room = 100;
    layout(() => room);
    const { container } = render(<Bar />);
    expect(bar(container).dataset.tight).toBe('');

    room = 400;
    resize();
    expect(bar(container).hasAttribute('data-tight')).toBe(false);
    expect(tips(container)).toEqual([undefined, undefined]);
  });

  it('refits when a tool joins the bar', async () => {
    layout(() => 2 * WORDED);
    const { container, rerender } = render(<Bar />);
    expect(bar(container).hasAttribute('data-tight')).toBe(false);

    rerender(<Bar kill />);
    await Promise.resolve();
    expect(bar(container).dataset.tight).toBe('');
  });

  it('counts another item at its full size, not the size it would shrink to', () => {
    // Shrunk, the field would leave room for both words (60 + 160 = 220).
    layout(() => 230);
    const { container } = render(<Bar field />);

    expect(bar(container).dataset.tight).toBe('');
    // The field's own shrink is given back after the measure.
    expect((container.querySelector('.grow') as HTMLElement).style.flexShrink).toBe('');
  });

  it('keeps a keepWord tool worded until the other tools stepping is not enough', () => {
    const resize = stubResizes();
    let room = 2 * GLYPH + WORDED;
    layout(() => room);
    const { container } = render(<Bar kill />);

    expect(bar(container).dataset.tight).toBe('');
    expect(tips(container)).toEqual(['Start', 'Stop', undefined]);

    room = 3 * GLYPH;
    resize();
    expect(bar(container).dataset.tight).toBe('all');
    expect(tips(container)).toEqual(['Start', 'Stop', 'Kill']);
  });

  it('leaves a tool’s own tooltip as it is', () => {
    layout(() => 10);
    function Own() {
      const fit = useToolbarFit();
      return (
        <div ref={fit} role="toolbar">
          <QuietAction
            icon={Play}
            label="Start web"
            onClick={() => undefined}
            tip="Starts the web server"
            word="Start"
          />
        </div>
      );
    }
    const { container } = render(<Own />);

    expect(bar(container).dataset.tight).toBe('');
    expect(tips(container)).toEqual(['Starts the web server']);
  });
});
