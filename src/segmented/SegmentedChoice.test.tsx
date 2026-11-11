import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedChoice } from './SegmentedChoice.js';

const SIZES = ['small', 'medium', 'large'] as const;

function Sizes({
  onChange,
  disabledChoices
}: {
  readonly onChange: (size: string) => void;
  readonly disabledChoices?: readonly (typeof SIZES)[number][];
}) {
  const [size, setSize] = useState<(typeof SIZES)[number]>('medium');

  return (
    <>
      <span id="size-label">Size</span>
      <SegmentedChoice
        choices={SIZES}
        labelId="size-label"
        onChange={(next) => {
          onChange(next);
          setSize(next);
        }}
        disabledChoices={disabledChoices}
        render={(choice) => choice}
        value={size}
      />
    </>
  );
}

describe('SegmentedChoice', () => {
  it('is a named radio group with one tab stop, the checked segment', () => {
    render(<Sizes onChange={() => undefined} />);

    expect(screen.getByRole('radiogroup', { name: 'Size' })).toBeDefined();
    const medium = screen.getByRole('radio', { name: 'medium' });
    expect(medium.getAttribute('aria-checked')).toBe('true');
    expect(medium.tabIndex).toBe(0);
    expect(screen.getByRole('radio', { name: 'small' }).tabIndex).toBe(-1);
  });

  it('moves the choice and the focus with the arrow keys, wrapping at the ends', () => {
    const onChange = vi.fn();
    render(<Sizes onChange={onChange} />);

    fireEvent.keyDown(screen.getByRole('radio', { name: 'medium' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('large');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'large' }));

    fireEvent.keyDown(screen.getByRole('radio', { name: 'large' }), { key: 'ArrowDown' });
    expect(onChange).toHaveBeenLastCalledWith('small');

    fireEvent.keyDown(screen.getByRole('radio', { name: 'small' }), { key: 'ArrowUp' });
    expect(onChange).toHaveBeenLastCalledWith('large');
  });

  it('says nothing when the chosen segment is pressed again', () => {
    const onChange = vi.fn();
    render(<Sizes onChange={onChange} />);

    fireEvent.click(screen.getByRole('radio', { name: 'medium' }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: 'small' }));
    expect(onChange).toHaveBeenCalledWith('small');
  });

  it('passes over a disabled choice with the arrow keys and ignores a click on it', () => {
    const onChange = vi.fn();
    render(<Sizes disabledChoices={['large']} onChange={onChange} />);

    const large = screen.getByRole('radio', { name: 'large' }) as HTMLButtonElement;
    expect(large.disabled).toBe(true);

    fireEvent.click(large);
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.keyDown(screen.getByRole('radio', { name: 'medium' }), { key: 'ArrowRight' });
    expect(onChange).toHaveBeenLastCalledWith('small');
    expect(document.activeElement).toBe(screen.getByRole('radio', { name: 'small' }));
  });
});
