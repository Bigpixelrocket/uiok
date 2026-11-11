import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TooltipLayer } from './Tooltip.js';
import { cutTooltip, describedTooltip, tooltip, TOOLTIP_DELAY_MS } from './Tooltip.logic.js';

const rest = (): void => {
  act(() => {
    vi.advanceTimersByTime(TOOLTIP_DELAY_MS);
  });
};

const shown = (): string | null => screen.queryByRole('tooltip')?.textContent ?? null;

describe('TooltipLayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    render(
      <>
        <button type="button" {...tooltip('New Tab', '⌘T')}>
          <svg data-testid="glyph" />
        </button>
        <button type="button" {...tooltip('Close Tab')}>
          x
        </button>
        <p>plain</p>
        <TooltipLayer />
      </>
    );
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens once the pointer has rested on a control, with its title and chord', () => {
    // The pointer lands on the icon inside the button, not on the button itself.
    fireEvent.mouseOver(screen.getByTestId('glyph'));
    expect(shown()).toBeNull();

    rest();

    const tip = screen.getByRole('tooltip');
    expect(tip.firstElementChild?.textContent).toBe('New Tab');
    expect(tip.querySelector('.tooltip-shortcut')?.textContent).toBe('⌘T');
  });

  it('leaves the chord out for a control without one', () => {
    fireEvent.mouseOver(screen.getByRole('button', { name: 'x' }));
    rest();

    expect(shown()).toBe('Close Tab');
    expect(screen.getByRole('tooltip').querySelector('.tooltip-shortcut')).toBeNull();
  });

  it('closes when the pointer moves off the control, and never opens for one it only crossed', () => {
    fireEvent.mouseOver(screen.getByTestId('glyph'));
    rest();
    fireEvent.mouseOver(screen.getByText('plain'));
    expect(shown()).toBeNull();

    fireEvent.mouseOver(screen.getByTestId('glyph'));
    fireEvent.mouseOver(screen.getByText('plain'));
    rest();
    expect(shown()).toBeNull();
  });

  it('closes on a press and stays away until the pointer comes back', () => {
    const button = screen.getByTestId('glyph');

    fireEvent.mouseOver(button);
    rest();
    fireEvent.mouseDown(button);
    expect(shown()).toBeNull();

    // Still on the same control: nothing reopens under a resting pointer.
    fireEvent.mouseOver(button);
    rest();
    expect(shown()).toBeNull();

    fireEvent.mouseOver(screen.getByText('plain'));
    fireEvent.mouseOver(button);
    rest();
    expect(shown()).toBe('New Tab⌘T');
  });

  it('hangs from the element in full screen, where nothing on the body is drawn', () => {
    const player = screen.getByTestId('glyph').closest('button')?.parentElement as HTMLElement;

    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => player });

    try {
      fireEvent.mouseOver(screen.getByTestId('glyph'));
      rest();
      expect(screen.getByRole('tooltip').parentElement).toBe(player);

      // Leaving full screen closes it; the next one hangs from the body again.
      Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => null });
      fireEvent(document, new Event('fullscreenchange'));
      expect(shown()).toBeNull();

      fireEvent.mouseOver(screen.getByText('plain'));
      fireEvent.mouseOver(screen.getByTestId('glyph'));
      rest();
      expect(screen.getByRole('tooltip').parentElement).toBe(document.body);
    } finally {
      Reflect.deleteProperty(document, 'fullscreenElement');
    }
  });

  it('closes when the window is resized', () => {
    fireEvent.mouseOver(screen.getByTestId('glyph'));
    rest();
    fireEvent(window, new Event('resize'));

    expect(shown()).toBeNull();
  });

  it('closes on a key and on a scroll', () => {
    fireEvent.mouseOver(screen.getByTestId('glyph'));
    rest();
    fireEvent.keyDown(document.body, { key: 'Meta' });
    expect(shown()).toBeNull();

    fireEvent.mouseOver(screen.getByText('plain'));
    fireEvent.mouseOver(screen.getByTestId('glyph'));
    rest();
    fireEvent.wheel(document.body);
    expect(shown()).toBeNull();
  });

  it('stays shut while a drag passes over a control', () => {
    fireEvent.mouseOver(screen.getByTestId('glyph'), { buttons: 1 });
    rest();

    expect(shown()).toBeNull();
  });

  it('does not open for a press that came before the pointer had rested', () => {
    fireEvent.mouseOver(screen.getByTestId('glyph'));
    fireEvent.mouseDown(screen.getByTestId('glyph'));
    rest();

    expect(shown()).toBeNull();
  });
});

describe('TooltipLayer with a chord given as data, and a tooltip only for cut text', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('draws a chord given as data with key glyphs, named in words', () => {
    render(
      <>
        <button type="button" {...tooltip('Copy Path', { key: 'c', meta: true, alt: true })}>
          copy
        </button>
        <TooltipLayer />
      </>
    );

    fireEvent.mouseOver(screen.getByRole('button', { name: 'copy' }));
    rest();

    const chord = screen.getByRole('tooltip').querySelector('.tooltip-chord kbd.keychord');
    expect(chord?.getAttribute('aria-label')).toBe('Option Command C');
    expect(chord?.querySelectorAll('.key-icon')).toHaveLength(2);
  });

  it('opens a cut tooltip only while its element cuts its text', () => {
    render(
      <>
        <span data-testid="name" {...cutTooltip('report.txt')}>
          report.txt
        </span>
        <TooltipLayer />
      </>
    );
    const name = screen.getByTestId('name');
    const widths = (scroll: number, client: number): void => {
      Object.defineProperty(name, 'scrollWidth', { configurable: true, value: scroll });
      Object.defineProperty(name, 'clientWidth', { configurable: true, value: client });
    };

    widths(60, 60);
    fireEvent.mouseOver(name);
    rest();
    expect(shown()).toBeNull();

    widths(90, 60);
    fireEvent.mouseOver(document.body);
    fireEvent.mouseOver(name);
    rest();
    expect(shown()).toBe('report.txt');
  });

  it('sets a value in monospace: one marked so, and cut text whose element is monospace', () => {
    render(
      <>
        <span data-testid="path" {...describedTooltip('/work/src/a.ts', { value: true })}>
          a.ts
        </span>
        <span
          data-testid="mono"
          style={{ fontFamily: 'Menlo, monospace' }}
          {...cutTooltip('report.txt')}
        >
          report.txt
        </span>
        <span data-testid="words" {...cutTooltip('Some words')}>
          Some words
        </span>
        <TooltipLayer />
      </>
    );
    for (const id of ['mono', 'words']) {
      Object.defineProperty(screen.getByTestId(id), 'scrollWidth', {
        configurable: true,
        value: 90
      });
    }
    const valueClass = (id: string): boolean => {
      fireEvent.mouseOver(document.body);
      fireEvent.mouseOver(screen.getByTestId(id));
      rest();
      return screen.getByRole('tooltip').classList.contains('tooltip-value');
    };

    expect(valueClass('path')).toBe(true);
    expect(valueClass('mono')).toBe(true);
    expect(valueClass('words')).toBe(false);
  });
});
