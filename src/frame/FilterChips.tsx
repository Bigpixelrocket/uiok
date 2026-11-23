import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactElement } from 'react';

import { ICON_SM } from '../icon/sizes.js';
import { sidewaysWheel } from './FilterChips.logic.js';

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
 * leaves the focus where it was. The row is one line: chips that do not
 * fit scroll sideways under an edge fade (`.scroll-fade-x`), a mouse's
 * vertical wheel scrolls it sideways while it can move that way
 * (`sidewaysWheel`), and a chip the keys reach comes whole into view.
 */
export function FilterChips<Id extends string>({
  chips,
  on,
  onToggle,
  label
}: FilterChipsProps<Id>): ReactElement {
  const rowRef = useRef<HTMLDivElement>(null);

  // A wheel listener React would make passive, so it can keep the page
  // still while it turns the row; one it leaves alone scrolls the page.
  useEffect(() => {
    const row = rowRef.current;

    if (row === null) return undefined;

    const onWheel = (event: WheelEvent): void => {
      // Shift turns a wheel sideways and Control (or Command) zooms on their
      // own; the row leaves both to the browser.
      if (event.shiftKey || event.ctrlKey || event.metaKey) return;

      const delta = sidewaysWheel(event, row, getComputedStyle(row).direction === 'rtl');

      if (delta === null) return;
      event.preventDefault();
      row.scrollLeft += delta;
    };

    row.addEventListener('wheel', onWheel, { passive: false });
    return () => row.removeEventListener('wheel', onWheel);
  }, []);

  return (
    <div
      aria-label={label}
      className="pane-quick-row scroll-fade-x"
      // A chip the keys reach comes whole into view, past the edge fade, at
      // once: nothing here scrolls smoothly, so reduced motion has nothing to stop.
      onFocus={(event) => {
        if (event.target !== event.currentTarget) {
          event.target.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
        }
      }}
      ref={rowRef}
      role="toolbar"
    >
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
