import type { LucideIcon } from 'lucide-react';
import { useId, type ReactElement, type ReactNode } from 'react';

import type { Chord } from '../keyboard/Keyboard.logic.js';
import { useLabels } from '../labels/UiokProvider.js';
import type { DialogLegendModel } from './DialogLegend.logic.js';
import {
  DialogFacts,
  DialogItems,
  DialogStatements,
  type DialogFact,
  type DialogItem,
  type DialogItemGroup,
  type DialogStatementsProps
} from './DialogLists.js';
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
   * strip ("Delete Now?"), with no count, name, or path the body shows;
   * a title too long is cut with an ellipsis, never wrapped.
   */
  readonly title: string;
  /**
   * The lead: one sentence that says what will happen and to how many
   * things ("This removes 3 servers from the list."), and, where it matters,
   * one more that says what will not happen or cannot be undone. Text, or
   * with a word set apart in bold (`<strong>`). Leave it out (or pass `''`)
   * only when the title says all there is: no empty paragraph is drawn.
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
   * The things the action acts on, as data: each item's name, an optional
   * dim detail (a host, a folder, a size), and a glyph where it differs
   * from `itemIcon`. The dialog draws them as one framed list under the
   * lead, five rows in full and then "+N more" (`DialogItems`). One item is
   * a list of one row: never a fact row.
   */
  readonly items?: readonly DialogItem[];
  /** The kind's glyph on every item row that names no other (a server, a file). */
  readonly itemIcon?: LucideIcon;
  /**
   * How many things the action acts on in all, when `items` holds only the
   * first few; `items.length` unless given.
   */
  readonly itemCount?: number;
  /**
   * Labelled lists, for a confirmation that names several kinds of things
   * (a quit's running processes and open terminals): each its label and
   * count above the same framed list. Drawn after `items`.
   */
  readonly groups?: readonly DialogItemGroup[];
  /**
   * The statements the action runs (a batch of SQL), every one of them,
   * under its own short label: `{ label: 'SQL', lines }`. Drawn whole,
   * after the items and groups, in a framed block that scrolls on its own
   * past about eight lines (`DialogStatements`); never sliced.
   */
  readonly statements?: Omit<DialogStatementsProps, 'id'>;
  /**
   * Facts about the action itself, never the things it acts on: where it
   * acts, what it costs ("Where", a folder). One-line rows of a label and a
   * value (`DialogFacts`), under the items.
   */
  readonly facts?: readonly DialogFact[];
  /**
   * Paths the action touches, drawn as `items`: each path's last part as
   * the name and its folder as the detail, with `itemIcon`.
   *
   * @deprecated Pass `items` with the kind's glyph and detail.
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
 * side-effect-bearing actions, with the same four parts whether it acts on
 * one thing or a thousand: a one-line title naming the action, the lead
 * sentence, the items as one framed list (`items`, then any labelled
 * `groups`, five rows in full and then "+N more"), any statements it runs
 * in full (`statements`), then the legend's esc
 * Cancel (or the leave verb named) and the named action at the right edge,
 * on Return, or on ⌥⌘⌫ with Return running nothing for a delete that cannot
 * be undone (`forGood`). Facts about the action and a choice the caller
 * draws sit under them. A dialog with items or statements is the medium
 * width, whatever their number. Its description (`aria-describedby`) reads the
 * lead, then the count, then the names; without a lead or items the facts
 * describe it. Styled by the `.confirm-dialog` rules in
 * `@bigpixelrocket/uiok/styles.css`; reads the `dialog` labels.
 */
export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  cancelLabel,
  icon,
  tone = 'danger',
  items,
  itemIcon,
  itemCount,
  groups = [],
  statements,
  facts = [],
  paths,
  children,
  className,
  forGood = false,
  onConfirm,
  onCancel
}: ConfirmDialogProps): ReactElement {
  const labels = useLabels().dialog;
  const labelId = useId();
  const messageId = useId();
  const itemsId = useId();
  const factsId = useId();
  // An empty message draws nothing, so the dialog is described by what it does draw.
  const hasMessage =
    message !== undefined && message !== null && message !== false && message !== '';
  const list = items ?? paths?.map(pathItem) ?? [];
  const hasItems = list.length > 0 || groups.length > 0;
  const hasStatements = statements !== undefined && statements.lines.length > 0;
  const described = [hasMessage ? messageId : null, hasItems ? itemsId : null].filter(
    (part) => part !== null
  );
  const describedBy =
    described.length > 0 ? described.join(' ') : facts.length > 0 ? factsId : undefined;
  const legend: DialogLegendModel = {
    leave: { label: cancelLabel ?? labels.cancel },
    primary: forGood
      ? { label: confirmLabel, chord: DELETE_IMMEDIATELY, onRun: onConfirm }
      : { label: confirmLabel, onRun: onConfirm }
  };

  return (
    <ModalDialog
      className={['confirm-dialog', hasItems || hasStatements ? 'confirm-items' : null, className]
        .filter(Boolean)
        .join(' ')}
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
      {hasItems && (
        <div className="confirm-items-lists" id={itemsId}>
          {list.length > 0 && <DialogItems count={itemCount} icon={itemIcon} items={list} />}
          {groups.map((group) => (
            <DialogItems
              count={group.count}
              icon={group.icon}
              items={group.items}
              key={group.label}
              label={group.label}
            />
          ))}
        </div>
      )}
      {hasStatements && <DialogStatements label={statements.label} lines={statements.lines} />}
      {facts.length > 0 && <DialogFacts facts={facts} id={factsId} />}
      {children}
    </ModalDialog>
  );
}

/**
 * A path as an item: its last part is the name, the folder that holds it
 * the detail ("deploying.md" in "~/projects/site/docs").
 */
function pathItem(path: string): DialogItem {
  const trimmed = path.length > 1 ? path.replace(/\/+$/, '') : path;
  const cut = trimmed.lastIndexOf('/');

  return cut <= 0 || cut === trimmed.length - 1
    ? { name: path }
    : { name: trimmed.slice(cut + 1), detail: trimmed.slice(0, cut) };
}
