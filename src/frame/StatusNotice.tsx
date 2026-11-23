import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_SM } from '../icon/sizes.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';

/** A status notice's tone: plain news, a failure, or an outcome that went well. */
export type StatusNoticeTone = 'info' | 'danger' | 'success';

/** Props for {@link StatusNotice}. */
export interface StatusNoticeProps {
  readonly tone?: StatusNoticeTone;
  /** The tone's glyph. */
  readonly icon: LucideIcon;
  /** The message, on one line, cut with an ellipsis and whole in its tooltip. */
  readonly text: string;
}

/**
 * A message about the window (an outcome, a step the host refused) as a
 * pane's status line while it stands, in place of the line's own words
 * (`PaneStatus`'s children): the tone's glyph and the words in the text
 * colour on one line, a failure announced as an alert and anything else as
 * a status. Its verbs (Show, Close) go in the status line's tools.
 */
export function StatusNotice({ tone = 'info', icon: Icon, text }: StatusNoticeProps): ReactElement {
  return (
    <span
      className={tone === 'info' ? 'status-notice' : `status-notice ${tone}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <Icon aria-hidden size={ICON_SM} />
      <span className="status-notice-text" {...cutTooltip(text)}>
        {text}
      </span>
    </span>
  );
}
