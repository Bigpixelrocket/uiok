import { tooltip, type TooltipAttributes } from '../tooltip/Tooltip.logic.js';

/** The two halves of a field's help: what its label wears and what its control wears. */
export interface LabelHelp {
  /**
   * Spread on the `.field-label`: the help as the label's hover tooltip,
   * opening above the label (or at its end where there is no room above),
   * and `data-label-help`, which draws the help cue: a dashed underline.
   */
  readonly label: TooltipAttributes;
  /**
   * Spread on the control the label names: the help as its accessible
   * description, so a screen reader hears it when the control takes focus.
   * A description on the label itself is never read, since a label only
   * gives its control a name.
   */
  readonly control: { readonly 'aria-description'?: string };
}

/**
 * Help that explains a control, kept off the form: a desktop form shows a
 * label and its control, and says what the control does in the label's
 * tooltip instead of a sentence under the field. The same words reach a
 * screen reader through the control. Without help both halves are empty,
 * so a row may pass its optional note straight through. A line that says
 * what the current choice does ("The next check is at 14:00.") stays a
 * `.field-note` under the control, since it changes with the choice. A
 * label with help shows a cue (a dashed underline, as any word that holds
 * a tooltip), and its tooltip opens above it, never over its control. The
 * tooltip opens under the pointer only, so help a user must read to fill
 * the field stays visible as a `.field-note` instead.
 */
export function labelHelp(help: string | null | undefined): LabelHelp {
  return help
    ? {
        label: { ...tooltip(help, null, { side: 'above' }), 'data-label-help': '' },
        control: { 'aria-description': help }
      }
    : { label: {}, control: {} };
}
