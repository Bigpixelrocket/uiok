import type { LucideIcon } from 'lucide-react';
import { Fragment, type ReactElement, type ReactNode } from 'react';

import { ICON_MD } from '../icon/sizes.js';
import type { DialogLabels } from '../labels/dialog.js';
import { useLabels } from '../labels/UiokProvider.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';
import { VisuallyHidden } from '../VisuallyHidden.js';

/**
 * One row of a dialog's fact list: what the fact is, and its value, read at
 * a glance ("Terminals", 6, "api, web, worker").
 */
export interface DialogFact {
  /** What the row counts or names, in the leading label column: "Terminals". */
  readonly label: string;
  /** A count, in its own column so the counts line up; the host formats it. */
  readonly count?: number | string;
  /**
   * The value: a few names ("api, web, worker"), or the value itself when
   * there is no count. A string value shows its full text in a tooltip
   * while it is cut; a node value passes its own `cutTooltip`.
   */
  readonly value?: ReactNode;
  /**
   * How many names the value leaves out. The row ends in "+N more"
   * (`dialog.moreItems`) after the value, never cut: a long value gives way
   * with an ellipsis first, so the row always says how many it omits.
   */
  readonly more?: number;
}

/** Props for {@link DialogFacts}. */
export interface DialogFactsProps {
  /** The rows, in the order they are read. */
  readonly facts: readonly DialogFact[];
  /** The list's accessible name, when the message above does not already say what it lists. */
  readonly label?: string;
  /** The list's id, for a dialog that names it as its description. */
  readonly id?: string;
}

/**
 * A confirmation's or alert's facts as a desktop property list: one line
 * per row, its label in a leading column, then an optional count in a
 * column of its own and the value, so labels, counts, and values each
 * line up. A label keeps to one line; a value wraps (after a separator
 * where it can) up to three lines before it is cut, a cut label or string
 * value carrying its full text in a tooltip; a row's "+N more" (`more`)
 * stays whole after its value. Facts are about the action (where it acts),
 * never the things it acts on, which are `DialogItems`. A list of
 * facts, not sentences: the message above says what they mean. Styled by
 * the `.dialog-facts` rules in `@bigpixelrocket/uiok/styles.css`.
 */
