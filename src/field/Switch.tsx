import type { MouseEvent, ReactElement } from 'react';

/** A press on the switch or its words toggles it alone, never also opening the row it stands in. */
const keepToSelf = (event: MouseEvent): void => event.stopPropagation();

import { useInRow, type ControlVerb } from '../pane/PaneActions.js';

/** Props for {@link Switch}. */
export interface SwitchProps {
  /** Whether the thing it stands for is on. */
  readonly checked: boolean;
  /** Hears the state a press asks for. */
  readonly onChange: (checked: boolean) => void;
  /** Its words ("Sharing"), beside it, or its accessible name alone with `labelHidden`. */
  readonly label: string;
  /** Speaks the label without drawing it: a switch in a row whose name says what it turns on. */
  readonly labelHidden?: boolean;
  readonly disabled?: boolean;
  /** The verb the row's keys run it for (`data-verb`), as a row's other controls carry. */
  readonly verb?: ControlVerb;
}

/**
 * A switch for a running thing turned on or off at once (a service,
 * sharing), in the shared `.switch` look on a native checkbox with
 * `role="switch"`; a setting is a check, not a switch. With its label drawn
 * it stands in a `field-choice` label, the whole label its target. In a
 * listing row it leaves the Tab order, as a row's other controls do, since
 * the cursor row's keys run it, and a press toggles it without opening the
 * row.
 */
export function Switch({
  checked,
  onChange,
  label,
  labelHidden = false,
  disabled = false,
  verb
}: SwitchProps): ReactElement {
  const inRow = useInRow();
  const control = (
    <input
      aria-label={labelHidden ? label : undefined}
      checked={checked}
      className="switch"
      data-verb={verb}
      disabled={disabled}
      onChange={(event) => onChange(event.currentTarget.checked)}
      onClick={keepToSelf}
      role="switch"
      tabIndex={inRow ? -1 : undefined}
      type="checkbox"
    />
  );

  if (labelHidden) return control;

  return (
    <label className="field-choice" onClick={keepToSelf}>
      {control}
      {label}
    </label>
  );
}
