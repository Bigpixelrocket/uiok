import {
  ArrowBigUp,
  ArrowDown,
  ArrowDownToLine,
  ArrowLeft,
  ArrowRight,
  ArrowRightToLine,
  ArrowUp,
  ArrowUpToLine,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Command,
  CornerDownLeft,
  Delete,
  Option,
  Slash,
  type LucideIcon
} from 'lucide-react';
import { Fragment, type ReactElement } from 'react';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import {
  chordParts,
  chordSpoken,
  type ChordPart,
  type LayerModifier
} from '../keyboard/KeyChord.logic.js';
import type { KeyLabels } from '../labels/keys.js';
import { useLabels } from '../labels/UiokProvider.js';

/**
 * Keys drawn as icons. Everything comes from lucide, so every glyph shares one
 * grid and one stroke weight instead of falling to whichever font happens to
 * carry ⌘ or ⇧. Keys without a fitting icon print as short text.
 */
const KEY_ICONS: Readonly<Record<string, LucideIcon>> = {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Backspace: Delete,
  Enter: CornerDownLeft,
  Tab: ArrowRightToLine,
  Home: ArrowUpToLine,
  End: ArrowDownToLine,
  PageUp: ChevronsUp,
  PageDown: ChevronsDown,
  '/': Slash
};

/** The modifiers as macOS draws them, on the same grid as the keys. */
const MODIFIER_ICONS: Readonly<Record<LayerModifier, LucideIcon>> = {
  ctrl: ChevronUp,
  alt: Option,
  shift: ArrowBigUp,
  meta: Command
};

/**
 * One key of a chord, rendered as an icon or as text in the same box: Escape
 * and the space bar by their key cap words (`KeyLabels`), and any other key
 * as its capital.
 */
function Key({
  part,
  labels
}: {
  readonly part: ChordPart;
  readonly labels: KeyLabels;
}): ReactElement {
  const Icon = typeof part === 'object' ? KEY_ICONS[part.key] : MODIFIER_ICONS[part];

  if (Icon) {
    return (
      <span aria-hidden className="key">
        <Icon className="key-icon" />
      </span>
    );
  }

  const key = typeof part === 'object' ? part.key : part;
  const text =
    key === 'Escape' ? labels.escapeCap : key === ' ' ? labels.spaceCap : key.toUpperCase();

  return (
    <span aria-hidden className={text.length > 1 ? 'key key-word' : 'key key-letter'}>
      {text}
    </span>
  );
}

/**
 * A key cap's tone: `accent` for a chord changed from its default (an accent
 * frame on an accent wash), `lit` for the chord Return runs (the solid accent
 * face a dialog legend's primary cap wears), `quiet` for a chord that cannot
 * change (its glyphs a tone down).
 */
export type KeyChordTone = 'accent' | 'lit' | 'quiet';

/** Props for {@link KeyChord}: the chord, and what of it is already shown elsewhere. */
export interface KeyChordProps {
  readonly chord: Chord;
  /** Modifiers already shown elsewhere (a legend's anchor), left out of this drawing. */
  readonly omit?: ReadonlyArray<LayerModifier>;
  /** How the key cap reads (`data-tone`); a plain cap without it. Only a cap shows it. */
  readonly tone?: KeyChordTone;
  /** True while the chord is being recorded (`data-state="recording"`): the cap wears an accent outline. */
  readonly recording?: boolean;
}

/**
 * A chord as a row of key caps in a `<kbd>`. The accessible name is always
 * the full chord in words ("Shift Command N", from `UiokLabels.keys`), even
 * when the drawing omits a modifier a strip shows once. A chord with an
 * empty key draws its modifiers alone.
 */
export function KeyChord({
  chord,
  omit = [],
  tone,
  recording = false
}: KeyChordProps): ReactElement {
  const { keys } = useLabels();
  const parts = chordParts(chord).filter((part) =>
    typeof part === 'object' ? part.key !== '' : !(omit as readonly string[]).includes(part)
  );

  return (
    <kbd
      aria-label={chordSpoken(chord, keys)}
      className="keychord"
      data-state={recording ? 'recording' : undefined}
      data-tone={tone}
    >
      {parts.map((part, index) => (
        <Key key={index} labels={keys} part={part} />
      ))}
    </kbd>
  );
}

/** Props for {@link KeyChords}. */
export interface KeyChordsProps {
  /** The chords that run one verb, in the order to show them. */
  readonly chords: readonly Chord[];
  /** Every chord's look (`KeyChord`'s `tone`). */
  readonly tone?: KeyChordTone;
}

/**
 * Several chords that run one verb, each its own `KeyChord`, parted by the
 * `keys.or` word ("⇧⌘N or ⌘N"), drawn quiet between them and read between
 * their names ("Shift Command N or Command N"), so two chords never run
 * together as one. One chord draws alone; none draws nothing. Put `keycap`
 * on an element round it to draw each chord as a key cap. Draws
 * `.keychords` with `.keychords-or` between the chords.
 */
export function KeyChords({ chords, tone }: KeyChordsProps): ReactElement | null {
  const { keys } = useLabels();

  if (chords.length === 0) return null;

  return (
    <span className="keychords">
      {chords.map((chord, index) => (
        <Fragment key={index}>
          {index === 0 ? null : <span className="keychords-or">{keys.or}</span>}
          <KeyChord chord={chord} tone={tone} />
        </Fragment>
      ))}
    </span>
  );
}
