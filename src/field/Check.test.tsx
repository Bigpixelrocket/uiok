import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Check } from './Check.js';

describe('Check', () => {
  it('shows some-but-not-all as the indeterminate state', () => {
    const { rerender } = render(<Check aria-label="All" checked="mixed" onChange={() => {}} />);
    const box = screen.getByRole('checkbox', { name: 'All' }) as HTMLInputElement;

    expect(box.indeterminate).toBe(true);
    expect(box.checked).toBe(false);
    expect(box.getAttribute('aria-checked')).toBe('mixed');
    expect(box.className).toBe('check');

    rerender(<Check aria-label="All" checked onChange={() => {}} />);
    expect(box.indeterminate).toBe(false);
    expect(box.checked).toBe(true);
    expect(box.hasAttribute('aria-checked')).toBe(false);
  });

  it('keeps a class of its own beside the shared look', () => {
    render(<Check aria-label="Row" checked={false} className="row-check" onChange={() => {}} />);

    expect(screen.getByRole('checkbox', { name: 'Row' }).className).toBe('check row-check');
  });
});
