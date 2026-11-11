import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { UiokProvider } from '../labels/UiokProvider.js';
import { DateTimePicker } from './DateTimePicker.js';
import { formatPicker } from './DateTimePicker.logic.js';

const open = (label: string): void => {
  fireEvent.click(screen.getByRole('button', { name: label }));
};

describe('DateTimePicker', () => {
  it('opens on the value’s month, the week from its first day, and picks a day, closing for a date', () => {
    const onChange = vi.fn();

    render(
      <DateTimePicker
        kind="date"
        label="Pick the due date"
        onChange={onChange}
        value="2026-10-30"
      />
    );
    open('Pick the due date');

    const panel = screen.getByRole('dialog', { name: 'October 2026' });

    expect(panel.hasAttribute('data-overlay')).toBe(true);
    expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('Mon');
    expect(screen.getByRole('gridcell', { name: '30', selected: true })).toBeDefined();

    fireEvent.click(screen.getByRole('gridcell', { name: '12' }));
    expect(onChange).toHaveBeenCalledWith('2026-10-12');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('steps months and closes on Escape and Done', () => {
    render(
      <DateTimePicker
        firstDay={7}
        kind="date"
        label="Pick"
        onChange={() => undefined}
        value="2026-10-30"
      />
    );
    open('Pick');
    expect(screen.getAllByRole('columnheader')[0]?.textContent).toBe('Sun');
    fireEvent.click(screen.getByRole('button', { name: 'Next month' }));
    expect(screen.getByRole('dialog', { name: 'November 2026' })).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    fireEvent.click(screen.getByRole('button', { name: 'Previous month' }));
    expect(screen.getByRole('dialog', { name: 'September 2026' })).toBeDefined();

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    open('Pick');
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('writes a date and time in ISO form by default, or as `format` writes it', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateTimePicker
        fraction={3}
        kind="datetime"
        label="Pick"
        onChange={onChange}
        value="2026-10-30 14:05:09.250"
      />
    );

    open('Pick');
    fireEvent.change(screen.getByRole('spinbutton', { name: 'Hour' }), {
      target: { value: '9' }
    });
    expect(onChange).toHaveBeenLastCalledWith('2026-10-30T09:05:09.250');
    expect((screen.getByRole('textbox', { name: 'Millisecond' }) as HTMLInputElement).value).toBe(
      '250'
    );

    rerender(
      <DateTimePicker
        format={(kind, parts, fraction) => formatPicker(kind, parts, fraction, ' ')}
        fraction={6}
        kind="datetime"
        label="Pick"
        onChange={onChange}
        value="2026-10-30 14:05:09.250"
      />
    );
    expect(screen.getByRole('textbox', { name: 'Microsecond' })).toBeDefined();
    // October's 1st, before November's at the grid's end.
    fireEvent.click(screen.getAllByRole('gridcell', { name: '1' })[0] as HTMLElement);
    expect(onChange).toHaveBeenLastCalledWith('2026-10-01 14:05:09.250000');
    // A datetime stays open after a day, for its time.
    expect(screen.getByRole('dialog')).toBeDefined();
  });

  it('widens a fraction field past three digits to its digit count, and keeps a shorter one at 6ch or more', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { rerender } = render(
      <DateTimePicker fraction={6} kind="time" label="Pick" onChange={() => undefined} value="" />
    );

    open('Pick');
    const micro = screen.getByRole('textbox', { name: 'Microsecond' });

    expect(micro.style.getPropertyValue('--date-picker-digits')).toBe('6');
    // declaredValues lists rules in source order, not by weight; the picker's
    // rule outweighs the shared field's later `min-width: 0` by its scope.
    expect(declaredValues(micro, 'min-width')).toContain(
      'calc((var(--date-picker-digits) + 1) * 1ch + 2 * var(--space-4) + 2px)'
    );

    rerender(
      <DateTimePicker fraction={3} kind="time" label="Pick" onChange={() => undefined} value="" />
    );
    const milli = screen.getByRole('textbox', { name: 'Millisecond' });

    expect(milli.style.getPropertyValue('--date-picker-digits')).toBe('');
    expect(declaredValues(milli, 'min-width')).toContain('6ch');
    expect(declaredValues(milli, 'min-width')).not.toContain(
      'calc((var(--date-picker-digits) + 1) * 1ch + 2 * var(--space-4) + 2px)'
    );
    expect(declaredValues(screen.getByRole('spinbutton', { name: 'Hour' }), 'min-width')).toContain(
      '6ch'
    );
  });

  it('marks today, zero-pads the time fields, and opens a panel placed in the window', () => {
    render(
      <DateTimePicker
        kind="datetime"
        label="Pick"
        onChange={() => undefined}
        value="2026-10-30 09:05:00"
      />
    );

    open('Pick');
    const today = new Date();
    const marked = document.querySelector('.date-picker-day.today');

    // October 2026 is shown; today is marked only when it falls in the grid.
    if (marked !== null) {
      expect(marked.getAttribute('aria-current')).toBe('date');
      expect(marked.textContent).toBe(String(today.getDate()));
    }
    expect((screen.getByRole('spinbutton', { name: 'Hour' }) as HTMLInputElement).value).toBe('09');
    expect((screen.getByRole('spinbutton', { name: 'Minute' }) as HTMLInputElement).value).toBe(
      '05'
    );
    expect((screen.getByRole('spinbutton', { name: 'Second' }) as HTMLInputElement).value).toBe(
      '00'
    );
    // jsdom lays nothing out, but the panel is measured and placed, never left hidden.
    expect(screen.getByRole('dialog').style.visibility).toBe('');
  });

  it('shows only the time fields for a time, named by them', () => {
    render(
      <DateTimePicker kind="time" label="Pick the time" onChange={() => undefined} value="08:30" />
    );
    open('Pick the time');

    expect(screen.queryByRole('grid')).toBeNull();
    expect((screen.getByRole('spinbutton', { name: 'Minute' }) as HTMLInputElement).value).toBe(
      '30'
    );
    expect(screen.getByRole('button', { name: 'Now' })).toBeDefined();
  });

  it('says its hint on hover, its label without one', () => {
    const { rerender } = render(
      <DateTimePicker kind="date" label="Pick" onChange={() => undefined} value="" />
    );

    expect(screen.getByRole('button', { name: 'Pick' }).getAttribute('data-tooltip')).toBe('Pick');
    rerender(
      <DateTimePicker
        hint="Type any other value"
        kind="date"
        label="Pick"
        onChange={() => undefined}
        value=""
      />
    );
    expect(screen.getByRole('button', { name: 'Pick' }).getAttribute('data-tooltip')).toBe(
      'Type any other value'
    );
  });

  it('reads the value with `parse`, and writes month names in the labels’ locale', () => {
    render(
      <UiokProvider labels={{ dateTime: { locale: 'de-DE', done: 'Fertig' } }}>
        <DateTimePicker
          kind="date"
          label="Pick"
          onChange={() => undefined}
          parse={(value) => {
            const [day, month, year] = value.split('.').map(Number);

            return {
              year: year ?? 0,
              month: month ?? 1,
              day: day ?? 1,
              hour: 0,
              minute: 0,
              second: 0,
              fraction: ''
            };
          }}
          value="03.03.2026"
        />
      </UiokProvider>
    );
    open('Pick');

    expect(screen.getByRole('dialog', { name: 'März 2026' })).toBeDefined();
    expect(screen.getByRole('gridcell', { name: '3', selected: true })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Fertig' })).toBeDefined();
  });

  it('closes on a pointer outside it', () => {
    render(
      <>
        <button type="button">Elsewhere</button>
        <DateTimePicker kind="date" label="Pick" onChange={() => undefined} value="2026-10-30" />
      </>
    );
    open('Pick');
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Elsewhere' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
