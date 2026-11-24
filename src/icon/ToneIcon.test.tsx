import { render, screen } from '@testing-library/react';
import { ArrowUpCircle } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { ToneIcon } from './ToneIcon.js';

describe('ToneIcon', () => {
  it('is decorative beside words that say the same', () => {
    const { container } = render(<ToneIcon icon={ArrowUpCircle} tone="warning" />);
    const icon = container.querySelector('.tone-icon') as HTMLElement;

    expect(icon.dataset.tone).toBe('warning');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(icon.hasAttribute('role')).toBe(false);
    expect(icon.hasAttribute('data-tooltip')).toBe(false);
  });

  it('stands alone as an image named by its label, which is its tooltip too', () => {
    render(<ToneIcon icon={ArrowUpCircle} label="Update available" tone="accent" />);
    const icon = screen.getByRole('img', { name: 'Update available' });

    expect(icon.dataset.tone).toBe('accent');
    expect(icon.dataset.tooltip).toBe('Update available');
    expect(icon.hasAttribute('aria-hidden')).toBe(false);
  });
});
