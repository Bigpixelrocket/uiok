import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_SM } from '../icon/sizes.js';

/** One filter of a quick row. */
export interface FilterChip<Id extends string> {
  readonly id: Id;
  /** The filter's word ("Running"). */
  readonly label: string;
  readonly icon?: LucideIcon;
  /** How many rows it keeps; none hides the count. */
  readonly count?: number | string | null;
}

/** Props for {@link FilterChips}. */
export interface FilterChipsProps<Id extends string> {
  readonly chips: readonly FilterChip<Id>[];
  /** The filters that are on. */
  readonly on: readonly Id[];
  /** Turns one filter on or off. */
  readonly onToggle: (id: Id) => void;
  /** The row's accessible name ("Filters"). */
  readonly label: string;
}

/**
 * A pane's quick row of filters under its path bar (`pane-quick-row`), as a
 * sidebar's Running and Updates: each a quiet button with its glyph, its
 * word, and its count, pressed while on. A press toggles its filter and
 * leaves the focus where it was.
 */
export function FilterChips<Id extends string>({
  chips,
  on,
  onToggle,
  label
}: FilterChipsProps<Id>): ReactElement {
  return (
    <div aria-label={label} className="pane-quick-row" role="toolbar">
      {chips.map((chip) => {
        const Icon = chip.icon;

        return (
          <button
            aria-pressed={on.includes(chip.id)}
            className="pane-quick-button quiet-track-item"
            key={chip.id}
            onClick={() => onToggle(chip.id)}
            onMouseDown={(event) => event.preventDefault()}
            type="button"
          >
            {Icon === undefined ? null : <Icon aria-hidden size={ICON_SM} />}
            {chip.label}
            {chip.count === undefined || chip.count === null ? null : (
              <>
                {/* A space keeps the count a word apart in the button's name; the gap draws it. */}{' '}
                <span className="pane-quick-count">{chip.count}</span>
              </>
            )}
          </button>
        );
      })}
    </div>
  );
}
