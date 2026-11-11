/** Chords drawn as key caps, each named in words, and one chord bare. */

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
    <div className="demo-stack">
      {/* `keycap` around the chords draws each as the library's one key cap. */}
      <ul className="chord-list keycap">
        {CHORDS.map((chord) => (
          <li key={chordSpoken(chord, keys)}>
            <KeyChord chord={chord} />
            <span className="demo-readout">{chordSpoken(chord, keys)}</span>
          </li>
        ))}
      </ul>
      <p className="demo-row">
        Bare, in running text: <KeyChord chord={{ key: 'c', meta: true }} />
      </p>
    </div>
  );
}
