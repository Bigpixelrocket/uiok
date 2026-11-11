/**
 * The keys of a dialog's key legend footer (`DialogLegend`): which slot a
 * keystroke runs. The rules are in `docs/components/dialog.md`, The legend.
 */

import type { Chord } from '../keyboard/Keyboard.logic.js';
import type { DialogLabels } from '../labels/dialog.js';

/** A verb the legend shows: its label, and whether it can run now. */
export interface DialogLegendVerb {
  /** The verb as the slot prints it, and the slot's accessible name. */
  readonly label: string;
  /** True while the verb cannot run; its slot stays drawn, dimmed, and its key runs nothing. */
  readonly disabled?: boolean;
}

/**
 * Escape's verb on a surface with a filter field (a palette, a menu): Clear
 * while a filter is typed, since Escape empties it first and the next press
 * leaves, and Cancel otherwise. Inside React, pass `useLabels().dialog`.
 */
export const filterLeaveLabel = (
  query: string,
  labels: Pick<DialogLabels, 'cancel' | 'clear'>
): string => (query === '' ? labels.cancel : labels.clear);

/** A secondary verb besides the leave verb: its own chord and what it runs. */
export interface LegendSecondary extends DialogLegendVerb {
  /**
   * A chord with a modifier (`⌘[`); a named key Option leaves alone
   * (`⌥⏎`), since Option composes letters on macOS and an Option letter
   * never reports its letter; or a bare key (Space), which a control in the
   * body keeps while it has the focus. Never plain Return, which the
   * primary holds, and never Escape under any modifier: Escape is the
   * leave verb's alone and is never drawn as a chord.
   */
  readonly chord: Chord;
  /** What the slot and its chord run. */
  readonly onRun: () => void;
  /**
   * True for a verb that destroys (Delete…): the slot reads in the danger
   * colour so it never passes for a harmless one. The primary takes its
   * colour from the dialog's tone instead.
   */
  readonly danger?: boolean;
}

/** The forward verb at the right edge, on Return unless it names another chord. */
export interface LegendPrimary extends DialogLegendVerb {
  /** What the slot and its key run. */
  readonly onRun: () => void;
  /**
   * The primary's key when it is not Return: a delete for good stands on
   * ⌥⌘⌫, Finder's Delete Immediately chord, and Return then runs nothing,
   * so a Return pressed out of habit never deletes anything for good.
   */
  readonly chord?: Chord;
  /**
   * Return stays with a focused body control that answers it itself (a
   * text field, a pop-up menu, a button) and runs the primary only from
   * elsewhere: a settings sheet's Done, where every control applies at once
   * and a field adds the name it holds on Return.
   */
  readonly yieldsReturn?: boolean;
}

/**
 * A dialog's footer: how to leave, the secondary verbs, and the one primary,
 * four slots at most. The leave verb comes first, at the left edge, on
 * Escape, named for what Escape does there: Cancel by default, or a
 * situational label (Clear, Keep Editing), never Close. Up to two secondary
 * verbs follow in order of use, and the primary, the forward verb, stands
 * alone at the right edge. A dialog with more verbs moves its choice into
 * the body.
 */
export interface DialogLegendModel {
  /**
   * Escape's verb. The slot runs the dialog's own cancel, the same as
   * Escape, so the slot and the key never do different things; disabled
   * while Escape does nothing yet. Left out when the primary already does
   * all Escape would (an outcome's OK, a sheet's Done): Escape and Return
   * never share a slot, and Escape still runs the dialog's cancel, unshown.
   */
  readonly leave?: DialogLegendVerb;
  /** In order of use, after the leave verb. */
  readonly secondary?:
    readonly [] | readonly [LegendSecondary] | readonly [LegendSecondary, LegendSecondary];
  /** The forward verb at the right edge, lit. */
  readonly primary?: LegendPrimary;
}

/** The part of a keydown the legend reads; keeps the rules testable. */
export interface LegendKeyStroke {
  /** `KeyboardEvent.key`. */
  readonly key: string;
  /** Option (Alt) is held. */
  readonly altKey: boolean;
  /** Control is held. */
  readonly ctrlKey: boolean;
  /** Command (Meta) is held. */
  readonly metaKey: boolean;
  /** Shift is held. */
  readonly shiftKey: boolean;
  /** A held key's auto-repeat. */
  readonly repeat: boolean;
  /** An input method is composing; its keys are the composition's. */
  readonly composing: boolean;
  /** A control in the body has already kept the key (a field's open list of values). */
  readonly handled: boolean;
  /**
   * The key comes from a control in the body (a field, a button, a
   * checkbox, a scrolling list) rather than from the dialog itself, so a
   * bare key is that control's to answer.
   */
  readonly fromControl: boolean;
  /**
   * The key comes from a body control that answers Return itself (a text
   * field, a pop-up menu, a button), which keeps it from a primary that
   * yields Return.
   */
  readonly fromReturnControl: boolean;
  /**
   * The key comes from a text field holding text, which deletes with
   * Backspace and forward Delete under any modifier (⌘⌫ to the line's
   * start, ⌥⌫ a word), so a slot on one of them leaves the key to the
   * field. An empty field has nothing to delete, and the slot runs.
   */
  readonly fromFilledField: boolean;
}

