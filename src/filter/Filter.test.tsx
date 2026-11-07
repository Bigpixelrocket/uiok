import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { FilterEscape } from './FilterEscape.js';
import { FilterIcon } from './FilterIcon.js';

describe('FilterEscape', () => {
  it('does what Escape does on a press, named and titled by its label', () => {
    const onEscape = vi.fn();
    render(<FilterEscape label="Clear filter" onEscape={onEscape} />);

    const button = screen.getByRole('button', { name: 'Clear filter' });
    fireEvent.click(button);

    expect(onEscape).toHaveBeenCalledTimes(1);
    expect(button.getAttribute('data-tooltip')).toBe('Clear filter');
    expect(button.querySelector('kbd')?.textContent).toBe('esc');
  });

  it('leaves the focus in the field it ends', () => {
    render(
      <>
        <input aria-label="Filter" />
        <FilterEscape label="Clear filter" onEscape={() => undefined} />
      </>
    );
    const field = screen.getByRole('textbox', { name: 'Filter' });
    const button = screen.getByRole('button', { name: 'Clear filter' });
    field.focus();

    // A cancelled mousedown is what keeps the browser from moving the focus.
    expect(fireEvent.mouseDown(button)).toBe(false);
    expect(button.tabIndex).toBe(-1);
    expect(document.activeElement).toBe(field);
  });
});

describe('FilterIcon', () => {
  it('is decorative', () => {
    const { container } = render(<FilterIcon />);
    const mark = container.querySelector('.filter-icon');

    expect(mark?.getAttribute('aria-hidden')).toBe('true');
    expect(mark?.querySelector('svg')).not.toBeNull();
  });
});
