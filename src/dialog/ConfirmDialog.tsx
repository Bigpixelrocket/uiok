import type { LucideIcon } from 'lucide-react';
import { useId, type ReactElement, type ReactNode } from 'react';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import { useLabels } from '../labels/UiokProvider.js';
import type { DialogLegendModel } from './DialogLegend.logic.js';
import { DialogFacts, DialogNames, type DialogFact } from './DialogLists.js';
import { ModalDialog } from './ModalDialog.js';

/** The Delete Now chord (Finder's chord for a delete that skips the Trash), which confirms a delete that cannot be undone. */
const DELETE_IMMEDIATELY: Chord = { key: 'Backspace', meta: true, alt: true };

/**
 * A confirmation's tone: `danger` for a destructive action, `warning` for a
 * question whose yes is the safe choice but still ends work, `primary` for
 * a grant that changes nothing by itself.
 */
export type ConfirmTone = 'danger' | 'warning' | 'primary';

/** Copy and callbacks for {@link ConfirmDialog}. */
export interface ConfirmDialogProps {
  /**
   * What will happen, in at most five words, on one line of the title
   * strip ("Delete 7 Items Now?"); a title too long is cut with an
   * ellipsis, never wrapped.
   */
  readonly title: string;
  /**
   * The consequence: one short sentence, one or two lines at most, as text
   * or with a name set apart in bold (`<strong>`). Context the dialog needs
   * (where it acts) goes here too, never beside the title. Leave it out (or
   * pass `''`) when the title says all there is: no empty paragraph is drawn,
   * and the facts or names list describes the dialog instead.
   */
  readonly message?: ReactNode;
  /** The action's verb, the lit primary at the right edge. */
  readonly confirmLabel: string;
  /**
   * The leave verb on Escape, named for what leaving keeps (Keep Editing);
   * the `dialog.cancel` label unless given.
   */
  readonly cancelLabel?: string;
  /** The action's icon, the one its trigger or menu row wears (a trash can for Move to Trash). */
  readonly icon: LucideIcon;
  /**
   * `danger` for destructive confirmations (the default): a red rule under
   * the title and a red lit confirm. `warning` for a question whose yes is
   * the safe choice but still ends work (cancelling a delete): an amber
   * rule, with the confirm in the accent. `primary` for a grant that
   * changes nothing by itself, which keeps the accent.
   */
  readonly tone?: ConfirmTone;
  /**
   * The facts the decision rests on, as one-line rows of a label and a
   * count or a few names (`DialogFacts`), under the message.
   */
  readonly facts?: readonly DialogFact[];
  /**
   * The names or paths the action touches, one line each, cut in their
   * middle, the first few and then "+N more" (`DialogNames`), under the
   * message. A confirmation shows at most one list: `facts` or `paths`.
   */
  readonly paths?: readonly string[];
  /**
   * A choice the confirmation carries, drawn under the message (keep an
   * item's data or move it to the Trash). The caller holds its state and
   * reads it in `onConfirm`; the confirm verb stays the same whatever is
   * chosen.
   */
  readonly children?: ReactNode;
  /** Extra class on the dialog box, for a body that needs its own width or layout. */
  readonly className?: string;
  /**
   * True for a delete that cannot be undone (a volume with no Trash, a
   * server, a database): the confirm verb stays at the right edge, lit, but
   * moves off Return onto ⌥⌘⌫, the Delete Now chord, and
   * Return does nothing, so a Return pressed out of habit after ⌘⌫ never
   * deletes anything for good.
   */
  readonly forGood?: boolean;
  /** The confirm verb, on Return (or ⌥⌘⌫ with `forGood`) and its slot. */
  readonly onConfirm: () => void;
  /** Escape, the leave slot, and a press outside. */
  readonly onCancel: () => void;
}

/**
 * The one confirmation surface, for destructive, privileged, and
 * side-effect-bearing actions, read at a glance: a one-line title that says
 * what will happen, one short sentence of consequence, then its facts and
 * the names it acts on as compact lists (each row one line), an optional
 * choice the caller draws, then the legend's esc Cancel (or the
 * leave verb named) and the named action at the right edge, on Return, or
 * on ⌥⌘⌫ with Return running nothing for a delete that cannot be undone
 * (`forGood`). The message describes the dialog (`aria-describedby`), so a
 * screen reader reads the consequence, and any name it holds, with the
 * title; without a message the facts or names list describes it, and with
 * neither the dialog has no description. The frame carries its type, margins, and box sizing, so it renders
 * the same portalled to the body as inside any page; its title keeps to one
 * line, cut with an ellipsis. Styled by the `.confirm-dialog` rules in
 * `@bigpixelrocket/uiok/styles.css`; reads the `dialog` labels.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  icon,
  tone = 'danger',
  facts = [],
  paths = [],
  children,
  className,
  forGood = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): ReactElement {
  const labels = useLabels().dialog;
  const labelId = useId();
  const messageId = useId();
  const listId = useId();
  // An empty message draws nothing, so the dialog is described by what it does draw.
  const hasMessage =
    message !== undefined && message !== null && message !== false && message !== '';
  const hasList = facts.length > 0 || paths.length > 0;
  const describedBy = hasMessage ? messageId : hasList ? listId : undefined;
  const legend: DialogLegendModel = {
    leave: { label: cancelLabel ?? labels.cancel },
    primary: forGood
      ? { label: confirmLabel, chord: DELETE_IMMEDIATELY, onRun: onConfirm }
      : { label: confirmLabel, onRun: onConfirm }
  };

  return (
    <ModalDialog
      className={className ? `confirm-dialog ${className}` : 'confirm-dialog'}
      describedBy={describedBy}
      icon={icon}
      labelId={labelId}
      legend={legend}
      onCancel={onCancel}
      title={title}
      tone={tone === 'primary' ? 'accent' : tone}
    >
      {hasMessage && (
        <p className="dialog-message" id={messageId}>
          {message}
        </p>
      )}
      {facts.length > 0 && <DialogFacts facts={facts} id={listId} />}
      {paths.length > 0 && <DialogNames id={facts.length > 0 ? undefined : listId} names={paths} />}
      {children}
    </ModalDialog>
  );
}
