import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { SelectAllBar } from './SelectAllBar.js';

const checkbox = (): HTMLInputElement =>
  screen.getByRole('checkbox', { name: 'Check all' }) as HTMLInputElement;

describe('SelectAllBar', () => {
  it('is a toolbar with Check all, the count of checked rows, and the bulk actions', () => {
    render(
      <SelectAllBar checked={2} onCheckAll={() => undefined} total={3}>
        <button type="button">Delete</button>
      </SelectAllBar>
    );

    const bar = screen.getByRole('toolbar', { name: 'With selected' });

    expect(bar.textContent).toContain('2 of 3 selected');
    expect(bar.textContent).not.toContain('With selected:');
    expect(screen.getByRole('button', { name: 'Delete' })).toBeDefined();
  });

  it('ticks when every row is, mixes when some are, and clears when none are', () => {
    const { rerender } = render(
      <SelectAllBar checked={0} onCheckAll={() => undefined} total={3}>
        {null}
      </SelectAllBar>
    );

    expect([checkbox().checked, checkbox().indeterminate]).toEqual([false, false]);
    rerender(
      <SelectAllBar checked={2} onCheckAll={() => undefined} total={3}>
        {null}
      </SelectAllBar>
    );
    expect([checkbox().checked, checkbox().indeterminate]).toEqual([true, true]);
    rerender(
      <SelectAllBar checked={3} onCheckAll={() => undefined} total={3}>
        {null}
      </SelectAllBar>
    );
    expect([checkbox().checked, checkbox().indeterminate]).toEqual([true, false]);
  });

  it('checks every row unless all are, then clears them', () => {
    const onCheckAll = vi.fn();
    const { rerender } = render(
      <SelectAllBar checked={1} onCheckAll={onCheckAll} total={3}>
        {null}
      </SelectAllBar>
    );

    fireEvent.click(checkbox());
    rerender(
      <SelectAllBar checked={3} onCheckAll={onCheckAll} total={3}>
        {null}
      </SelectAllBar>
    );
    fireEvent.click(checkbox());
    expect(onCheckAll.mock.calls).toEqual([[true], [false]]);
  });

  it('is disabled with no row to check', () => {
    render(
      <SelectAllBar checked={0} onCheckAll={() => undefined} total={0}>
        {null}
      </SelectAllBar>
    );

    expect(checkbox().disabled).toBe(true);
  });

  it('takes its words from the labels provider, and its name from a prop', () => {
    render(
      <UiokProvider labels={{ selectAll: { checkAll: 'Alle auswählen' } }}>
        <SelectAllBar checked={0} label="Bulk actions" onCheckAll={() => undefined} total={2}>
          {null}
        </SelectAllBar>
      </UiokProvider>
    );

    expect(screen.getByRole('toolbar', { name: 'Bulk actions' })).toBeDefined();
    expect(screen.getByRole('checkbox', { name: 'Alle auswählen' })).toBeDefined();
  });
});
