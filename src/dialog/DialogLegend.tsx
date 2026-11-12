import type { ReactElement } from 'react';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import { KeyChord } from '../keychord/KeyChord.js';
import { describedTooltip } from '../tooltip/Tooltip.logic.js';
import type { DialogLegendModel, DialogLegendVerb } from './DialogLegend.logic.js';

const ESCAPE: Chord = { key: 'Escape' };
const RETURN: Chord = { key: 'Enter' };

interface LegendSlotProps {
  readonly chord: Chord;
  readonly verb: DialogLegendVerb;
  readonly primary?: boolean;
  readonly danger?: boolean;
  readonly onRun: () => void;
}

/**
 * One slot: the key cap, then the verb. A real button named by its verb
 * alone (the cap is hidden from assistive technology), outside the Tab
 * order and never taking focus from a press, because its key is the
 * keyboard's way to it. A verb's `help` is its tooltip and description.
 */
function LegendSlot({
  chord,
  verb,
  primary = false,
  danger = false,
  onRun
}: LegendSlotProps): ReactElement {
  const className = ['legend-slot', primary && 'legend-primary', danger && 'legend-danger']
    .filter(Boolean)
    .join(' ');

  return (
    <button
      className={className}
      disabled={verb.disabled}
      onClick={onRun}
      onMouseDown={(event) => event.preventDefault()}
      tabIndex={-1}
      type="button"
      {...describedTooltip(verb.help)}
    >
      <span aria-hidden className="legend-slot-key">
        <KeyChord chord={chord} />
      </span>
      {verb.label}
    </button>
  );
}

/** Props for {@link DialogLegend}. */
export interface DialogLegendProps {
  /** The slots to draw. */
  readonly legend: DialogLegendModel;
  /** Runs the leave verb: the dialog's cancel, which Escape runs too. */
  readonly onLeave: () => void;
}

/**
 * A dialog's footer drawn as a key legend: the leave verb on Escape and any
 * secondary verbs line up from the left edge, the primary stands alone at
 * the right edge with its cap lit (in the danger colour inside a
 * destructive dialog), Return's unless it names its own chord. A secondary
 * verb marked `danger` reads in the danger colour. The slots
 * are the keys' pointer targets; the keys themselves are bound by whatever
 * holds the legend: `ModalDialog`, which renders it as its last child, or a
 * surface without a dialog frame (a palette), which binds them itself with
 * `legendKeyAction`. Styled by the `.dialog-legend` rules in
 * `@bigpixelrocket/uiok/styles.css`.
 */
export function DialogLegend({ legend, onLeave }: DialogLegendProps): ReactElement {
  const { leave, secondary = [], primary } = legend;

  return (
    <div className="dialog-legend">
      {leave && <LegendSlot chord={ESCAPE} onRun={onLeave} verb={leave} />}
      {secondary.map((slot) => (
        <LegendSlot
          chord={slot.chord}
          danger={slot.danger}
          key={slot.label}
          onRun={slot.onRun}
          verb={slot}
        />
      ))}
      {primary && (
        <LegendSlot chord={primary.chord ?? RETURN} onRun={primary.onRun} primary verb={primary} />
      )}
    </div>
  );
}
