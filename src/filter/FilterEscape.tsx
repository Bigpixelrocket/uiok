import type { MouseEvent, ReactElement } from 'react';

import { KeyChord } from '../keychord/KeyChord.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

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
 * say. Its label is its accessible name and its tooltip.
 */
export function FilterEscape({ label, onEscape }: FilterEscapeProps): ReactElement {
  return (
    <button
      aria-label={label}
      className="filter-escape"
      onClick={onEscape}
      onMouseDown={keepFocus}
      tabIndex={-1}
      type="button"
      {...tooltip(label)}
    >
      <KeyChord chord={{ key: 'Escape' }} />
    </button>
  );
}
