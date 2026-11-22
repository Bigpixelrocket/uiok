import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { UiokProvider } from '../labels/UiokProvider.js';
import type { LegendPair } from './KeyLegend.logic.js';
import { KeyLegendStrip, type LegendVerb } from './KeyLegendStrip.js';

const PAIR_LABELS: Readonly<Record<string, string>> = { upDown: 'Up/Down' };
const pairLabel = (pair: LegendPair): string => PAIR_LABELS[pair] ?? pair;

const verb = (label: string, chord: LegendVerb['chord'], pair?: LegendPair): LegendVerb => ({
  label,
  chord,
  run: vi.fn(),
  ...(pair === undefined ? {} : { pair })
});

const verbs = (): LegendVerb[] => [
  verb('Move Up', { key: 'ArrowUp' }, 'upDown'),
  verb('Move Down', { key: 'ArrowDown' }, 'upDown'),
  verb('Copy', { key: 'c', meta: true })
];

describe('KeyLegendStrip', () => {
  it('lists each verb as a button named by its chord and label, out of the Tab order', () => {
    render(<KeyLegendStrip pairLabel={pairLabel} verbs={verbs()} />);

    const strip = screen.getByRole('contentinfo', { name: 'Keyboard shortcuts' });
    const group = within(strip).getByRole('group', { name: 'Verbs' });
    const copy = within(group).getByRole('button', { name: 'Command C Copy' });

    expect(copy.tabIndex).toBe(-1);
    expect(within(group).getAllByRole('button')).toHaveLength(3);
  });

  it('folds a pair into one place: a button per key cap and one shared label', () => {
    render(<KeyLegendStrip pairLabel={pairLabel} verbs={verbs()} />);

    const up = screen.getByRole('button', { name: 'Up Move Up' });
    const pair = up.closest('.keylegend-pair') as HTMLElement;

    expect(pair).not.toBeNull();
    expect(within(pair).getByRole('button', { name: 'Down Move Down' })).toBeTruthy();
    expect(pair.querySelector('.keylegend-pair-label')?.textContent).toBe('Up/Down');
    expect(up.dataset.tooltip).toBe('Move Up');
    expect(up.dataset.tooltipShortcut).toBe('↑');
  });

  it('keeps every verb in a place of its own without pair labels', () => {
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);

    expect(container.querySelector('.keylegend-pair')).toBeNull();
    expect(screen.getByRole('button', { name: 'Up Move Up' }).className).toBe('');
  });

  it('runs a verb on click and leaves the focus where it was', () => {
    const list = verbs();
    render(
      <>
        <input aria-label="Field" />
        <KeyLegendStrip pairLabel={pairLabel} verbs={list} />
      </>
    );
    const field = screen.getByRole('textbox', { name: 'Field' });
    field.focus();

    const copy = screen.getByRole('button', { name: 'Command C Copy' });
    const pressed = fireEvent.mouseDown(copy);
    fireEvent.click(copy);
    fireEvent.click(screen.getByRole('button', { name: 'Down Move Down' }));

    expect(pressed).toBe(false);
    expect(list[2]?.run).toHaveBeenCalledOnce();
    expect(list[1]?.run).toHaveBeenCalledOnce();
    expect(list[0]?.run).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(field);
  });

  it('lights each held modifier in the dock and lets go of all on blur', () => {
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);
    const held = (): number => container.querySelectorAll('.keylegend-key.held').length;

    expect(container.querySelector('.keylegend-dock-fn')?.textContent).toBe('fn');
    expect(held()).toBe(0);

    act(() => {
      fireEvent.keyDown(window, { key: 'Meta', metaKey: true, shiftKey: true });
    });
    expect(held()).toBe(2);

    act(() => {
      fireEvent.keyUp(window, { key: 'Shift', metaKey: true });
    });
    expect(held()).toBe(1);

    act(() => {
      fireEvent.blur(window);
    });
    expect(held()).toBe(0);
  });

  it('speaks its chrome in the words a provider supplies', () => {
    render(
      <UiokProvider
        labels={{
          keys: { names: { ArrowUp: 'Hoch' } },
          legend: {
            label: 'Tastenkürzel',
            verbs: 'Befehle',
            capName: (chord, verb) => `${verb} (${chord})`
          }
        }}
      >
        <KeyLegendStrip pairLabel={() => 'Hoch/Runter'} verbs={verbs()} />
      </UiokProvider>
    );

    const strip = screen.getByRole('contentinfo', { name: 'Tastenkürzel' });

    expect(within(strip).getByRole('group', { name: 'Befehle' })).toBeTruthy();
    expect(within(strip).getByRole('button', { name: 'Move Up (Hoch)' })).toBeTruthy();
    expect(strip.querySelector('.keylegend-pair-label')?.textContent).toBe('Hoch/Runter');
  });

  it('fills a held dock key with the accent, outside any listing scope', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);

    act(() => {
      fireEvent.keyDown(window, { key: 'Alt', altKey: true });
    });
    const key = container.querySelector('.keylegend-key.held') as HTMLElement;

    expect(declaredValues(key, 'background')).toContain('var(--accent)');
    expect(declaredValues(key, 'color')).toContain('var(--on-accent)');
  });

  it('gives a single place a tooltip naming its verb and chord', () => {
    render(<KeyLegendStrip verbs={verbs()} />);

    const copy = screen.getByRole('button', { name: 'Command C Copy' });

    expect(copy.dataset.tooltip).toBe('Copy');
    expect(copy.dataset.tooltipShortcut).toBe('⌘C');
  });

  it('draws no overflow chip by default', () => {
    const { container } = render(<KeyLegendStrip verbs={verbs()} />);

    expect(container.querySelector('.keylegend-more')).toBeNull();
  });

  describe('with overflow="more"', () => {
    const many = (): LegendVerb[] => [
      verb('Open', { key: 'Enter' }),
      verb('Copy', { key: 'c', meta: true }),
      verb('Delete', { key: 'Backspace', meta: true }),
      verb('Refresh', { key: 'r', meta: true })
    ];

    /** Lays the strip out as if the last `count` places wrapped off the line. */
    const wrapLast = (count: number): (() => void) => {
      const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetTop');
      Object.defineProperty(HTMLElement.prototype, 'offsetTop', {
        configurable: true,
        get(this: HTMLElement) {
          const row = this.parentElement;
          if (row?.classList.contains('keylegend-verbs') !== true) {
            return 0;
          }
          const at = [...row.children].indexOf(this);
          return at >= row.children.length - count ? 24 : 0;
        }
      });
      return () => {
        if (original !== undefined) {
          Object.defineProperty(HTMLElement.prototype, 'offsetTop', original);
        }
      };
    };

    it('keeps a hidden, disabled chip while every place fits', () => {
      const { container } = render(<KeyLegendStrip overflow="more" verbs={many()} />);
      const chip = container.querySelector('.keylegend-more') as HTMLButtonElement;

      expect(chip.disabled).toBe(true);
      expect(chip.dataset.empty).toBe('true');
      expect(chip.getAttribute('aria-hidden')).toBe('true');
    });

    it('counts the places that wrapped and lists their verbs with chords', () => {
      const restore = wrapLast(2);
      try {
        const list = many();
        render(
          <>
            <input aria-label="Field" />
            <KeyLegendStrip overflow="more" verbs={list} />
          </>
        );
        const field = screen.getByRole('textbox', { name: 'Field' });
        field.focus();

        const chip = screen.getByRole('button', { name: '2 more shortcuts' });
        expect(fireEvent.mouseDown(chip)).toBe(false);
        expect(chip.textContent).toBe('+2');
        expect(chip.getAttribute('aria-haspopup')).toBe('menu');

        fireEvent.click(chip);
        const menu = screen.getByRole('menu', { name: '2 more shortcuts' });
        const items = within(menu).getAllByRole('menuitem');

        expect(items.map((item) => item.querySelector('.row-name')?.textContent)).toEqual([
          'Delete',
          'Refresh'
        ]);
        expect(chip.getAttribute('aria-expanded')).toBe('true');
        expect(document.activeElement).toBe(menu);

        fireEvent.keyDown(menu, { key: 'ArrowDown' });
        fireEvent.keyDown(menu, { key: 'Enter' });

        expect(list[3]?.run).toHaveBeenCalledOnce();
        expect(screen.queryByRole('menu')).toBeNull();
        expect(document.activeElement).toBe(field);
      } finally {
        restore();
      }
    });

    it('opens its list above the chip, ending at its right edge', () => {
      applyStylesheets(readStylesheet('src/styles.css'));
      const restore = wrapLast(1);
      try {
        render(<KeyLegendStrip overflow="more" verbs={many()} />);

        fireEvent.click(screen.getByRole('button', { name: '1 more shortcut' }));
        const menu = screen.getByRole('menu');

        expect(getComputedStyle(menu).top).toBe('auto');
        expect(getComputedStyle(menu).left).toBe('auto');
        expect(getComputedStyle(menu).right).toBe('0px');
      } finally {
        restore();
      }
    });

    it("ends its list at the chip's left edge right to left", () => {
      applyStylesheets(readStylesheet('src/styles.css'));
      const restore = wrapLast(1);
      try {
        render(
          <div dir="rtl">
            <KeyLegendStrip overflow="more" verbs={many()} />
          </div>
        );

        fireEvent.click(screen.getByRole('button', { name: '1 more shortcut' }));
        const menu = screen.getByRole('menu');

        expect(getComputedStyle(menu).left).toBe('0px');
        expect(getComputedStyle(menu).right).toBe('auto');
      } finally {
        restore();
      }
    });

    it('closes its list on Escape without running anything', () => {
      const restore = wrapLast(1);
      try {
        const list = many();
        render(
          <>
            <input aria-label="Field" />
            <KeyLegendStrip overflow="more" verbs={list} />
          </>
        );
        const field = screen.getByRole('textbox', { name: 'Field' });
        field.focus();

        const chip = screen.getByRole('button', { name: '1 more shortcut' });
        fireEvent.click(chip);
        fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

        expect(screen.queryByRole('menu')).toBeNull();
        expect(
          list.every((entry) => !(entry.run as ReturnType<typeof vi.fn>).mock.calls.length)
        ).toBe(true);
        expect(document.activeElement).toBe(field);
      } finally {
        restore();
      }
    });

    it('runs a folded verb on click', () => {
      const restore = wrapLast(1);
      try {
        const list = many();
        render(<KeyLegendStrip overflow="more" verbs={list} />);

        fireEvent.click(screen.getByRole('button', { name: '1 more shortcut' }));
        fireEvent.click(screen.getByRole('menuitem', { name: 'Command R Refresh' }));

        expect(list[3]?.run).toHaveBeenCalledOnce();
      } finally {
        restore();
      }
    });
  });
});
