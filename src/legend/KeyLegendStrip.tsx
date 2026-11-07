import { ArrowBigUp, ChevronUp, Command, Option, type LucideIcon } from 'lucide-react';
import { useEffect, useState, type MouseEvent, type ReactElement } from 'react';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import { chordGlyphs, chordSpoken, type LayerModifier } from '../keyboard/KeyChord.logic.js';
import { KeyChord } from '../keychord/KeyChord.js';
import { useLabels } from '../labels/UiokProvider.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import { legendUnits, type LegendPair, type LegendUnit } from './KeyLegend.logic.js';

/**
 * One verb a key legend strip lists: its label, its chord, what a click on
 * it runs, and the pair of opposite verbs it is one of, if any.
 */
export interface LegendVerb {
  readonly label: string;
  readonly chord: Chord;
  readonly run: () => void;
  readonly pair?: LegendPair;
}

/** Props for {@link KeyLegendStrip}: the verbs in order, and the labels of the pairs among them. */
export interface KeyLegendStripProps {
  /** The verbs the keyboard offers now, left to right; the strip draws them as given. */
  readonly verbs: readonly LegendVerb[];
  /**
   * The one label a pair's place shows ("Up/Down"), in the language in use.
   * Without it no verbs fold, and each keeps a place of its own.
   */
  readonly pairLabel?: (pair: LegendPair) => string;
}

/** The dock's keys, as they sit at the keyboard's left edge: Shift on its row, then Control, Option, Command. */
const DOCK: ReadonlyArray<{ readonly mod: LayerModifier; readonly Icon: LucideIcon }> = [
  { mod: 'shift', Icon: ArrowBigUp },
  { mod: 'ctrl', Icon: ChevronUp },
  { mod: 'alt', Icon: Option },
  { mod: 'meta', Icon: Command }
];

const NOTHING_HELD: ReadonlySet<LayerModifier> = new Set();

/** Whether a key event says `mod` is down. */
const isHeld = (event: KeyboardEvent, mod: LayerModifier): boolean =>
  mod === 'shift'
    ? event.shiftKey
    : mod === 'ctrl'
      ? event.ctrlKey
      : mod === 'alt'
        ? event.altKey
        : event.metaKey;

/** The modifiers a key event says are down. */
const heldBy = (event: KeyboardEvent): ReadonlySet<LayerModifier> =>
  new Set(DOCK.flatMap(({ mod }) => (isHeld(event, mod) ? [mod] : [])));

/** Whether two sets of modifiers name the same keys. */
const sameHeld = (a: ReadonlySet<LayerModifier>, b: ReadonlySet<LayerModifier>): boolean =>
  a.size === b.size && [...a].every((mod) => b.has(mod));

/**
 * The modifiers the keyboard holds right now, read from every window key
 * down and up, and none once the window loses focus (a Command+Tab away
 * never sends the key up here). A key that leaves the held modifiers as
 * they were keeps the same set, so the strip draws nothing again for it.
 */
function useHeldModifiers(): ReadonlySet<LayerModifier> {
  const [held, setHeld] = useState<ReadonlySet<LayerModifier>>(NOTHING_HELD);

  useEffect(() => {
    const read = (event: KeyboardEvent): void => {
      const next = heldBy(event);

      setHeld((current) => (sameHeld(current, next) ? current : next));
    };
    const release = (): void => setHeld(NOTHING_HELD);

    window.addEventListener('keydown', read);
    window.addEventListener('keyup', read);
    window.addEventListener('blur', release);

    return () => {
      window.removeEventListener('keydown', read);
      window.removeEventListener('keyup', read);
      window.removeEventListener('blur', release);
    };
  }, []);

  return held;
}

/** Keeps the focus where it was on a press, so a click on a slot leaves the keys where they were. */
const keepFocus = (event: MouseEvent): void => event.preventDefault();

/** For a strip given no pair labels: no verb is read as one of a pair, so no label is asked for. */
const UNPAIRED = { pairLabel: (pair: LegendPair) => pair, pairOf: () => undefined } as const;

/**
 * A key legend strip along a window's bottom edge: a dock of fn and the four
 * modifiers at the left, lit while held, then the verbs the keyboard offers
 * now, each under its whole chord, since the strip lists every layer at once.
 * Two neighbours that are one action's two directions (↑ Up and ↓ Down)
 * share a place, both key caps and one label (`legendUnits`, `pairLabel`).
 * Every verb is a button that runs it, kept out of the Tab order (the chord
 * is the keyboard's way to it) and leaving the focus where it was. The
 * caller decides which verbs are listed and in which order; the strip draws
 * them. Its own name, its verb group's name, and a paired cap's name come
 * from `UiokLabels.legend`, chords in words from `UiokLabels.keys`.
 */
export function KeyLegendStrip({ verbs, pairLabel }: KeyLegendStripProps): ReactElement {
  const { keys, legend } = useLabels();
  const held = useHeldModifiers();
  const units = legendUnits(verbs, pairLabel === undefined ? UNPAIRED : { pairLabel });

  const place = (unit: LegendUnit<LegendVerb>): ReactElement => {
    const [first, second] = unit.entries;

    if (second === undefined) {
      return (
        <button
          key={first.label + chordGlyphs(first.chord, keys)}
          onClick={first.run}
          onMouseDown={keepFocus}
          tabIndex={-1}
          type="button"
        >
          {/* The space separates the chord from the verb in the button's accessible name. */}
          <KeyChord chord={first.chord} /> {first.label}
        </button>
      );
    }

    return (
      <span className="keylegend-pair" key={unit.label + chordGlyphs(first.chord, keys)}>
        {unit.entries.map((entry) => (
          <button
            aria-label={legend.capName(chordSpoken(entry.chord, keys), entry.label)}
            className="keylegend-cap"
            key={entry.chord.key}
            onClick={entry.run}
            onMouseDown={keepFocus}
            tabIndex={-1}
            type="button"
            {...tooltip(entry.label, chordGlyphs(entry.chord, keys))}
          >
            <KeyChord chord={entry.chord} />
          </button>
        ))}
        <span aria-hidden className="keylegend-pair-label">
          {unit.label}
        </span>
      </span>
    );
  };

  return (
    <footer aria-label={legend.label} className="keylegend" data-fn="false" data-layer="none">
      <span aria-hidden className="keylegend-dock">
        {/* The function key's cap, printed as the keyboard prints it. */}
        <span className="keylegend-key keylegend-dock-fn">fn</span>
        {DOCK.map(({ mod, Icon }) => (
          <span className={held.has(mod) ? 'keylegend-key held' : 'keylegend-key'} key={mod}>
            <Icon className="key-icon" />
          </span>
        ))}
      </span>
      <span className="keylegend-row">
        <span aria-label={legend.verbs} className="keylegend-verbs" role="group">
          {units.map(place)}
        </span>
      </span>
    </footer>
  );
}
