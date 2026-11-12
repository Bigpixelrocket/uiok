import type { ReactElement, ReactNode } from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import { NameCut } from '../namecut/NameCut.js';
import { nameParts } from '../namecut/NameCut.logic.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';

/** The most lines a name list shows when no `max` is given, its "+N more" line included. */
const DEFAULT_MAX_NAMES = 5;

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
   * while it is cut.
   */
  readonly value?: ReactNode;
}

/** Props for {@link DialogFacts}. */
export interface DialogFactsProps {
  /** The rows, in the order they are read. */
  readonly facts: readonly DialogFact[];
  /** The list's accessible name, when the message above does not already say what it lists. */
  readonly label?: string;
}

/**
 * A confirmation's or alert's facts as a desktop property list: one line
 * per row, its label in a leading column, then an optional count in a
 * column of its own and the value, so labels, counts, and values each
 * line up. Every part keeps to its one line, cut with an ellipsis, a cut
 * label or string value carrying its full text in a tooltip. A list of
 * facts, not sentences: the message above says what they mean. Styled by
 * the `.dialog-facts` rules in `@bigpixelrocket/uiok/styles.css`.
 */
export function DialogFacts({ facts, label }: DialogFactsProps): ReactElement {
  return (
    <dl aria-label={label} className="dialog-facts">
      {facts.map((fact) => (
        <div className="dialog-fact" key={fact.label}>
          <dt className="dialog-label" {...cutTooltip(fact.label)}>
            {fact.label}
          </dt>
          <dd>
            {fact.count === undefined ? null : (
              <span className="dialog-fact-count">{fact.count}</span>
            )}
            {fact.value === undefined || fact.value === null ? null : (
              <span
                className="dialog-value dialog-fact-value"
                {...(typeof fact.value === 'string' ? cutTooltip(fact.value) : {})}
              >
                {fact.value}
              </span>
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Props for {@link DialogNames}. */
export interface DialogNamesProps {
  /** The names or paths, in the order they are listed. */
  readonly names: readonly string[];
  /**
   * The most lines the list shows, its "+N more" line included; five
   * unless given. A list of more names shows one fewer and ends in "+N more".
   */
  readonly max?: number;
}

/**
 * The items a confirmation acts on ("these 7 items"), one line each, in
 * monospace: a long name or path is cut in its middle (`NameCut`), so its
 * start and its file name both stay in view. The list keeps a fixed
 * height: past `max` lines it shows the first names and ends in a "+N
 * more" line (`dialog.moreItems`), so it never grows into a tall block.
 * Named for assistive technology by `dialog.affectedItems`. Styled by the
 * `.dialog-names` rules in `@bigpixelrocket/uiok/styles.css`.
 */
export function DialogNames({ names, max = DEFAULT_MAX_NAMES }: DialogNamesProps): ReactElement {
  const labels = useLabels().dialog;
  const limit = Math.max(1, Math.floor(max));
  const shown = names.length > limit ? names.slice(0, limit - 1) : names;
  const more = names.length - shown.length;

  return (
    <ul aria-label={labels.affectedItems(names.length)} className="dialog-names">
      {shown.map((name, index) => (
        // A name may repeat (two files of one name in different lists); its
        // place in a list fixed while the dialog is open is its identity.
        <li key={`${index}:${name}`}>
          <NameCut parts={nameParts([{ name }])} />
        </li>
      ))}
      {more > 0 && <li className="dialog-names-more">{labels.moreItems(more)}</li>}
    </ul>
  );
}
