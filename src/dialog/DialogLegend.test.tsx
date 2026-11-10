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

    expect(declaredValues(leaveCap as Element, 'border')).toContain(
      'var(--line) solid var(--border-strong)'
    );
    expect(declaredValues(primaryCap as Element, 'background').at(-1)).toBe('var(--accent)');

    legendMarkup('danger');
    expect(
      declaredValues(document.querySelectorAll('.keychord')[1] as Element, 'background').at(-1)
    ).toBe('var(--danger)');
    document.body.innerHTML = '';
  });

  it('leaves a disabled slot out of the hover wash', () => {
    const hover = readStylesheet('src/dialog/dialog.css').match(/^\.legend-slot:hover[^{]*/m);

    expect(hover?.[0].trim()).toBe('.legend-slot:hover:enabled');
  });
});
