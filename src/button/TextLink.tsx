import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_SM } from '../icon/sizes.js';
import { useInRow, type ControlVerb } from '../pane/PaneActions.js';
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
  /**
   * `danger`: what it opens is failing (a log file whose writes fail), so
   * its words and glyph take the danger tone, and its `tip` (the reason)
   * is its accessible description too, so a screen reader says why.
   */
  readonly tone?: 'danger';
  /**
   * What the keys run it for (`data-verb`, read by `verbControl`), for a link
   * in a listing row such as a service's port: there it leaves the Tab
   * order, as a row's `QuietAction` and `RowIconAction` do, so the cursor
   * row's keys reach it instead of Tab, and a press runs it without opening
   * the row. A `tabbable` row keeps it in the Tab order; outside a row it
   * changes nothing but the attribute.
   */
  readonly verb?: ControlVerb;
}

/**
 * A link in words: a button that reads as a link inside a sentence, a
 * section, or a status line, for a manual page or a place a sentence names.
 * It wears the accent's text colour and underlines under the pointer; it
 * takes the keyboard's focus with the shared ring. It is a button because
 * the host decides how to open what it names (an external browser, a tab),
 * so it never navigates the page itself. A `disabled` link dims and
 * refuses the press; `label` names it when its words are short; `tone`
 * `danger` sets it in the danger tone with its reason described. With a
 * `verb`, a link in a listing row is one of the row's controls: out of the
 * Tab order, reached by the cursor row's keys. Styled by `.text-link` in
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
  disabled = false,
  tone,
  verb
}: TextLinkProps): ReactElement {
  // A link the row's keys run is one of the row's controls.
  const rowControl = useInRow() && verb !== undefined;

  return (
    <button
      aria-description={tone === 'danger' ? tip : undefined}
      aria-label={label}
      className={['text-link', code ? 'code' : '', tone ?? ''].filter(Boolean).join(' ')}
      data-verb={verb}
      disabled={disabled}
      onClick={(event) => {
        // A row's control runs alone, never opening the row around it too.
        if (verb !== undefined) event.stopPropagation();
        onClick();
      }}
      tabIndex={rowControl ? -1 : undefined}
      type="button"
      {...(tip === undefined && shortcut === undefined ? {} : tooltip(tip ?? children, shortcut))}
    >
      {Icon === undefined ? null : <Icon aria-hidden size={ICON_SM} />}
      <span className="text-link-words">{children}</span>
    </button>
  );
}
