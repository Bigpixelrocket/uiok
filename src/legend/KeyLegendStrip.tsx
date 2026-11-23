import { ArrowBigUp, ChevronUp, Command, Option, type LucideIcon } from 'lucide-react';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent,
  type ReactElement
} from 'react';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import { chordGlyphs, chordSpoken, type LayerModifier } from '../keyboard/KeyChord.logic.js';
import { KeyChord } from '../keychord/KeyChord.js';
import type { KeyLabels } from '../labels/keys.js';
import type { LegendLabels } from '../labels/legend.js';
import { useLabels } from '../labels/UiokProvider.js';
import { cutTooltip, tooltip } from '../tooltip/Tooltip.logic.js';
import {
  legendUnits,
  moreLabel,
  moreListAction,
  type LegendPair,
  type LegendUnit
} from './KeyLegend.logic.js';

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

/**
 * An alert a key legend shows beside its verbs: its words. The host raises
 * each as a new object, which is how `onAlertDismiss` names the one a key
 * dismissed.
 */
export interface LegendAlert {
  /** The words, short: why the last key did nothing. */
  readonly text: string;
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
  /**
   * What the strip does with places that do not fit. `'drop'`, the default,
   * leaves them off, so the strip ends on its last whole place. `'more'`
   * folds them into a "+N" chip at the strip's end, its room kept whether or
   * not anything folds, whose list names each folded verb with its whole
   * chord and runs the one chosen.
   */
  readonly overflow?: 'drop' | 'more';
  /**
   * A short alert beside the verbs, in the host's words: why the last key
   * did nothing ("Nothing to open here"). Spoken politely by a screen
   * reader, cut with an ellipsis (whole in its tooltip) when the strip is
   * narrow. Each alert the host raises is a new object, so the strip tells
   * a repeat of the same words from the alert it already shows. Null or
   * absent shows none.
   */
  readonly alert?: LegendAlert | null;
  /**
   * Called with the alert showing when the next key goes down (a modifier
   * alone is no key). Clear it only while it is still the alert you show,
   * `setAlert((now) => (now === dismissed ? null : now))`, so an alert that
   * same key raises stays, whichever of the strip's and the host's key
   * listeners runs first. Without it the alert stays until the host clears
   * it.
   */
  readonly onAlertDismiss?: (dismissed: LegendAlert) => void;
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

/** The keys that are modifiers alone, which neither press a key nor clear an alert. */
const MODIFIER_KEYS = new Set([
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'Fn',
  'CapsLock',
  'OS'
]);

/**
 * Calls `dismiss` with the alert showing when a key goes down. One listener
 * for the strip's life reads the alert from a ref, so neither the order the
 * strip and a host's key listeners were added in nor which runs first
 * matters: the alert a key raises is a new object, which the dismissal of
 * the one before it does not name. Nor does the key that raised it dismiss
 * it, even when a host's earlier listener commits it at once (`flushSync`)
 * and the ref already holds it as the strip's listener runs: each alert is
 * stamped as it commits, on the clock the engine stamps events with (a new
 * `Event`'s `timeStamp`), and a key dismisses only an alert stamped before
 * the key went down. A tie counts as raised by the key, since a clock that
 * coarse cannot tell; the next key, later, dismisses it.
 */
function useDismissOnKey(
  alert: LegendAlert | null,
  dismiss: ((dismissed: LegendAlert) => void) | undefined
): void {
  const latest = useRef<{
    readonly alert: LegendAlert | null;
    readonly dismiss: typeof dismiss;
    readonly raisedAt: number;
  }>({ alert: null, dismiss, raisedAt: -Infinity });

  useLayoutEffect(() => {
    const now = latest.current;
    const raisedAt = alert === now.alert ? now.raisedAt : new Event('uiok-legend-alert').timeStamp;

    latest.current = { alert, dismiss, raisedAt };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const { alert: showing, dismiss: run, raisedAt } = latest.current;

      if (showing === null || MODIFIER_KEYS.has(event.key)) return;
      // Raised while this key was going down: the key's, not the one it dismisses.
      if (raisedAt >= event.timeStamp) return;
      run?.(showing);
    };

    window.addEventListener('keydown', onKey, true);

    return () => window.removeEventListener('keydown', onKey, true);
  }, []);
}

