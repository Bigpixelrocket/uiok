/**
 * Chords drawn as key caps, each named in words, one chord bare, and one cap
 * in each tone a host can set.
 */

import { useLabels } from '@bigpixelrocket/uiok';
import { chordSpoken, type Chord } from '@bigpixelrocket/uiok/keyboard';
import { KeyChord, type KeyChordTone } from '@bigpixelrocket/uiok/keychord';

import { DemoState, DemoStates } from '../DemoStates';

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

/** One cell per look: plain, each `tone`, and the recording outline. */
const TONES: ReadonlyArray<{
  readonly label: string;
  readonly tone?: KeyChordTone;
  readonly recording?: boolean;
}> = [
  { label: 'Plain' },
  { label: 'accent: changed from its default', tone: 'accent' },
  { label: 'lit: the chord Return runs', tone: 'lit' },
  { label: 'quiet: cannot change', tone: 'quiet' },
  { label: 'Recording', recording: true }
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
      {/* Each tone on a single and a multi-key cap, then the chord outside a
          cap, where only `quiet` changes anything. */}
      <DemoStates minCell="180px" title="Tones">
        {TONES.map(({ label, tone, recording }) => (
          <DemoState key={label} label={label}>
            <span className="keycap">
              <KeyChord chord={{ key: 'k', meta: true }} recording={recording} tone={tone} />
            </span>{' '}
            <span className="keycap">
              <KeyChord
                chord={{ key: 'Enter', meta: true, shift: true }}
                recording={recording}
                tone={tone}
              />
            </span>{' '}
            <KeyChord chord={{ key: 'k', meta: true }} recording={recording} tone={tone} />
          </DemoState>
        ))}
      </DemoStates>
    </div>
  );
}
