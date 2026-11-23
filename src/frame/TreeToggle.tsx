import { ChevronDown, ChevronRight } from 'lucide-react';
import type { MouseEvent, ReactElement } from 'react';

import { ICON_MD } from '../icon/sizes.js';

/** Props for {@link TreeToggle}. */
export interface TreeToggleProps {
  /** Whether the row's children show. */
  readonly open: boolean;
  /** Opens or closes the row's children. */
  readonly onToggle: () => void;
  /** The button's accessible name ("Expand shop", "Collapse shop"). */
  readonly label: string;
}

/**
 * A tree row's disclosure chevron, in the row's first column (`tree-chev`):
 * right while closed, down while open. A press toggles the row's children
 * and never opens the row itself; it leaves the focus where it was, as a
 * row's click does, and stays out of the Tab order, since the tree's keys
 * open and close a row.
 */
export function TreeToggle({ open, onToggle, label }: TreeToggleProps): ReactElement {
  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <button
      aria-expanded={open}
      aria-label={label}
      className="tree-chev row-icon"
      onClick={(event: MouseEvent) => {
        event.stopPropagation();
        onToggle();
      }}
      onMouseDown={(event) => event.preventDefault()}
      tabIndex={-1}
      type="button"
    >
      <Icon aria-hidden size={ICON_MD} />
    </button>
  );
}
