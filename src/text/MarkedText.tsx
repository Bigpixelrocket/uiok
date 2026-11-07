import type { ReactElement } from 'react';

import { highlightSegments } from './highlightSegments.js';

/** Props for {@link MarkedText}. */
export interface MarkedTextProps {
  readonly text: string;
  /** The matched UTF-16 code unit indices, ascending (`highlightSegments`). */
  readonly positions: readonly number[];
}

/**
 * Text with the characters a fuzzy match hit marked in place: a listing's
 * names under a filter, a menu's or a palette's rows under a query. The marks
 * only tint behind the text (`.name-hit`), so a name keeps the colour it
 * already carries.
 */
export function MarkedText({ text, positions }: MarkedTextProps): ReactElement {
  return (
    <>
      {highlightSegments(text, positions).map((segment, index) =>
        segment.hit ? (
          <span className="name-hit" key={index}>
            {segment.text}
          </span>
        ) : (
          segment.text
        )
      )}
    </>
  );
}
