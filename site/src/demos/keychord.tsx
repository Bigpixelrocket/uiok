/**
 * Chords drawn as key caps, each named in words, one chord bare, and one cap
 * in each tone a host can set, and the parts of a chord: its modifiers alone,
 * and a chord with a modifier left out of the drawing. Last, a shortcut
 * index whose chord column lines up across its groups, with a changed
 * chord, a verb with none, and one dimmed.
 */

import { useLabels } from '@bigpixelrocket/uiok';
import { chordSpoken, type Chord } from '@bigpixelrocket/uiok/keyboard';
import {
  KeyChord,
  ShortcutGroup,
  ShortcutIndex,
  KeyChords,
  ShortcutRow,
  type KeyChordTone
} from '@bigpixelrocket/uiok/keychord';

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
      {/* A chord with no key draws its modifiers alone (a held layer's
          anchor); `omit` leaves out a modifier shown elsewhere, and the name
          still says the whole chord. */}
      <DemoStates minCell="180px" title="Parts of a chord">
        <DemoState
          label={`Modifiers alone: ${chordSpoken({ key: '', meta: true, shift: true }, keys)}`}
        >
          <span className="keycap">
            <KeyChord chord={{ key: '', meta: true, shift: true }} />
          </span>
        </DemoState>
        <DemoState label={`omit meta, named ${chordSpoken({ key: 'k', meta: true }, keys)}`}>
          <span className="keycap">
            <KeyChord chord={{ key: 'k', meta: true }} omit={['meta']} />
          </span>
        </DemoState>
      </DemoStates>
      <h3 className="demo-subhead">Several chords for one verb</h3>
      <p className="keycap">
        <KeyChords
          chords={[
            { key: 'n', meta: true, shift: true },
            { key: 'n', meta: true }
          ]}
        />
      </p>
      <h3 className="demo-subhead">Shortcut index</h3>
      <ShortcutIndex label="Keyboard shortcuts">
        <ShortcutGroup title="Services">
          <ShortcutRow chords={[{ key: 'Enter', meta: true }]} verb="Start or Stop" />
          <ShortcutRow chords={[{ key: 'Enter', meta: true, alt: true }]} verb="Restart" />
          <ShortcutRow
            changed
            chords={[
              { key: 'Backspace', meta: true, alt: true },
              { key: 'Delete', meta: true }
            ]}
            verb="Delete the database under the cursor"
          />
        </ShortcutGroup>
        <ShortcutGroup title="Window">
          <ShortcutRow chords={[{ key: 'k', meta: true }]} verb="Commands" />
          <ShortcutRow
            chords={[]}
            detail="Shows the console under the page"
            none="No shortcut"
            verb="Console"
          />
          <ShortcutRow chords={[{ key: 'Tab' }]} verb="Switch Pane" />
          <ShortcutRow chords={[{ key: '.' }]} dim verb="Reveal in Finder" />
        </ShortcutGroup>
      </ShortcutIndex>
    </div>
  );
}
