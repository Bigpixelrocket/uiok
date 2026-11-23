import type { LucideIcon } from 'lucide-react';
import { useId, useState, type ReactElement, type ReactNode } from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog.js';
import type { DialogFact, DialogItem } from './DialogLists.js';

/** Props for {@link TypedNameDialog}. */
export interface TypedNameDialogProps {
  /** At most five words, Title Case ("Drop Table?"). */
  readonly title: string;
  /** What happens and that it cannot be undone. */
  readonly message: ReactNode;
  /** The verb ("Drop Table"). */
  readonly confirmLabel: string;
  readonly icon: LucideIcon;
  /** The name to type, letter case included. */
  readonly name: string;
  /** The field's label ("Table name"). */
  readonly nameLabel: string;
  readonly items?: readonly DialogItem[];
  readonly itemIcon?: LucideIcon;
  readonly itemCount?: number;
  /** Labelled lists, each its label and count above a framed list (`ConfirmDialog`'s `groups`). */
  readonly groups?: ConfirmDialogProps['groups'];
  readonly statements?: ConfirmDialogProps['statements'];
  /** Facts about the action (where it runs). */
  readonly facts?: readonly DialogFact[];
  /** What the body holds before the name field: a choice the confirmation carries, or the reasons it asks. */
  readonly children?: ReactNode;
  readonly onConfirm: () => void;
  readonly onCancel: () => void;
  /**
   * The element the dialog mounts into, for a dialog that must paint above
   * something it is drawn inside; the enclosing `DialogLayer` otherwise
   * (`ModalDialog`'s `container`).
   */
  readonly container?: Element;
}

/**
 * The typed-name confirmation for work that cannot be undone where a slip
 * costs most: `ConfirmDialog` in the for-good anatomy (the verb on ⌥⌘⌫,
 * Return doing nothing), its verb off until the field under the lists holds
 * `name` exactly, letter case included. The field's note comes from
 * `UiokLabels.dialog.typeName`.
 */
export function TypedNameDialog({
  name,
  nameLabel,
  children,
  ...confirm
}: TypedNameDialogProps): ReactElement {
  const labels = useLabels().dialog;
  const fieldId = useId();
  const [typed, setTyped] = useState('');

  return (
    <ConfirmDialog {...confirm} confirmDisabled={typed !== name} forGood tone="danger">
      {children}
      <div className="field-grid">
        <label className="field-label" htmlFor={fieldId}>
          {nameLabel}
        </label>
        <div className="field-value">
          <input
            autoComplete="off"
            className="field"
            id={fieldId}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={name}
            spellCheck={false}
            value={typed}
          />
          <p className="field-note">{labels.typeName}</p>
        </div>
      </div>
    </ConfirmDialog>
  );
}
