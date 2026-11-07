/*
 * How a key legend lays out its verbs: which neighbours fold into one place,
 * how many places fit beside the overflow chip, and what the overflow list's
 * keys do. Pure functions, shared by `KeyLegendStrip` and by any legend an
 * app draws itself.
 */

import type { Chord } from '../keyboard/Keyboard.logic.js';
import { DEFAULT_LEGEND_LABELS, type LegendLabels } from '../labels/legend.js';

/**
 * The name of an action with two opposite directions ("upDown"), which two
 * verbs share to say they may be drawn in one place under one label. The app
 * owns the vocabulary and supplies each pair's label (`LegendUnitOptions`
 * `pairLabel`). That label is a message of its own in every language, never
 * the two verbs' labels joined, so a pair folds the same way whatever words
 * the verbs take.
 */
export type LegendPair = string;

/**
 * What a legend needs of a listed verb to pair it: its chord, its label, and
 * the pair it is one direction of, if any. A verb says its pair itself,
 * unless the caller reads it otherwise through `LegendUnitOptions` `pairOf`.
 */
export interface Pairable {
  readonly chord: Chord;
  readonly label: string;
  readonly pair?: LegendPair;
}

/**
 * One place on a legend: a verb, or two neighbouring verbs that are one
 * action's opposite directions, drawn as both key caps and one label
 * ("Up/Down").
 */
export interface LegendUnit<Entry extends Pairable> {
  readonly entries: readonly [Entry] | readonly [Entry, Entry];
  readonly label: string;
}

/** How `legendUnits` names and reads pairs. */
export interface LegendUnitOptions<Entry extends Pairable> {
  /** The one label a pair's place shows ("Up/Down"), in the language in use. */
  readonly pairLabel: (pair: LegendPair) => string;
  /** The pair a verb is one direction of; a verb's own `pair` by default. */
  readonly pairOf?: (entry: Entry) => LegendPair | undefined;
}

/** Keys that point opposite ways, each pair in the order a legend lists them. */
const OPPOSITE_KEYS: ReadonlyArray<readonly [string, string]> = [
  ['ArrowUp', 'ArrowDown'],
  ['ArrowLeft', 'ArrowRight'],
  ['PageUp', 'PageDown'],
  ['Home', 'End'],
  ['[', ']']
];

const sameModifiers = (a: Chord, b: Chord): boolean =>
  (a.ctrl ?? false) === (b.ctrl ?? false) &&
  (a.alt ?? false) === (b.alt ?? false) &&
  (a.shift ?? false) === (b.shift ?? false) &&
  (a.meta ?? false) === (b.meta ?? false);

const oppositeKeys = (a: Chord, b: Chord): boolean =>
  sameModifiers(a, b) &&
  OPPOSITE_KEYS.some(([first, second]) => a.key === first && b.key === second);

/**
 * A legend's places, left to right: each verb in the order it is listed,
 * with two neighbours merged into one place when they are one action's two
 * directions: the same modifiers on opposite keys (↑ then ↓, ← then →, Page
 * Up then Page Down, Home then End, `[` then `]`), both of one pair
 * (`pairOf`), under the pair's label (`pairLabel`). Only neighbours merge,
 * so a custom chord that moves one of them apart leaves both as they are,
 * and two verbs that only sit on opposite keys never merge.
 */
export function legendUnits<Entry extends Pairable>(
  entries: readonly Entry[],
  { pairLabel, pairOf = (entry) => entry.pair }: LegendUnitOptions<Entry>
): readonly LegendUnit<Entry>[] {
  const units: LegendUnit<Entry>[] = [];

  for (let index = 0; index < entries.length; index += 1) {
    const entry = entries[index] as Entry;
    const next = entries[index + 1];
    const pair = pairOf(entry);

    if (
      next !== undefined &&
      pair !== undefined &&
      pairOf(next) === pair &&
      oppositeKeys(entry.chord, next.chord)
    ) {
      units.push({ entries: [entry, next], label: pairLabel(pair) });
      index += 1;
    } else {
      units.push({ entries: [entry], label: entry.label });
    }
  }

  return units;
}

/**
 * How many places a legend shows from the left when they are `widths` wide
 * and `available` is the room for them: every one when all fit, otherwise
 * as many as fit beside the overflow chip (`chipWidth`, its widest), which
 * then holds the rest. Places drop from the tail, so the everyday verbs a
 * legend lists first stay.
 */
export function fittingUnits(
  widths: readonly number[],
  available: number,
  chipWidth: number
): number {
  const total = widths.reduce((sum, width) => sum + width, 0);

  if (total <= available) {
    return widths.length;
  }

  let used = chipWidth;
  let shown = 0;

  for (const width of widths) {
    if (used + width > available) {
      break;
    }

    used += width;
    shown += 1;
  }

  return shown;
}

/**
 * The overflow chip's text ("+3") and spoken name ("3 more shortcuts", from
 * `UiokLabels.legend`) for the `count` verbs it holds.
 */
export function moreLabel(
  count: number,
  labels: LegendLabels = DEFAULT_LEGEND_LABELS
): { readonly text: string; readonly spoken: string } {
  return { text: `+${count}`, spoken: labels.more(count) };
}

/** What a key does in a legend's overflow list: close it, move its cursor, or run the row under it. */
export type MoreListAction =
  | { readonly kind: 'close' }
  | { readonly kind: 'cursor'; readonly row: number }
  | { readonly kind: 'run'; readonly row: number };

/**
 * The overflow list's keys, as a menu has them: ↑ and ↓ move the cursor
 * round the `rows`, Home and End go to either end, Return or Space runs the
 * row under the cursor, and Escape or Tab closes the list. Null for any
 * other key, and for any Command chord, which the list leaves to the menu
 * bar.
 */
export function moreListAction(
  key: { readonly key: string; readonly metaKey: boolean },
  cursor: number,
  rows: number
): MoreListAction | null {
  if (key.key === 'Escape' || key.key === 'Tab') {
    return { kind: 'close' };
  }

  if (key.metaKey || rows === 0) {
    return null;
  }

  switch (key.key) {
    case 'ArrowDown':
      return { kind: 'cursor', row: (cursor + 1) % rows };
    case 'ArrowUp':
      return { kind: 'cursor', row: (cursor + rows - 1) % rows };
    case 'Home':
      return { kind: 'cursor', row: 0 };
    case 'End':
      return { kind: 'cursor', row: rows - 1 };
    case 'Enter':
    case ' ':
      return { kind: 'run', row: Math.min(cursor, rows - 1) };
    default:
      return null;
  }
}
