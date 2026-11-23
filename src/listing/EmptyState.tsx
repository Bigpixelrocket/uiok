import type { LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { ICON_XL } from '../icon/sizes.js';

/** One step of an empty state's way in: its words and a quieter line under them. */
export interface EmptyStateStep {
  /** What to do ("Pick a folder"). */
  readonly title: string;
  /** More about it ("any folder of this Mac"). */
  readonly detail?: string;
}

/** Props for {@link EmptyState}. */
export interface EmptyStateProps {
  /** The glyph over the title, in the faint tone (the danger tone for a `failure`). */
  readonly icon?: LucideIcon;
  /** A mark of the host's own in place of the glyph (a `BrandMark`), drawn at the glyph's place. */
  readonly mark?: ReactNode;
  /** What the pane is waiting for, or what went wrong, as its heading. */
  readonly title: string;
  /** A sentence on what the pane is for or what went wrong. */
  readonly body?: ReactNode;
  /** Its ways on: `Button`s, one primary at most, in a row that wraps. */
  readonly actions?: ReactNode;
  /** A quiet line under the actions (where an import would come from). */
  readonly note?: ReactNode;
  /** What the system returned, last, in the code face (an error, the tools found). */
  readonly detail?: ReactNode;
  /** The way in as numbered steps, side by side under the rest. */
  readonly steps?: readonly EmptyStateStep[];
  /** The pane could not load: announced as an alert, its glyph in the danger tone. */
  readonly failure?: boolean;
}

/**
 * A pane with nothing in it yet (no projects, nothing installed) or one
 * that could not load: one block centred between its path bar and its
 * status line, its glyph, its heading, a sentence, its ways on, then a note,
 * what the system returned, and the way in as numbered steps. Its words can
 * be selected and copied. A list that is merely empty (a folder with no
 * entries, a filter that matches nothing) says so with a quiet `PageNote`
 * or a listing's `empty` instead.
 */
export function EmptyState({
  icon: Icon,
  mark,
  title,
  body,
  actions,
  note,
  detail,
  steps,
  failure = false
}: EmptyStateProps): ReactElement {
  return (
    <div className="pane-empty" role={failure ? 'alert' : undefined}>
      {mark ?? (Icon === undefined ? null : <Icon aria-hidden size={ICON_XL} />)}
      <h2>{title}</h2>
      {body === undefined ? null : <p>{body}</p>}
      {actions === undefined ? null : <div className="pane-empty-actions">{actions}</div>}
      {note === undefined ? null : <p className="pane-empty-note">{note}</p>}
      {detail === undefined ? null : <p className="pane-empty-detail">{detail}</p>}
      {steps === undefined || steps.length === 0 ? null : (
        <ol className="pane-empty-steps">
          {steps.map((step, index) => (
            <li className="pane-empty-step" key={step.title}>
              <span aria-hidden className="pane-empty-step-number">
                {index + 1}
              </span>
              <span className="pane-empty-step-text">
                <span className="pane-empty-step-title">{step.title}</span>
                {step.detail === undefined ? null : (
                  <span className="pane-empty-step-detail">{step.detail}</span>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
