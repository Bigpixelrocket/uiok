import { useEffect, useRef, type ReactElement, type ReactNode } from 'react';

import { useLabels } from '../labels/UiokProvider.js';

/** Props for {@link SelectAllBar}. */
export interface SelectAllBarProps {
  /** The toolbar's accessible name; the `selectAll` label's "With selected" unless given. */
  readonly label?: string;
  /** How many rows the list offers to check. */
  readonly total: number;
  /** How many of those are checked. */
  readonly checked: number;
  /** Checks every offered row (true), or clears them all (false). */
  readonly onCheckAll: (on: boolean) => void;
  /** The bulk actions after "With selected:". */
  readonly children: ReactNode;
}

/**
 * The select-all footer of a list whose rows have checkboxes: Check all,
 * which checks or clears every row the list offers (its filter's
 * survivors, never a row it disables), then "With selected:" and the
 * list's bulk actions. The checkbox is ticked when every row is, ticked
 * and mixed when some are, and clear when none are, and follows each row's
 * change. A list with no row to check draws it disabled. Its words come
 * from the `selectAll` labels; pair it with `checkedAfterClick` for the
 * rows' own Shift-click ranges.
 */
export function SelectAllBar({
  label,
  total,
  checked,
  onCheckAll,
  children
}: SelectAllBarProps): ReactElement {
  const labels = useLabels().selectAll;
  const box = useRef<HTMLInputElement>(null);
  const all = total > 0 && checked >= total;
  const some = checked > 0 && !all;

  useEffect(() => {
    if (box.current !== null) box.current.indeterminate = some;
  }, [some]);

  return (
    <div aria-label={label ?? labels.label} className="select-all-bar" role="toolbar">
      <label className="select-all-check">
        <input
          checked={all || some}
          className="check"
          disabled={total === 0}
          onChange={() => onCheckAll(!all)}
          ref={box}
          type="checkbox"
        />
        {labels.checkAll}
      </label>
      <span className="select-all-with">{labels.withSelected}</span>
      {children}
    </div>
  );
}
