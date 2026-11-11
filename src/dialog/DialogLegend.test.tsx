import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { DialogLegend } from './DialogLegend.js';

describe('DialogLegend', () => {
  it('runs the leave slot through onLeave and each other slot through its own verb', () => {
    const onLeave = vi.fn();
    const onBack = vi.fn();
    const onSave = vi.fn();

    render(
      <DialogLegend
        legend={{
          leave: { label: 'Cancel' },
          secondary: [{ label: 'Back', chord: { key: '[', meta: true }, onRun: onBack }],
          primary: { label: 'Save', onRun: onSave }
        }}
        onLeave={onLeave}
      />
    );

    for (const name of ['Cancel', 'Back', 'Save']) {
      fireEvent.click(screen.getByRole('button', { name }));
    }

    expect([onLeave, onBack, onSave].map((run) => run.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('keeps the focus where it was when a slot is pressed', () => {
    render(
      <DialogLegend legend={{ primary: { label: 'Save', onRun: vi.fn() } }} onLeave={vi.fn()} />
    );

    // A prevented mousedown is what stops the browser moving the focus.
    expect(fireEvent.mouseDown(screen.getByRole('button', { name: 'Save' }))).toBe(false);
  });
  it('marks a destructive secondary verb and no other slot', () => {
    render(
      <DialogLegend
        legend={{
          leave: { label: 'Cancel' },
          secondary: [
            {
              label: 'Delete…',
              chord: { key: 'Backspace', meta: true },
              onRun: vi.fn(),
              danger: true
            }
          ],
          primary: { label: 'Save', onRun: vi.fn() }
        }}
        onLeave={vi.fn()}
      />
    );

    expect(
      ['Cancel', 'Delete…', 'Save'].map((name) =>
        screen.getByRole('button', { name }).classList.contains('legend-danger')
      )
    ).toEqual([false, true, false]);
  });
});

describe('the dialog legend look', () => {
  const legendMarkup = (tone: string, disabled = false): void => {
    document.body.innerHTML = `<div class="dialog" data-tone="${tone}">
      <div class="dialog-legend">
        <button class="legend-slot"><span class="legend-slot-key"><kbd class="keychord">esc</kbd></span>Cancel</button>
        <button class="legend-slot legend-primary"${disabled ? ' disabled' : ''}><span class="legend-slot-key"><kbd class="keychord">↩</kbd></span>Delete</button>
      </div>
    </div>`;
  };

  it('draws each chord as a plain key cap and lights the primary in the tone', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    legendMarkup('accent');
    const [leaveCap, primaryCap] = [...document.querySelectorAll('.keychord')];

    expect(declaredValues(leaveCap as Element, 'background').at(-1)).toBe('var(--surface)');
    // The key cap's thicker foot.
    expect(declaredValues(leaveCap as Element, 'border-bottom-width').at(-1)).toBe(
      'var(--line-strong)'
    );
    expect(declaredValues(primaryCap as Element, 'background').at(-1)).toBe('var(--accent)');

    legendMarkup('danger');
    expect(
      declaredValues(document.querySelectorAll('.keychord')[1] as Element, 'background').at(-1)
    ).toBe('var(--danger)');
    document.body.innerHTML = '';
  });

  it('writes a destructive primary in the danger text colour, its glyph legible on the red cap', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    legendMarkup('danger');
    const primary = document.querySelector('.legend-primary') as Element;
    const cap = primary.querySelector('.keychord') as Element;

    expect(declaredValues(primary, 'color').at(-1)).toBe('var(--danger-text)');
    expect(declaredValues(cap, 'color').at(-1)).toBe('var(--on-danger)');
    document.body.innerHTML = '';
  });
  it("darkens a lit cap's foot with the fixed shade in either tone, never toward the ground", () => {
    applyStylesheets(readStylesheet('src/styles.css'));

    for (const tone of ['accent', 'danger']) {
      legendMarkup(tone);
      const cap = document.querySelector('.legend-primary .keychord') as Element;

      expect(declaredValues(cap, 'border-bottom-color').at(-1)).toBe('var(--key-foot-shade)');
    }

    document.body.innerHTML = '';
  });

  it('writes a destructive secondary verb in the danger text colour', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML = `<div class="dialog-legend">
      <button class="legend-slot legend-danger"><span class="legend-slot-key"><kbd class="keychord">⌘⌫</kbd></span>Delete…</button>
    </div>`;

    expect(
      declaredValues(document.querySelector('.legend-danger') as Element, 'color').at(-1)
    ).toBe('var(--danger-text)');
    document.body.innerHTML = '';
  });
});
