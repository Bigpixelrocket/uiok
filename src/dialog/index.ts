/**
 * Dialogs: the `ModalDialog` frame, its `DialogLegend` key legend footer and
 * the rules for which slot a key runs, the one `ConfirmDialog`, the compact
 * lists a confirmation's body holds (`DialogItems` for what it acts on,
 * `DialogStatements` for the statements it runs, `DialogFacts` for facts
 * about the action), the `ProgressDialog` of long work, the
 * `TypedNameDialog` for work a slip would cost most, the
 * `SectionedDialog` of a form too long for one view, and the `DialogLayer` a
 * host mounts them into.
 */

export { ConfirmDialog, type ConfirmDialogProps, type ConfirmTone } from './ConfirmDialog.js';
export { DialogLayer, type DialogLayerProps } from './DialogLayer.js';
export { ProgressDialog, type ProgressDialogProps } from './ProgressDialog.js';
export {
  SectionedDialog,
  type DialogSection,
  type SectionedDialogProps
} from './SectionedDialog.js';
export { TypedNameDialog, type TypedNameDialogProps } from './TypedNameDialog.js';
export {
  DIALOG_ITEMS_SHOWN,
  DialogFacts,
  DialogItems,
  DialogStatements,
  shownItems,
  type DialogFact,
  type DialogFactsProps,
  type DialogItem,
  type DialogItemGroup,
  type DialogItemsProps,
  type DialogStatementsProps
} from './DialogLists.js';
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
export {
  containTab,
  ModalDialog,
  type DialogSize,
  type DialogTone,
  type ModalDialogProps
} from './ModalDialog.js';
