import { ArrowLeft } from 'lucide-react';
import type {
  ChangeEvent,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
  RefObject
} from 'react';

import { FilterIcon } from '../filter/FilterIcon.js';
import { useLabels } from '../labels/UiokProvider.js';
import { useBellBeat } from '../menu/useBellBeat.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

/**
 * Keeps the focus in the field through a press on the palette: a row, the
 * level chip, or a legend slot is pressed without taking the keys from the
 * field. A press in the field is the field's own, so the caret still goes
 * where it lands.
 */
const keepFocus = (event: MouseEvent): void => {
  if (!(event.target instanceof HTMLInputElement)) {
    event.preventDefault();
  }
};

/** Props for {@link Palette}. */
export interface PaletteProps {
  /** The dialog's accessible name. */
  readonly label: string;
  /** Classes of the caller's own, after `folder-menu palette`. */
  readonly className?: string;
  /** Whether the palette waits on a request; nothing moves under it meanwhile. */
  readonly busy?: boolean;
  /** Closes the palette: Escape inside it, or a press on the backdrop. */
  readonly onClose: () => void;
  /** The query row (`PaletteQuery`), the list, any notes, and the legend. */
  readonly children: ReactNode;
}

/**
 * The frame every palette shares: the backdrop, which closes the palette on
 * a press on itself alone, and the box anchored near the top of the window,
 * labelled as a modal dialog (`aria-modal`, so `MODAL_SELECTOR` and
 * `watchOverlays` see it while it shows). Escape from anywhere in the box
 * closes it, unless an input method's composition takes it; the field
 * answers its own keys first. A press inside never takes the focus from the
 * field. The caller draws the query row (`PaletteQuery`), the list, any
 * notes, and the legend inside, and owns filtering and the cursor
 * (`matchQuery`, `menuQueryRefused`, `moveMenuCursor`). Draw it inside the
 * listing scope (`.listing-root`).
 */
export function Palette({
  label,
  className,
  busy = false,
  onClose,
  children
}: PaletteProps): ReactElement {
  return (
    <div
      className="palette-backdrop"
      onMouseDown={(event) => {
        // Only a press on the backdrop itself closes; one inside the palette is the palette's.
        if (event.target !== event.currentTarget) return;

        // The field keeps the focus: a press that closes nothing (the palette
        // waits on a request) must not leave the keys on the page behind.
        event.preventDefault();
        onClose();
      }}
    >
      <div
        aria-busy={busy || undefined}
        aria-label={label}
        aria-modal="true"
        className={
          className === undefined ? 'folder-menu palette' : `folder-menu palette ${className}`
        }
        onKeyDown={(event) => {
          if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
            event.preventDefault();
            onClose();
          }
        }}
        onMouseDown={keepFocus}
        role="dialog"
      >
        {children}
      </div>
    </div>
  );
}

/**
 * The level a palette stands in below its first, named in a chip before
 * the field; a click on it goes back.
 */
export interface PaletteLevel {
  /** The level's name, drawn in the chip. */
  readonly title: string;
  /** Whether stepping back is refused right now (the palette waits on a request). */
  readonly disabled?: boolean;
  /** Steps back out of the level. */
  readonly onBack: () => void;
}

/** Props for {@link PaletteQuery}. */
export interface PaletteQueryProps {
  /** The field's ref, for the caller to focus on open. */
  readonly inputRef: RefObject<HTMLInputElement | null>;
  /** The query as typed. */
  readonly value: string;
  /** The field's accessible name. */
  readonly label: string;
  /** The field's placeholder. */
  readonly placeholder: string;
  /** The id of the listbox the field drives. */
  readonly listId: string;
  /** The id of the cursor row, if any. */
  readonly activeId: string | undefined;
  /** How many keystrokes the palette has refused; each new one rings the bell. */
  readonly bell: number;
  /** The level the palette stands in below its first; null or absent at the top. */
  readonly level?: PaletteLevel | null;
  /** The count while a query is typed ("3 of 12"); null draws none. */
  readonly count: string | null;
  /** The query the last refused keystroke would have made, until the next change. */
  readonly refused: string | null;
  /** A tag at the field's end: what the rows act on. */
  readonly aside?: ReactNode;
  /** The field's edits; the caller filters, refuses, and rings the bell. */
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** The field's keys; the caller moves the cursor, runs the pick, and holds Tab. */
  readonly onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
}

/**
 * A palette's query row: the filter mark, the level chip while the palette
 * stands below its first level, the field (a combobox over the list it
 * names, holding the focus), then the count ("3 of 12") while a query
 * narrows the list, or, after a refused keystroke, why it was refused in the
 * count's place, and any tag the caller puts at the field's end. A refused
 * keystroke also rings the visual bell on the row, once per refusal
 * (`useBellBeat`). The chip's words and the refusal come from the `palette`
 * label group.
 */
export function PaletteQuery({
  inputRef,
  value,
  label,
  placeholder,
  listId,
  activeId,
  bell,
  level = null,
  count,
  refused,
  aside,
  onChange,
  onKeyDown
}: PaletteQueryProps): ReactElement {
  const labels = useLabels().palette;
  const beat = useBellBeat(bell);

  return (
    <div className={beat === null ? 'folder-menu-query' : `folder-menu-query bell-${beat}`}>
      <FilterIcon />
      {level !== null && (
        <button
          aria-label={labels.backFrom(level.title)}
          className="palette-level"
          disabled={level.disabled}
          onClick={level.onBack}
          tabIndex={-1}
          type="button"
          {...tooltip(labels.back, '←')}
        >
          <ArrowLeft aria-hidden size={11} />
          {level.title}
        </button>
      )}
      <input
        aria-activedescendant={activeId}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-expanded
        aria-label={label}
        onChange={onChange}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        ref={inputRef}
        role="combobox"
        spellCheck={false}
        value={value}
      />
      {/* A refused keystroke says why it was refused where the count stands. */}
      {refused !== null ? (
        <span className="palette-refused">{labels.nothingMatches(refused)}</span>
      ) : (
        count !== null && <span className="folder-menu-count">{count}</span>
      )}
      {aside}
    </div>
  );
}
