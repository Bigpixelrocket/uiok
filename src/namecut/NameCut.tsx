import { Fragment, type ReactElement } from 'react';

import { tooltip } from '../tooltip/Tooltip.logic.js';
import { partsText, type CutPart } from './NameCut.logic.js';

/** Props for {@link NameCut}. */
export interface NameCutProps {
  /** The line in parts (`labelParts`, `nameParts`). */
  readonly parts: readonly CutPart[];
  /** The box's own class, which sets its type, colour, and size where it is drawn. */
  readonly className?: string;
}

/**
 * A line that names a file, cut so the name keeps its end (`labelParts`,
 * `nameParts`): a long name's head gives way with an ellipsis, the words
 * after the name give way at their end alongside it, the words before it
 * give way at their end only once both have gone as far as they go, and
 * the name's tail, at its front, only once those words have too, so the
 * line always ends in view. A line with a cut name is drawn in parts for
 * sight only, and assistive technology reads it whole once; a line of words
 * alone is drawn and read as it is. The tooltip carries the complete line,
 * including the words around the name. Styled by the `.name-cut` rules;
 * `className` sets the line's type and colour where it is drawn.
 */
export function NameCut({ parts, className }: NameCutProps): ReactElement {
  // Split spans can be read as separate runs, so a cut line is read from
  // one hidden copy; words alone are one span already.
  const cut = parts.some((part) => part.kind === 'name');
  const text = partsText(parts);

  return (
    <span className={className ? `name-cut ${className}` : 'name-cut'} {...tooltip(text)}>
      {cut && <span className="visually-hidden">{text}</span>}
      <span aria-hidden={cut || undefined} className="name-cut-line">
        {parts.map((part, index) =>
          // A line's parts are fixed in order; their place is their identity.
          part.kind === 'text' ? (
            <span
              // The words that end the line give way alongside a name's
              // head; the words before a name only after both have.
              className={index === parts.length - 1 ? 'name-cut-rest' : 'name-cut-text'}
              key={index}
            >
              {part.text}
            </span>
          ) : (
            // Head and tail sit in the line itself, so its flex sizes them
            // against the words around them.
            <Fragment key={index}>
              {part.head !== '' && <span className="name-cut-head">{part.head}</span>}
              {/* The box runs right to left for its ellipsis; the name
                  inside keeps its own order, as the head does. */}
              <span className="name-cut-tail">
                <bdi dir="ltr">{part.tail}</bdi>
              </span>
            </Fragment>
          )
        )}
      </span>
    </span>
  );
}
