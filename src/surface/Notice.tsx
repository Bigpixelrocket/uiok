import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { ICON_MD } from '../icon/sizes.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';

/**
 * A notice's tone: `note` a plain fact, `success` a step that worked,
 * `warning` a state that needs a second look, `danger` a failure.
 */
export type NoticeTone = 'note' | 'success' | 'warning' | 'danger';

/** Props for {@link Notice}. */
export interface NoticeProps {
  /** The words: a sentence, which may hold `<code>` for a server's or a system's own words. */
  readonly children: ReactNode;
  /** The tone; `note` by default. */
  readonly tone?: NoticeTone;
  /**
   * What leads the line: by default the tone's glyph (Info, CircleCheck,
   * TriangleAlert, CircleAlert); another node in its place (a `Spinner`
   * while work runs); or `null` for none.
   */
  readonly glyph?: ReactNode;
  /** Small buttons after the words, centred on their first line (a Reload, a Retry). */
  readonly actions?: ReactNode;
  /**
   * Sets the notice as the window's status line under a header: one line at
   * the window's inset with a hairline under it, its words cut with an
   * ellipsis in a narrow window and given whole as a tooltip. Give
   * `cutText` the words as plain text for that tooltip.
   */
  readonly band?: boolean;
  /** The words as plain text, for the tooltip a `band` shows while it cuts them. */
  readonly cutText?: string;
  /**
   * The live-region role: `status` (the default) for a line assistive
   * technology reads when it changes, `alert` for a failure it reads at
   * once, or `null` for a notice that is part of the page as it loads.
   */
  readonly role?: 'status' | 'alert' | null;
}

const TONE_GLYPH = {
  note: Info,
  success: CircleCheck,
  warning: TriangleAlert,
  danger: CircleAlert
} as const;

/**
 * An application's status line, never a web page's alert: a small glyph in
 * the tone's colour, the words in the text colour, and optional small
 * buttons after them, with no fill, frame, or side bar. It sits on the
 * surface it is about (a step, a field, a pane), or, as a `band`, under a
 * window's header until its cause goes. Draws `.notice` (`.notice-danger`,
 * `.notice-warning`, `.notice-success`, `.notice-card`).
 */
export function Notice({
  children,
  tone = 'note',
  glyph,
  actions,
  band = false,
  cutText,
  role = 'status'
}: NoticeProps): ReactElement {
  const Glyph = TONE_GLYPH[tone];
  const classes = ['notice'];
  if (tone !== 'note') classes.push(`notice-${tone}`);
  if (band) classes.push('notice-card');

  return (
    <div className={classes.join(' ')} role={role ?? undefined}>
      {glyph === undefined ? (
        <Glyph aria-hidden size={ICON_MD} />
      ) : glyph === null ? null : (
        <span aria-hidden className="notice-glyph">
          {glyph}
        </span>
      )}
      <span className="notice-text" {...(band ? cutTooltip(cutText) : {})}>
        {children}
      </span>
      {actions ? <span className="notice-actions">{actions}</span> : null}
    </div>
  );
}