/**
 * A number for each alert object, the same for the same object: the key its
 * words are drawn under, so each alert raised, a repeat of the same words
 * included, puts a new node in the live region for a screen reader to say.
 */
const alertOccurrences = new WeakMap<LegendAlert, number>();
let alertCount = 0;

const occurrenceOf = (alert: LegendAlert): number => {
  let occurrence = alertOccurrences.get(alert);

  if (occurrence === undefined) {
    alertCount += 1;
    occurrence = alertCount;
    alertOccurrences.set(alert, occurrence);
  }
  return occurrence;
};

/** Keeps the focus where it was on a press, so a click on a slot leaves the keys where they were. */
const keepFocus = (event: MouseEvent): void => event.preventDefault();

/** For a strip given no pair labels: no verb is read as one of a pair, so no label is asked for. */
const UNPAIRED = { pairLabel: (pair: LegendPair) => pair, pairOf: () => undefined } as const;

/**
 * How many places at the tail of `row` wrapped onto the line the strip
 * never shows: every child whose top sits below the first child's. Read
 * again whenever the row changes size or its places change.
 */
function useWrappedCount(row: HTMLElement | null, places: string): number {
  const [count, setCount] = useState(0);

  useLayoutEffect(() => {
    if (row === null) {
      return undefined;
    }

    const read = (): void => {
      const children = [...row.children] as HTMLElement[];
      const top = children[0]?.offsetTop ?? 0;
      const wrapped = children.filter((child) => child.offsetTop > top).length;

      setCount((current) => (current === wrapped ? current : wrapped));
    };

    read();

    if (typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(read);

    observer.observe(row);

    return () => observer.disconnect();
  }, [row, places]);

  return count;
}

/**
 * A key legend strip along a window's bottom edge: a dock of fn and the four
 * modifiers at the left, lit while held, then the verbs the keyboard offers
 * now, each under its whole chord, since the strip lists every layer at once.
 * Two neighbours that are one action's two directions (↑ Up and ↓ Down)
 * share a place, both key caps and one label (`legendUnits`, `pairLabel`).
 * Every verb is a button that runs it, kept out of the Tab order (the chord
 * is the keyboard's way to it) and leaving the focus where it was. The
 * caller decides which verbs are listed and in which order; the strip draws
 * them. An `alert` from the host (why the last key did nothing) shows at
 * the strip's end in a polite live region until the next key, when the
 * strip calls `onAlertDismiss` with it. Its own name, its verb group's name, and a
 * paired cap's name come from `UiokLabels.legend`, chords in words from
 * `UiokLabels.keys`.
 */
export function KeyLegendStrip({
  verbs,
  pairLabel,
  overflow = 'drop',
  alert = null,
  onAlertDismiss
}: KeyLegendStripProps): ReactElement {
  const { keys, legend } = useLabels();
  const held = useHeldModifiers();
  const shownAlert = alert !== null && alert.text !== '' ? alert : null;

  useDismissOnKey(shownAlert, onAlertDismiss);
  const units = legendUnits(verbs, pairLabel === undefined ? UNPAIRED : { pairLabel });
  const [row, setRow] = useState<HTMLSpanElement | null>(null);
  const placesKey = units
    .map((unit) => unit.label + chordGlyphs(unit.entries[0].chord, keys))
    .join('\n');
  const wrapped = useWrappedCount(overflow === 'more' ? row : null, placesKey);
  const folded = overflow === 'more' && wrapped > 0 ? units.slice(units.length - wrapped) : [];
  const foldedVerbs = folded.flatMap((unit) => unit.entries);

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
          {...tooltip(first.label, first.chord)}
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
            {...tooltip(entry.label, entry.chord)}
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
        <span aria-label={legend.verbs} className="keylegend-verbs" ref={setRow} role="group">
          {units.map(place)}
        </span>
        {overflow === 'more' ? (
          <LegendMore keys={keys} legend={legend} verbs={foldedVerbs} />
        ) : null}
      </span>
      {/* Always in the document, so a screen reader hears each alert put in
          it; a new node for each alert, so a repeat of the same words is
          heard again. */}
      <span className="keylegend-alert" role="status">
        {shownAlert === null ? null : (
          <span
            className="keylegend-alert-text"
            key={occurrenceOf(shownAlert)}
            {...cutTooltip(shownAlert.text)}
          >
            {shownAlert.text}
          </span>
        )}
      </span>
    </footer>
  );
}

