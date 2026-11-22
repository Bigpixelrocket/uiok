import type { ReactElement } from 'react';

import { describedTooltip } from '../tooltip/Tooltip.logic.js';

/**
 * A tag's tone: `neutral` a plain fact, `accent` a mark of note, `ready` a
 * place that is safe or working, `warning` one that needs a second look, and
 * `danger` one where a mistake costs most.
 */
export type TagTone = 'neutral' | 'accent' | 'ready' | 'warning' | 'danger';

/** Props for {@link Tag}. */
export interface TagProps {
  /** The tag's words ("Production", "Template", "default"). */
  readonly children: string;
  /** The tone; `neutral` by default. */
  readonly tone?: TagTone;
  /** Sets the words in small capitals, as a release channel's tag. */
  readonly caps?: boolean;
  /** More than the words say, as a tooltip and the tag's accessible description. */
  readonly tip?: string;
}

/**
 * A small worded tag beside a name: an environment, a kind ("Template",
 * "System"), a default, a pending state. A pill washed in its tone with the
 * words in the tone's text colour, legible on a cursor or marked row too.
 * Draws `.tag[data-tone]` (`.caps`); the words keep their case unless
 * `caps`.
 */
export function Tag({ children, tone = 'neutral', caps = false, tip }: TagProps): ReactElement {
  return (
    <span className={caps ? 'tag caps' : 'tag'} data-tone={tone} {...describedTooltip(tip)}>
      {children}
    </span>
  );
}
