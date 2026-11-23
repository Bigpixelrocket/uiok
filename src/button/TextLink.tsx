import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_SM } from '../icon/sizes.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

/** Props for {@link TextLink}. */
export interface TextLinkProps {
  /**
   * The link's words, which are also its accessible name unless `label`
   * gives one: "DROP DATABASE in the manual".
   */
  readonly children: string;
  /**
   * The accessible name, when the words alone do not say what the link
   * opens: "View the whole log" for a strip's "View". The words stay what
   * the eye reads; the name is what a screen reader says.
   */
  readonly label?: string;
  /**
   * Refuses the press for now (nothing to open yet): the words dim, the
   * pointer underlines nothing, and the link leaves the Tab order, as
   * every disabled button does.
   */
  readonly disabled?: boolean;
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
 * so it never navigates the page itself. A `disabled` link dims and
 * refuses the press; `label` names it when its words are short. Styled by `.text-link` in
 * `@bigpixelrocket/uiok/styles.css`.
 */
export function TextLink({
  children,
  onClick,
  icon: Icon,
  code = false,
  tip,
  shortcut,
  label,
  disabled = false
}: TextLinkProps): ReactElement {
  return (
    <button
      aria-label={label}
      className={code ? 'text-link code' : 'text-link'}
      disabled={disabled}
      onClick={onClick}
      type="button"
      {...(tip === undefined && shortcut === undefined ? {} : tooltip(tip ?? children, shortcut))}
    >
      {Icon === undefined ? null : <Icon aria-hidden size={ICON_SM} />}
      <span className="text-link-words">{children}</span>
    </button>
  );
}
