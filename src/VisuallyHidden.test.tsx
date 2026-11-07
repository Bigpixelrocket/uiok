import { render, screen } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import { VisuallyHidden } from './VisuallyHidden.js';

describe('VisuallyHidden', () => {
  it('renders its text in a span with the visually-hidden class', () => {
    render(<VisuallyHidden>Close dialog</VisuallyHidden>);
    const text = screen.getByText('Close dialog');
    expect(text.tagName).toBe('SPAN');
    expect(text.className).toBe('visually-hidden');
  });

  it('labels a control it sits inside', () => {
    render(
      <button type="button">
        <svg aria-hidden="true" />
        <VisuallyHidden>Close dialog</VisuallyHidden>
      </button>
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeDefined();
  });

  it('passes span attributes through, so another element can name it by id', () => {
    render(
      <VisuallyHidden id="hint" aria-live="polite">
        Between 1 and 65535
      </VisuallyHidden>
    );
    const text = screen.getByText('Between 1 and 65535');
    expect(text.id).toBe('hint');
    expect(text.getAttribute('aria-live')).toBe('polite');
  });

  it('keeps the visually-hidden class beside a className passed in', () => {
    render(<VisuallyHidden className="extra">Saved</VisuallyHidden>);
    expect(screen.getByText('Saved').className).toBe('visually-hidden extra');
  });

  it('forwards its ref to the span', () => {
    const ref = createRef<HTMLSpanElement>();
    render(<VisuallyHidden ref={ref}>Loading</VisuallyHidden>);
    expect(ref.current).toBe(screen.getByText('Loading'));
  });
});
