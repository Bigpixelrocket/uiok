/**
 * Dialogs: the `ModalDialog` frame, its `DialogLegend` key legend footer and
 * the rules for which slot a key runs, and the one `ConfirmDialog`.
 */

export { ConfirmDialog, type ConfirmDialogProps, type ConfirmTone } from './ConfirmDialog.js';
export { DialogLegend, type DialogLegendProps } from './DialogLegend.js';
export {
  filterLeaveLabel,
  legendKeyAction,
  legendSignature,
  type DialogLegendModel,
  type DialogLegendVerb,
  type LegendKeyAction,
  type LegendKeyStroke,
  type LegendPrimary,
  type LegendSecondary
} from './DialogLegend.logic.js';
export { containTab, ModalDialog, type DialogTone, type ModalDialogProps } from './ModalDialog.js';