export function DialogFacts({ facts, label, id }: DialogFactsProps): ReactElement {
  const labels = useLabels().dialog;

  return (
    <dl aria-label={label} className="dialog-facts" id={id}>
      {facts.map((fact) => (
        <div className="dialog-fact" key={fact.label}>
          <dt className="dialog-label" {...cutTooltip(fact.label)}>
            {fact.label}
          </dt>
          <dd>
            {fact.count === undefined ? null : (
              <span className="dialog-fact-count">{fact.count}</span>
            )}
            <FactValue labels={labels} more={fact.more} value={fact.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * A fact's value cell: the value, wrapping before it is cut (a string one
 * carrying its full text in a tooltip while cut), then, when the value
 * leaves names out, "+N more" kept whole after it.
 */
function FactValue({
  labels,
  more,
  value
}: {
  readonly labels: DialogLabels;
  readonly more: number | undefined;
  readonly value: ReactNode;
}): ReactElement | null {
  const hasValue = value !== undefined && value !== null;
  const rest = more !== undefined && more > 0 ? labels.moreItems(more) : null;

  if (!hasValue && rest === null) return null;

  const tooltip = typeof value === 'string' ? cutTooltip(value) : {};
  const shown = typeof value === 'string' ? breakable(value) : value;

  if (rest === null) {
    return (
      <span className="dialog-value dialog-fact-value" {...tooltip}>
        {shown}
      </span>
    );
  }

  return (
    <span className="dialog-value dialog-fact-value dialog-fact-value-more">
      {hasValue && (
        <span className="dialog-fact-names" {...tooltip}>
          {shown}
        </span>
      )}
      <span className="dialog-fact-more">{rest}</span>
    </span>
  );
}

/**
 * One thing a confirmation acts on, as data: its name, an optional dim
 * detail, and its kind's glyph. The dialog draws it as one row of its
 * framed list (`DialogItems`).
 */
export interface DialogItem {
  /**
   * What identifies the item ("Production", "deploying.md"), set in
   * monospace. A long name wraps, up to three lines, before it is ever
   * cut, and a name still cut after three lines carries its whole text in
   * a tooltip.
   */
  readonly name: string;
  /**
   * One dim value at the row's end where the kind has one: a server's
   * host, a file's folder, a size. Leave it out when the kind has none.
   */
  readonly detail?: string;
  /** This item's glyph, when it differs from its list's `icon` (a folder among files). */
  readonly icon?: LucideIcon;
}

/**
 * One labelled list of a dialog that names several kinds of things (a
 * quit confirmation's running processes and open terminals): a short label
 * and its count above the same framed list.
 */
export interface DialogItemGroup {
  /** What the list holds, short, as a heading: "Running processes". */
  readonly label: string;
  /** The items, in the order they are read; only the first five are drawn. */
  readonly items: readonly DialogItem[];
  /** The kind's glyph, drawn on every row whose item names no other. */
  readonly icon?: LucideIcon;
  /**
   * How many there are in all, when the host passes only the first few
   * items; `items.length` unless given. Sets the heading's count and the
   * "+N more" row.
   */
  readonly count?: number;
}

/** Props for {@link DialogItems}. */
export interface DialogItemsProps {
  /** The items, in the order they are read; only the first five are drawn. */
  readonly items: readonly DialogItem[];
  /** The kind's glyph, drawn on every row whose item names no other. */
  readonly icon?: LucideIcon;
  /**
   * How many there are in all, when the host passes only the first few
   * items; `items.length` unless given. Sets the "+N more" row and the count
   * read with the list.
   */
  readonly count?: number;
  /**
   * The list's short label, drawn with its count above the frame, for a
   * dialog that names several groups. Without it the count is read by
   * assistive technology only (the dialog's lead already says it).
   */
  readonly label?: string;
  /** The block's id, for a dialog that names it in its description. */
  readonly id?: string;
}

/** How many rows a dialog's item list draws in full before it ends in "+N more". */
export const DIALOG_ITEMS_SHOWN = 5;

/**
 * Which of `count` items a dialog's list draws, and how many its last row
 * counts as "+N more": every item up to five, else the first five and the
 * rest counted. `count` may exceed `available` (a host that passes only the
 * first few); the list never draws more than it was given.
 */
export function shownItems(
  available: number,
  count: number = available
): { readonly shown: number; readonly more: number } {
  const total = Math.max(available, Math.floor(count));
  const shown = Math.min(available, total > DIALOG_ITEMS_SHOWN ? DIALOG_ITEMS_SHOWN : total);

  return { shown, more: total - shown };
}

/**
 * The things a confirmation acts on, as one framed list (a well): one row
 * per item with its kind's glyph, its name in monospace, and its dim detail
 * at the row's end. One item is a list of one row; up to five show in full,
 * and more show the first five and a last row "+N more" (`dialog.moreItems`),
 * so the list is never taller than six rows. A name wraps (up to three
 * lines) before it is cut. With a `label` the list is one of several
 * groups, headed by the label and its count; without one the count
 * (`dialog.itemCount`) is read before the names, so a dialog that names
 * this block in its description reads its lead, the count, then the names.
 * Styled by the `.dialog-items` rules in `@bigpixelrocket/uiok/styles.css`.
 */
export function DialogItems({ items, icon, count, label, id }: DialogItemsProps): ReactElement {
  const labels = useLabels().dialog;
  const total = Math.max(items.length, Math.floor(count ?? items.length));
  const { shown, more } = shownItems(items.length, total);

  return (
    <div className="dialog-items-block" id={id}>
      {label === undefined ? (
        <VisuallyHidden>{labels.itemCount(total)}</VisuallyHidden>
      ) : (
        <div className="dialog-items-head">
          <span className="dialog-label">{label}</span>
          <span className="dialog-items-count">{total.toLocaleString()}</span>
        </div>
      )}
      <ul aria-label={label ?? labels.affectedItems(total)} className="dialog-items">
        {items.slice(0, shown).map((item, index) => {
          const Glyph = item.icon ?? icon;

          return (
            // A name may repeat (two files of one name in different folders);
            // its place in a list fixed while the dialog is open is its identity.
            <li className="dialog-item" key={`${index}:${item.name}`}>
              {Glyph === undefined ? (
                <span aria-hidden="true" className="dialog-item-glyph" />
              ) : (
                <Glyph aria-hidden="true" className="dialog-item-glyph" size={ICON_MD} />
              )}
              <span className="dialog-item-name dialog-value" dir="auto" {...cutTooltip(item.name)}>
                {breakable(item.name)}
              </span>
              {item.detail === undefined || item.detail === '' ? null : (
                <span
                  className="dialog-item-detail dialog-value"
                  dir="auto"
                  {...cutTooltip(item.detail)}
                >
                  {breakable(item.detail)}
                </span>
              )}
            </li>
          );
        })}
        {more > 0 && <li className="dialog-item dialog-items-more">{labels.moreItems(more)}</li>}
      </ul>
    </div>
  );
}

/**
 * A name or path with a line-break chance after each separator (`/`, `_`,
 * `.`, `:`, `@`), so a wrapped path breaks between its folders and a long
 * identifier between its words before a line breaks inside a word. The text
 * reads and copies exactly as given: `<wbr>` adds no character.
 */
function breakable(text: string): ReactNode {
  const parts = text.split(/(?<=[/_.:@])(?=.)/u);

  return parts.length === 1
    ? text
    : parts.map((part, index) => (
        <Fragment key={index}>
          {index > 0 && <wbr />}
          {part}
        </Fragment>
      ));
}

/** Props for {@link DialogNames}. */
export interface DialogNamesProps {
  /** The names or paths, in the order they are listed. */
  readonly names: readonly string[];
  /**
   * Ignored: the list always shows five rows in full and then "+N more".
   * Kept so existing callers still compile.
   *
   * @deprecated The rule is fixed; leave it out.
   */
  readonly max?: number;
  /** The block's id, for a dialog that names it as its description. */
  readonly id?: string;
}

/**
 * Names without a kind, drawn as `DialogItems` with no glyph and no detail:
 * the same framed list, five rows in full, then "+N more".
 *
 * @deprecated Pass items to `DialogItems` (or `ConfirmDialog`'s `items`)
 * with the kind's glyph and a detail where the kind has one.
 */
export function DialogNames({ names, id }: DialogNamesProps): ReactElement {
  return <DialogItems id={id} items={names.map((name) => ({ name }))} />;
}
