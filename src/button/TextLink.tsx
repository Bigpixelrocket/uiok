import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_SM } from '../icon/sizes.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

/** Props for {@link TextLink}. */
export interface TextLinkProps {
  /** The link's words, which are also its accessible name: "DROP DATABASE in the manual". */
  readonly children: string;
  /** What it opens: the host opens the manual page, the place, or the window. */
  readonly onClick: () => void;
  /** A glyph before the words (a book for a manual page), at the small icon size. */
  readonly icon?: LucideIcon;
  /** Sets the words in the code face, for a name or value inside a sentence. */
  readonly code?: boolean;
  /** The tooltip, when it says more than the words (the page's address). */
  readonly tip?: string;
  /** The chord that opens it, as text, written after the tooltip's words. */
  readonly shortcut?: string;
}

/**
 * A link in words: a button that reads as a link inside a sentence, a
 * section, or a status line, for a manual page or a place a sentence names.
 * It wears the accent's text colour and underlines under the pointer; it
 * takes the keyboard's focus with the shared ring. It is a button because
 * the host decides how to open what it names (an external browser, a tab),
 * so it never navigates the page itself. Styled by `.text-link` in
 * `@bigpixelrocket/uiok/styles.css`.
 */
export function TextLink({
  children,
  onClick,
  icon: Icon,
  code = false,
  tip,
  shortcut
}: TextLinkProps): ReactElement {
  return (
    <button
      className={code ? 'text-link code' : 'text-link'}
      onClick={onClick}
      type="button"
      {...(tip === undefined && shortcut === undefined ? {} : tooltip(tip ?? children, shortcut))}
    >
      {Icon === undefined ? null : <Icon aria-hidden size={ICON_SM} />}
      <span className="text-link-words">{children}</span>
    </button>
  );
}
