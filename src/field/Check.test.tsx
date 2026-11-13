import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
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

  it('stays mixed after a click its owner answers by keeping it mixed', () => {
    const { rerender } = render(<Check aria-label="All" checked="mixed" onChange={() => {}} />);
    const box = screen.getByRole('checkbox', { name: 'All' }) as HTMLInputElement;

    // The browser clears indeterminate when the box is clicked; the owner
    // keeps the value, so nothing about the props changes.
    fireEvent.click(box);
    expect(box.indeterminate).toBe(true);
    expect(box.checked).toBe(false);

    rerender(<Check aria-label="All" checked="mixed" onChange={() => {}} />);
    expect(box.indeterminate).toBe(true);
    expect(box.getAttribute('aria-checked')).toBe('mixed');
  });

  it('leaves mixed when its owner answers a click by checking it', () => {
    function Owner() {
      const [state, setState] = useState<boolean | 'mixed'>('mixed');

      return <Check aria-label="All" checked={state} onChange={() => setState(true)} />;
    }

    render(<Owner />);
    const box = screen.getByRole('checkbox', { name: 'All' }) as HTMLInputElement;

    fireEvent.click(box);
    expect(box.indeterminate).toBe(false);
    expect(box.checked).toBe(true);
    expect(box.hasAttribute('aria-checked')).toBe(false);
  });

  it('keeps a class of its own beside the shared look', () => {
    render(<Check aria-label="Row" checked={false} className="row-check" onChange={() => {}} />);

    expect(screen.getByRole('checkbox', { name: 'Row' }).className).toBe('check row-check');
  });
});
