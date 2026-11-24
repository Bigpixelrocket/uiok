import type { MouseEvent, ReactElement } from 'react';

import { chordSpoken } from '../keyboard/KeyChord.logic.js';
import { KeyChord } from '../keychord/KeyChord.js';
import { useLabels } from '../labels/UiokProvider.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

/** The key the control prints and stands for. */
const ESCAPE = { key: 'Escape' } as const;

/** A press on a field's own controls must not take the focus from its input. */
const keepFocus = (event: MouseEvent): void => event.preventDefault();

/** Props for {@link FilterEscape}. */
export interface FilterEscapeProps {
  /** What a press does, in words ("Clear filter"): the key cap itself only says "esc". */
  readonly label: string;
  /** Does what Escape does in the field: clear a typed query, or leave. */
  readonly onEscape: () => void;
}

/**
 * The Escape key of a filter field, printed at its far end and pressable:
 * the pointer's way to do what Escape does there, such as clear a typed
 * query before the field closes. It takes no focus, so the field keeps the
 * keys; where the focus goes once the field has closed is the caller's to
 * say. Its label is its tooltip; its accessible name is the label and the
 * key it shows, in words ("Clear filter, Escape", the key's name from
 * `UiokLabels.keys`), so what a screen reader says and what the reader sees
 * agree, and `aria-keyshortcuts` names the key too.
 */
export function FilterEscape({ label, onEscape }: FilterEscapeProps): ReactElement {
  const { keys } = useLabels();

  return (
    <button
      aria-keyshortcuts="Escape"
      aria-label={`${label}, ${chordSpoken(ESCAPE, keys)}`}
      className="filter-escape"
      onClick={onEscape}
      onMouseDown={keepFocus}
      tabIndex={-1}
      type="button"
      {...tooltip(label)}
    >
      <KeyChord chord={ESCAPE} />
    </button>
  );
}