/** Props for the overflow chip: the folded verbs and the label groups it speaks with. */
interface LegendMoreProps {
  readonly verbs: readonly LegendVerb[];
  readonly keys: KeyLabels;
  readonly legend: LegendLabels;
}

/**
 * The "+N" chip at a folding strip's end and its list above it. The chip
 * keeps its room while nothing is folded (hidden, so the strip never jumps
 * when the first place folds). Its list is a compact menu: the keys of
 * `moreListAction`, a click or Return runs the verb and closes the list, and
 * the focus goes back to where it was before the list opened, as a verb
 * button's press keeps it, so the keyboard stays on what it was driving.
 */
function LegendMore({ verbs, keys, legend }: LegendMoreProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(0);
  const chip = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const returnRef = useRef<Element | null>(null);
  const label = moreLabel(verbs.length, legend);
  const shown = verbs.length > 0;

  useEffect(() => {
    if (!shown) {
      setOpen(false);
    }
  }, [shown]);

  useEffect(() => {
    if (open) {
      list.current?.focus();
    }
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const away = (event: PointerEvent): void => {
      const target = event.target as Node | null;

      if (target !== null && !list.current?.contains(target) && !chip.current?.contains(target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', away);

    return () => document.removeEventListener('pointerdown', away);
  }, [open]);

  const close = (): void => {
    const back = returnRef.current;

    returnRef.current = null;
    setOpen(false);

    if (back instanceof HTMLElement && back.isConnected) {
      back.focus({ preventScroll: true });
    }
  };

  const run = (verb: LegendVerb | undefined): void => {
    close();
    verb?.run();
  };

  const onKeyDown = (event: ReactKeyboardEvent): void => {
    const action = moreListAction(event.nativeEvent, cursor, verbs.length);

    if (action === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (action.kind === 'close') {
      close();
    } else if (action.kind === 'cursor') {
      setCursor(action.row);
    } else {
      run(verbs[action.row]);
    }
  };

  return (
    <span className="keylegend-more-place">
      <button
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={label.spoken}
        aria-hidden={shown ? undefined : true}
        className="keylegend-more quiet-control"
        data-empty={shown ? undefined : 'true'}
        disabled={!shown}
        onClick={() => {
          if (open) {
            close();

            return;
          }

          returnRef.current = document.activeElement;
          setCursor(0);
          setOpen(true);
        }}
        // A press must not take the focus from what the keyboard was driving.
        onMouseDown={keepFocus}
        ref={chip}
        tabIndex={-1}
        type="button"
        {...tooltip(label.spoken)}
      >
        {label.text}
      </button>
      {open && shown ? (
        <div
          aria-label={label.spoken}
          className="folder-menu folder-menu-compact keylegend-more-list"
          data-overlay
          onKeyDown={onKeyDown}
          ref={list}
          role="menu"
          tabIndex={-1}
        >
          {verbs.map((verb, index) => (
            <button
              aria-label={`${chordSpoken(verb.chord, keys)} ${verb.label}`}
              className={index === cursor ? 'folder-menu-option cursor' : 'folder-menu-option'}
              key={verb.label + chordGlyphs(verb.chord, keys)}
              onClick={() => run(verb)}
              onMouseDown={keepFocus}
              onPointerEnter={() => setCursor(index)}
              role="menuitem"
              tabIndex={-1}
              type="button"
            >
              <span aria-hidden className="row-icon" />
              <span className="row-name">{verb.label}</span>
              <KeyChord chord={verb.chord} />
            </button>
          ))}
        </div>
      ) : null}
    </span>
  );
}
