import type { ReactElement } from 'react';

import type { GroupHue } from '../themes/catalog.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';

/** Props for {@link GroupSwatch}. */
export interface GroupSwatchProps {
  /** The group's hue, or null for no group, drawn faint. */
  readonly group: GroupHue | null;
  /** Its outline alone: a group that is closed or off. */
  readonly hollow?: boolean;
  /**
   * The group's name, given when nothing beside the swatch says it: the
   * swatch becomes an image with that name and tooltip. Omitted, the swatch
   * is hidden from assistive technology, since the name beside it says it.
   */
  readonly label?: string;
}

/**
 * A group's colour beside its name: an 8px square (`--space-4`,
 * `--radius-xs`) in the theme's `--group-<hue>`, filled, or outlined when
 * `hollow`. A square, because a round dot is a state mark and a group's
 * colour is a category, never a status. Draws `.group-swatch[data-group]`.
 */
export function GroupSwatch({ group, hollow = false, label }: GroupSwatchProps): ReactElement {
  const className = hollow ? 'group-swatch hollow' : 'group-swatch';
  const naming = label
    ? { 'aria-label': label, role: 'img', ...tooltip(label) }
    : { 'aria-hidden': true as const };

  return <span className={className} data-group={group ?? undefined} {...naming} />;
}
