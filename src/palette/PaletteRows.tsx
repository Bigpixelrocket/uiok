import type { ReactElement, ReactNode, Ref } from 'react';

import { CurrentDot } from '../listing/CurrentDot.js';
import { cutTooltip } from '../tooltip/Tooltip.logic.js';

/** Props for {@link PaletteList}. */
export interface PaletteListProps {
  /** The listbox's id, which `PaletteQuery`'s `listId` names. */
  readonly id: string;
  /** The list's accessible name: "Runtimes", "PHP versions". */
  readonly label: string;
  /** Its rows: `PaletteOption`s, `PaletteHeading`s, and a `PaletteNote` when it is empty. */
  readonly children: ReactNode;
}

/**
 * A palette's list: the listbox its query field drives, seventeen rows tall
 * at most and fading the edge that has more (`.folder-menu-options`). The
 * caller filters and orders the rows and keeps the cursor.
 */
export function PaletteList({ id, label, children }: PaletteListProps): ReactElement {
  return (
    <div aria-label={label} className="folder-menu-options" id={id} role="listbox">
      {children}
    </div>
  );
}

/**
 * How a row's context reads: a `path` gives way at its start so the folder
 * it ends in stays; a `sentence` (what the item is) and a `command` (what a
 * script runs, in the code face) give way at their end.
 */
export type PaletteContextKind = 'path' | 'sentence' | 'command';

/** Props for {@link PaletteOption}. */
export interface PaletteOptionProps {
  /** The row's id, which the query field names as its active descendant while it is the cursor. */
  readonly id: string;
  /** The row's name: words, or `MarkedText` with the query's matches lit. */
  readonly name: ReactNode;
  /** The row's accessible name, when `name` is not a string. */
  readonly label?: string;
  /** The glyph in the icon column (a `ProductMark`, a lucide icon), decorative. */
  readonly mark?: ReactNode;
  /** What the row says after its name, quieter: where the item is, or what it does. */
  readonly context?: string;
  /** How the context reads and gives way; a sentence when absent. */
  readonly contextKind?: PaletteContextKind;
  /** The trailing column: a version, a count (words in the quiet tone), or a `KeyChord`. */
  readonly trail?: ReactNode;
  /**
   * Marks the row's item as the current one (the version in use, the place
   * shown), with what current means here ("Installed", "Shown") as the dot's
   * name: a `CurrentDot` after the trail.
   */
  readonly current?: string | null;
  /** The keyboard's cursor stands on it: the cursor fill and bar. */
  readonly cursor?: boolean;
  /**
   * It cannot be picked (already added, taken): dimmed, passed over by the
   * keys and the pointer, and its press refused. Say why in `description`.
   */
  readonly disabled?: boolean;
  /**
   * Read after the name by assistive technology, in place of what the row
   * derives: its context, a trail in words, and what `current` means, in
   * that order. Give it to say why the row is disabled, or to word a trail
   * that is not text (a `KeyChord`); an empty string reads nothing after
   * the name.
   */
  readonly description?: string;
  /** A press picks it; never called while it is disabled. */
  readonly onPick: () => void;
  /** The pointer moved over it, which moves the cursor there; never called while it is disabled. */
  readonly onPoint?: () => void;
  /** The row's element, for the caller to scroll the cursor row into view. */
  readonly ref?: Ref<HTMLDivElement>;
}

/**
 * One option of a palette's list: its mark, its name, its context (a
 * sentence, a path, or a command, one line, cut with an ellipsis and shown
 * whole in its tooltip), and a trailing column (a version, a count, a
 * chord) with the current item's dot. The cursor row wears the cursor fill
 * and bar, its quiet words in the tone made for that fill; a disabled row
 * is dimmed and never takes the cursor or a pick. The palette keeps the
 * focus in its field, so a press here never takes it. Its name is `label`
 * or its words; the context, a trail in words, and what `current` means
 * are read after it as its description, unless `description` says it.
 */
