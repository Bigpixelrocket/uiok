import type { LucideIcon } from 'lucide-react';
import { createContext, useContext, type ReactElement, type Ref } from 'react';

import { ICON_SM } from '../icon/index.js';
import { describedTooltip, tooltip } from '../tooltip/Tooltip.logic.js';

/**
 * How a set of compact links draws: icons alone, words alone, or both, as a
 * user's icon-or-text preference chooses.
 */
export type LinkLook = 'icons' | 'text' | 'both';

/**
 * How the `RowIconAction`s under it, and the `QuietAction`s in its rows and
 * path bars, draw. An app whose rows follow a preference provides it; icons
 * alone without one, each word kept as the control's tooltip and name. A
 * `Listing` whose grid is a function of the look steps it down to a plainer
 * one when its words would make it scroll sideways.
 */
export const RowLinkLookContext = createContext<LinkLook>('icons');

/**
 * Set inside a listing row, whose controls the cursor row's keys reach. The
 * listing's `Row` provides it, true unless the row keeps its controls in the
 * Tab order (`tabbable`).
 */
export const InRowContext = createContext(false);

/**
 * Whether a control sits in a listing row. Such a control leaves the Tab
 * order: the cursor row's keys run it (Return, ⌘⌫, `.`, ⌘⏎), and Tab moves
 * between panes and the page's other controls instead of through every row.
 */
export const useInRow = (): boolean => useContext(InRowContext);

/**
 * Set inside every listing row, a `tabbable` one included, whose
 * `QuietAction`s follow `RowLinkLookContext` whether or not they keep their
 * Tab stop. Internal to the library; not part of the package's surface.
 */
export const InListingRowContext = createContext(false);

/**
 * Set inside a path bar's tools (`PanePathBar`'s children), whose
 * `QuietAction`s are toolbar items and follow `RowLinkLookContext` as a
 * row's do. Internal to the pane area; not part of the package's surface.
 */
export const InPathBarContext = createContext(false);

/**
 * What the keys run a control for, read by `verbControl` off the rendered
 * pane. A row's control carries it as `data-verb`; a path bar's controls
 * name the page's verbs with `data-page-verb` instead. Several verbs on one
 * control are separated by spaces (`enter reveal`). The conventional ones
 * `paneKeyAction` asks for are `enter` (Return), `remove` (⌘⌫), `reveal`
 * (`.`), `toggle` (⌘⏎), and `restart` (⌥⌘⏎); an app adds its own (`edit`,
 * `clear`, `toggle-all`) for the chords it maps.
 */
export type ControlVerb = string;

/** Props for {@link QuietAction}. */
export interface QuietActionProps {
  readonly icon: LucideIcon;
  /** The verb it shows ("Remove"), also its `data-word` for a key legend. */
  readonly word: string;
  /** The accessible name, which names the target ("Remove PostgreSQL 17"). */
  readonly label: string;
  /** Its bar's lead action: a weight up, its glyph in the accent. */
  readonly lit?: boolean;
  readonly disabled?: boolean;
  /**
   * The tooltip, also its accessible description. Drawn as a glyph alone,
   * the action names itself in a tooltip of its `word` when this is not
   * given; drawn with its word, it has none without this.
   */
  readonly tip?: string;
  /** The chord that runs it, which its tooltip names after its words ("⌥↩"). */
  readonly shortcut?: string;
  readonly onClick: () => void;
  readonly ref?: Ref<HTMLButtonElement>;
  /**
   * Inert but still focusable (`aria-disabled`), for a control whose dialog
   * hands the focus back to it when it closes.
   */
  readonly softDisabled?: boolean;
  /** What the cursor row's keys run it for (`ControlVerb`). */
  readonly verb?: ControlVerb;
  /** What the page's chords run it for, as a path bar's control. */
  readonly pageVerb?: ControlVerb;
  /**
   * Which of several controls on one verb this is ("start", "stop"), for
   * logic that must tell them apart without reading the translated `word`.
   */
  readonly action?: string;
  /**
   * A destructive action (Remove, Drop, Delete): quiet at rest, in the
   * danger tone under the pointer, with the focus, and on the cursor row.
   */
  readonly danger?: boolean;
}

/**
 * A row's one quiet action, or a compact control in a path bar: in the dim
 * tone at rest, in full words on the cursor row (and as a path bar's lead
 * action, `lit`). In a row or a path bar it draws as `RowLinkLookContext`
 * says: a glyph alone by default (`icons`), with its word as its tooltip
 * (and its `shortcut` after it) and kept for assistive technology in
 * `.pane-act-word`; its glyph and word where the host's look asks for words
 * (`text` or `both`; the glyph stays, so a tight bar that hides the word
 * still draws it), in a `tabbable` row as in any other. Anywhere else it
 * draws its glyph and word. In a row it leaves the Tab order (`useInRow`)
 * unless the row is `tabbable`, and a press never reaches the row's own
 * `onOpen`. Drawn by `.pane-act` in the listing
 * look, `.pane-act.wordless` for the glyph alone.
 */
