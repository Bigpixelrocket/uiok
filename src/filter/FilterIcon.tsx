import { ListFilter } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_MD } from '../icon/index.js';

/**
 * The mark at the start of a filter field, the same over a listing, in a
 * menu, and in a palette. It is as wide as the icon column of the rows the
 * field narrows, so the query starts on the same edge as their names.
 * Decorative: the field's own label names it.
 */
export function FilterIcon(): ReactElement {
  return (
    <span aria-hidden className="filter-icon">
      <ListFilter size={ICON_MD} />
    </span>
  );
}
