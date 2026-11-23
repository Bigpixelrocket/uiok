import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { KeyChords } from './KeyChord.js';

describe('KeyChords', () => {
  it('parts two chords by "or", drawn and read between their names', () => {
    const { container } = render(
      <KeyChords
        chords={[
          { key: 'n', meta: true, shift: true },
          { key: 'n', meta: true }
        ]}
      />
    );

    const chords = container.querySelectorAll('kbd');
    const spoken = [...(container.firstElementChild?.childNodes ?? [])]
      .map((node) =>
        node instanceof HTMLElement && node.tagName === 'KBD'
          ? node.getAttribute('aria-label')
          : node.textContent
      )
      .filter((part) => part?.trim() !== '');

    expect(chords).toHaveLength(2);
    expect(spoken).toEqual(['Shift Command N', 'or', 'Command N']);
  });

  it('reads as one sentence inside a control: each chord in words, "or" between', () => {
    render(
      <button type="button">
        <KeyChords
          chords={[
            { key: 'n', meta: true, shift: true },
            { key: 'n', meta: true }
          ]}
        />{' '}
        New Window
      </button>
    );

    expect(
      screen.getByRole('button', { name: 'Shift Command N or Command N New Window' })
    ).toBeTruthy();
    // Each chord is named where it may carry a name: an image of its caps.
    expect(screen.getAllByRole('img').map((chord) => chord.tagName)).toEqual(['KBD', 'KBD']);
  });

  it('draws nothing for no chords', () => {
    const { container } = render(<KeyChords chords={[]} />);

    expect(container.innerHTML).toBe('');
  });

  it('draws one chord alone, and takes the word from the key labels', () => {
    const { container, rerender } = render(<KeyChords chords={[{ key: 'k', meta: true }]} />);

    expect(container.querySelector('.keychords-or')).toBeNull();

    rerender(
      <UiokProvider labels={{ keys: { or: 'oder' } }}>
        <KeyChords chords={[{ key: 'k', meta: true }, { key: 'F1' }]} tone="accent" />
      </UiokProvider>
    );

    expect(screen.getByText('oder').className).toBe('keychords-or');
    expect(container.querySelectorAll('kbd[data-tone="accent"]')).toHaveLength(2);
  });
});
