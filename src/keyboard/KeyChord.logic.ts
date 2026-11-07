/*
 * How a chord is drawn and spoken, shared by every surface that prints keys:
 * key legends, menus, a settings pane, and a dialog's legend footer. The key
 * caps themselves are `KeyChord`. Names and glyphs come from `KeyLabels`
 * (macOS's English by default), so an app on another platform or in another
 * language passes its own.
 */

import { DEFAULT_KEY_LABELS, type KeyLabels } from '../labels/keys.js';
import type { Chord } from './Keyboard.logic.js';

/** The modifiers a chord can hold, in the order macOS prints them. */
export const LAYER_MODIFIERS = ['ctrl', 'alt', 'shift', 'meta'] as const;

/** A modifier a chord or a legend layer can hold. */
export type LayerModifier = (typeof LAYER_MODIFIERS)[number];

/** How a modifier is named in labels and accessible names: "Command". */
export function modifierName(
  modifier: LayerModifier,
  labels: KeyLabels = DEFAULT_KEY_LABELS
): string {
  return labels.modifiers[modifier];
}

/** One key of a chord as a legend draws it: a modifier or the trailing key. */
export type ChordPart = LayerModifier | { readonly key: string };

/** The chord's keys in the order macOS prints them: Control, Option, Shift, Command, then the key. */
export function chordParts(chord: Chord): readonly ChordPart[] {
  return [
    ...(chord.ctrl ? (['ctrl'] as const) : []),
    ...(chord.alt ? (['alt'] as const) : []),
    ...(chord.shift ? (['shift'] as const) : []),
    ...(chord.meta ? (['meta'] as const) : []),
    { key: chord.key }
  ];
}

/** A key's name in words ("Return", "Page Up"); a letter or a digit is its capital itself. */
const spokenKey = (key: string, labels: KeyLabels): string =>
  labels.names[key] ?? key.toUpperCase();

/**
 * The chord in words, for assistive technology: "Shift Command N". A chord
 * drawn for its modifiers alone (an empty key) speaks only the modifiers.
 */
export function chordSpoken(chord: Chord, labels: KeyLabels = DEFAULT_KEY_LABELS): string {
  return chordParts(chord)
    .filter((part) => typeof part !== 'object' || part.key !== '')
    .map((part) =>
      typeof part === 'object' ? spokenKey(part.key, labels) : modifierName(part, labels)
    )
    .join(' ');
}

/**
 * The chord as macOS menus print it ("⇧⌘G"), for a tooltip or a sentence
 * that names a chord in text rather than drawing its key caps. The space
 * bar, which has no glyph, is written by its name ("⌘Space").
 */
export function chordGlyphs(chord: Chord, labels: KeyLabels = DEFAULT_KEY_LABELS): string {
  return chordParts(chord)
    .map((part) =>
      typeof part !== 'object'
        ? labels.modifierGlyphs[part]
        : part.key === ' '
          ? spokenKey(' ', labels)
          : (labels.keyGlyphs[part.key] ?? part.key.toUpperCase())
    )
    .join('');
}