export function QuietAction({
  icon: Icon,
  word,
  label,
  lit = false,
  disabled = false,
  tip,
  shortcut,
  onClick,
  ref,
  softDisabled = false,
  verb,
  pageVerb,
  action,
  danger = false
}: QuietActionProps): ReactElement {
  const inRow = useInRow();
  const inListingRow = useContext(InListingRowContext);
  const inBar = useContext(InPathBarContext);
  const chosen = useContext(RowLinkLookContext);
  // A tabbable row keeps its controls in the Tab order but draws them as rows do.
  const look: LinkLook = inRow || inListingRow || inBar ? chosen : 'both';
  // A glyph alone names itself in a tooltip of its word.
  const shownTip = tip ?? (look === 'icons' ? word : undefined);

  return (
    <button
      aria-disabled={softDisabled || undefined}
      aria-label={label}
      className={[
        'pane-act',
        look === 'icons' ? 'wordless' : '',
        lit ? 'lit' : '',
        danger ? 'danger' : ''
      ]
        .filter(Boolean)
        .join(' ')}
      data-action={action}
      data-page-verb={pageVerb}
      data-verb={verb}
      data-word={word}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!softDisabled) onClick();
      }}
      ref={ref}
      tabIndex={inRow ? -1 : undefined}
      type="button"
      {...(shownTip === undefined ? {} : describedTooltip(shownTip))}
      {...(shownTip === undefined || shortcut === undefined
        ? {}
        : { 'data-tooltip-shortcut': shortcut })}
    >
      <Icon aria-hidden size={ICON_SM} />
      {/* The verb in a box of its own, which the glyph-alone look and a
          tight bar hide accessibly (`.pane-act-word`). */}
      <span className="pane-act-word">{word}</span>
    </button>
  );
}

/** Props for {@link RowIconAction}. */
export interface RowIconActionProps {
  readonly icon: LucideIcon;
  /** The accessible name ("Show PHP 8.4.12 in Finder"). */
  readonly label: string;
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly ref?: Ref<HTMLButtonElement>;
  /** Inert but still focusable, as on `QuietAction`. */
  readonly softDisabled?: boolean;
  /** The tooltip; the accessible name unless it says more (a path). */
  readonly tip?: string;
  /** What the cursor row's keys run it for (`ControlVerb`). */
  readonly verb?: ControlVerb;
  /**
   * The verb a key legend names it by ("Start", "Reveal"); under a
   * `RowLinkLookContext` of words, the word it draws.
   */
  readonly word?: string;
  /** A destructive action, drawn as on `QuietAction`. */
  readonly danger?: boolean;
}

/**
 * A compact icon control: in a row, one that shows on its row's hover, its
 * keyboard focus, and the cursor (Reveal, a secondary Start or Remove), so
 * a row keeps one visible action; at a status line's end, Reveal or Copy.
 * In a row it leaves the Tab order (`useInRow`). Drawn by `.pane-icon-act`
 * in the listing look. Under `RowLinkLookContext` an action that names its
 * verb (`word`, a row link) draws it in place of the icon or beside it.
 */
export function RowIconAction({
  icon: Icon,
  label,
  disabled = false,
  onClick,
  ref,
  softDisabled = false,
  tip = label,
  verb,
  word,
  danger = false
}: RowIconActionProps): ReactElement {
  const inRow = useInRow();
  const chosen = useContext(RowLinkLookContext);
  // Only an action that names its verb draws it in words.
  const look = word === undefined ? 'icons' : chosen;

  return (
    <button
      aria-disabled={softDisabled || undefined}
      aria-label={label}
      className={['pane-icon-act', look === 'icons' ? '' : 'worded', danger ? 'danger' : '']
        .filter(Boolean)
        .join(' ')}
      data-verb={verb}
      data-word={word}
      disabled={disabled}
      onClick={(event) => {
        event.stopPropagation();
        if (!softDisabled) onClick();
      }}
      ref={ref}
      tabIndex={inRow ? -1 : undefined}
      type="button"
      {...(look !== 'icons' && tip === word
        ? {}
        : tip === label
          ? tooltip(label)
          : describedTooltip(tip))}
    >
      {look !== 'text' && <Icon aria-hidden size={ICON_SM} />}
      {look !== 'icons' && <span>{word}</span>}
    </button>
  );
}
