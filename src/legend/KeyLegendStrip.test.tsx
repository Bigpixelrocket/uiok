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
});