/**
 * What a keystroke does in the legend: run a slot, or keep the key from
 * the focused control while running nothing (Return on a disabled primary,
 * or a held Return repeating), or nothing at all (`null`), which leaves the
 * key to the focused control.
 */
export type LegendKeyAction =
  { readonly kind: 'run'; readonly run: () => void } | { readonly kind: 'keep' } | null;

/** Whether a keystroke is exactly this chord: every modifier as declared, and the key. */
const matchesChord = (chord: Chord, stroke: LegendKeyStroke): boolean =>
  stroke.ctrlKey === (chord.ctrl ?? false) &&
  stroke.metaKey === (chord.meta ?? false) &&
  stroke.altKey === (chord.alt ?? false) &&
  stroke.shiftKey === (chord.shift ?? false) &&
  stroke.key.toLowerCase() === chord.key.toLowerCase();

const PLAIN_RETURN: Chord = { key: 'Enter' };

/** A chord with no modifier but Shift: a key a focused control types or presses. */
const isBare = (chord: Chord): boolean =>
  !(chord.meta ?? false) && !(chord.ctrl ?? false) && !(chord.alt ?? false);

/** A chord on a key a text field deletes with, whatever its modifiers. */
const isDeletion = (chord: Chord): boolean => chord.key === 'Backspace' || chord.key === 'Delete';

/** Whether the focused control keeps a secondary slot's key from the legend. */
const controlKeeps = (chord: Chord, stroke: LegendKeyStroke): boolean =>
  (stroke.fromControl && isBare(chord)) || (stroke.fromFilledField && isDeletion(chord));

/**
 * The slot a keystroke runs. A secondary chord runs its slot, except a bare
 * one (Space) while a body control has the focus, or a deletion chord (⌘⌫)
 * while a text field holding text has it, which keeps the key. The primary
 * runs on its own chord (⌥⌘⌫ for a delete for good) under the same rule,
 * or else on plain Return from anywhere in the dialog, a focused field or
 * body button included, so it never clicks the focused control instead,
 * unless it yields Return to a focused field, pop-up menu, or button.
 * Return runs nothing while the primary is disabled or the key repeats, so a
 * Return held from the step before cannot commit the next one, and no slot
 * runs on a repeat. Escape is the dialog frame's own key and is not read
 * here.
 */
export function legendKeyAction(
  legend: DialogLegendModel,
  stroke: LegendKeyStroke
): LegendKeyAction {
  if (stroke.composing || stroke.handled) {
    return null;
  }

  const runs = (chord: Chord): boolean =>
    matchesChord(chord, stroke) && !controlKeeps(chord, stroke);
  const { primary, secondary = [] } = legend;
  const primaryRuns =
    primary !== undefined &&
    (primary.chord === undefined
      ? matchesChord(PLAIN_RETURN, stroke) &&
        !(primary.yieldsReturn === true && stroke.fromReturnControl)
      : runs(primary.chord));
  const slot =
    secondary.find((candidate) => runs(candidate.chord)) ?? (primaryRuns ? primary : undefined);

  if (slot === undefined) {
    return null;
  }

  return slot.disabled || stroke.repeat ? { kind: 'keep' } : { kind: 'run', run: slot.onRun };
}

/** A chord as a fixed string for comparison, never for display. */
const chordText = (chord: Chord): string =>
  `${chord.ctrl ? '⌃' : ''}${chord.alt ? '⌥' : ''}${chord.shift ? '⇧' : ''}${chord.meta ? '⌘' : ''}${chord.key}`;

/**
 * What a legend draws, as a string: each slot's label, chord, whether it
 * can run, and whether it reads as destructive, so two models that draw the same footer compare equal whatever
 * functions they run. A holder that rebuilds its model on every render
 * passes a new one on only when this changes.
 */
export function legendSignature(legend: DialogLegendModel): string {
  const verb = (slot: DialogLegendVerb | undefined): readonly [string, boolean] | null =>
    slot === undefined ? null : [slot.label, slot.disabled === true];

  return JSON.stringify([
    verb(legend.leave),
    (legend.secondary ?? []).map((slot) => [
      ...(verb(slot) ?? []),
      chordText(slot.chord),
      slot.danger === true
    ]),
    legend.primary === undefined
      ? null
      : [...(verb(legend.primary) ?? []), chordText(legend.primary.chord ?? PLAIN_RETURN)]
  ]);
}
