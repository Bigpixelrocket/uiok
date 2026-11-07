/** Chords drawn as key caps, each named in words. */

import { useLabels } from '@bigpixelrocket/uiok';
import { chordSpoken, type Chord } from '@bigpixelrocket/uiok/keyboard';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';

const CHORDS: readonly Chord[] = [
  { key: 'n', meta: true, shift: true },
  { key: 'k', meta: true },
  { key: 'Backspace', meta: true, alt: true },
  { key: 'ArrowUp', meta: true },
  { key: 'Enter' },
  { key: 'Escape' },
  { key: ' ' },
  { key: 'PageDown' },
  { key: '/', ctrl: true }
];

/** The key chord page's demo. */
export function KeyChordDemo() {
  const keys = useLabels().keys;
  return (
    <ul className="chord-list">
      {CHORDS.map((chord) => (
        <li key={chordSpoken(chord, keys)}>
          <span className="chord-cap">
            <KeyChord chord={chord} />
          </span>
          <span className="demo-readout">{chordSpoken(chord, keys)}</span>
        </li>
      ))}
    </ul>
  );
}
