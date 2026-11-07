import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { KeyChord } from './KeyChord.js';

const caps = (chord: HTMLElement): string[] =>
  [...chord.querySelectorAll('.key')].map((key) => key.textContent ?? '');

describe('KeyChord', () => {
  it('draws each key and speaks the whole chord in English by default', () => {
    render(<KeyChord chord={{ key: 'n', meta: true, shift: true }} />);

    const chord = screen.getByLabelText('Shift Command N');
    expect(chord.tagName).toBe('KBD');
    // Shift and Command are icons; the letter is text.
    expect(caps(chord)).toEqual(['', '', 'N']);
    expect(chord.querySelectorAll('.key-icon')).toHaveLength(2);
  });

  it('prints Escape and the space bar by their key cap words', () => {
    render(
      <>
        <KeyChord chord={{ key: 'Escape' }} />
        <KeyChord chord={{ key: ' ', meta: true }} />
      </>
    );

    expect(caps(screen.getByLabelText('Escape'))).toEqual(['esc']);
    expect(screen.getByText('esc').className).toBe('key key-word');
    expect(caps(screen.getByLabelText('Command Space'))).toEqual(['', 'space']);
  });

  it('leaves out an omitted modifier from the drawing but not from the name', () => {
    render(<KeyChord chord={{ key: 'k', meta: true, alt: true }} omit={['meta']} />);

    expect(caps(screen.getByLabelText('Option Command K'))).toEqual(['', 'K']);
  });

  it('draws only the modifiers of a chord with no key', () => {
    render(<KeyChord chord={{ key: '', meta: true }} />);

    expect(caps(screen.getByLabelText('Command'))).toEqual(['']);
  });

  it('speaks and prints the names a provider supplies, keeping the rest English', () => {
    render(
      <UiokProvider
        labels={{
          keys: { modifiers: { meta: 'Befehl' }, names: { ' ': 'Leertaste' }, spaceCap: 'leer' }
        }}
      >
        <KeyChord chord={{ key: ' ', meta: true, shift: true }} />
      </UiokProvider>
    );

    expect(caps(screen.getByLabelText('Shift Befehl Leertaste'))).toEqual(['', '', 'leer']);
  });
});
