import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { InRowContext } from '../pane/PaneActions.js';
import { Switch } from './Switch.js';

describe('Switch', () => {
  it('turns on from a press on its words, reporting the state asked for', () => {
    const onChange = vi.fn();

    render(<Switch checked={false} label="Sharing" onChange={onChange} />);
    fireEvent.click(screen.getByText('Sharing'));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Sharing' }).className).toBe('switch');
  });

  it('in a row, speaks its label alone and leaves the Tab order for the row’s keys', () => {
    render(
      <InRowContext value>
        <Switch checked label="Run PostgreSQL" labelHidden onChange={() => {}} verb="toggle" />
      </InRowContext>
    );
    const control = screen.getByRole('switch', { name: 'Run PostgreSQL' }) as HTMLInputElement;

    expect(control.checked).toBe(true);
    expect(control.tabIndex).toBe(-1);
    expect(control.getAttribute('data-verb')).toBe('toggle');
    expect(control.closest('label')).toBeNull();
  });
});