export function PaletteOption({
  id,
  name,
  label,
  mark,
  context,
  contextKind = 'sentence',
  trail,
  current = null,
  cursor = false,
  disabled = false,
  description,
  onPick,
  onPoint,
  ref
}: PaletteOptionProps): ReactElement {
  const contextClass =
    contextKind === 'path' ? 'palette-context' : `palette-context palette-${contextKind}`;
  // The row is named by its name alone, which hides the words drawn after
  // it, so those are read as its description unless the caller words one.
  const described =
    description ??
    [context, typeof trail === 'string' || typeof trail === 'number' ? String(trail) : '', current]
      .filter((part): part is string => typeof part === 'string' && part !== '')
      .join(', ');

  return (
    <div
      aria-description={described === '' ? undefined : described}
      aria-disabled={disabled || undefined}
      aria-label={label ?? (typeof name === 'string' ? name : undefined)}
      aria-selected={cursor}
      className={cursor ? 'folder-menu-option cursor' : 'folder-menu-option'}
      id={id}
      onClick={() => {
        if (!disabled) onPick();
      }}
      onMouseMove={() => {
        if (!disabled && !cursor) onPoint?.();
      }}
      ref={ref}
      role="option"
    >
      <span aria-hidden className="row-icon">
        {mark}
      </span>
      <span className="palette-text">
        <span className="row-name">{name}</span>
        {context === undefined || context === '' ? null : (
          <span className={contextClass} {...cutTooltip(context)}>
            {contextKind === 'path' ? <bdi>{context}</bdi> : context}
          </span>
        )}
      </span>
      <span className="palette-trail">
        {trail === undefined || trail === null ? null : (
          <span className="palette-meta">{trail}</span>
        )}
        {current === null ? null : <CurrentDot label={current} />}
      </span>
    </div>
  );
}

/** Props for {@link PaletteHeading}. */
export interface PaletteHeadingProps {
  /** The group's name: "Installed", "Databases". */
  readonly children: string;
}

/**
 * A group's name over its rows in a palette's or a menu's list, with a
 * hairline running out from it, exactly one row tall so the list still
 * ends on a whole row. Drawn, not listed: assistive technology hears the
 * options alone.
 */
export function PaletteHeading({ children }: PaletteHeadingProps): ReactElement {
  return (
    <div className="entry-menu-heading" role="presentation">
      {children}
    </div>
  );
}

/** Props for {@link PaletteNote}. */
export interface PaletteNoteProps {
  /** The note's words: why the list is empty, what a key does. */
  readonly children: ReactNode;
}

/**
 * A note in a palette, in the interface face with its text over the rows'
 * names, two lines at most: inside the list, why it is empty ("No runtime
 * matches"); inside `PaletteNotes`, something about the list as a whole.
 */
export function PaletteNote({ children }: PaletteNoteProps): ReactElement {
  return <p className="folder-menu-note">{children}</p>;
}

/** Props for {@link PaletteFailure}. */
export interface PaletteFailureProps {
  /** What failed, in strong words: "Could not install PHP 8.5.4." */
  readonly message: string;
  /** Why, or what to do, after it: the tool's own words. */
  readonly detail?: string | null;
}

/**
 * A failure under a palette's list, inside `PaletteNotes`: the danger glyph
 * in the icon column, the message in strong words and its detail after,
 * announced as an alert, and its words can be swept and copied.
 */
export function PaletteFailure({ message, detail = null }: PaletteFailureProps): ReactElement {
  return (
    <p className="folder-menu-note palette-failure" role="alert">
      <strong>{message}</strong>
      {detail === null || detail === '' ? null : ` ${detail}`}
    </p>
  );
}

/** Props for {@link PaletteNotes}. */
export interface PaletteNotesProps {
  /** `PaletteNote`s and a `PaletteFailure`. */
  readonly children: ReactNode;
}

/**
 * The notes under a palette's list, ruled off from it: what the list as a
 * whole needs said, and a failure of the pick that was tried. Draw it only
 * while it has something to say.
 */
export function PaletteNotes({ children }: PaletteNotesProps): ReactElement {
  return <div className="palette-notes">{children}</div>;
}
