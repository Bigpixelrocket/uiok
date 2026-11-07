import type { ReactElement } from 'react';

import { tooltip } from '../tooltip/Tooltip.logic.js';

/** Props for {@link CurrentDot}. */
export interface CurrentDotProps {
  /** What current means here ("Open folder", "Default version"), as its name and tooltip. */
  readonly label: string;
}

/**
 * The mark of the current one in a list: the folder a pane shows, the disk
 * it is on, the default version of a runtime. A small neutral dot one
 * character after the row's label, never at the row's far end, which holds
 * the row's controls and tags. Neutral, because a coloured dot is a status
 * (a service running, failing, or busy). `label` says what current means
 * here, to the pointer as a tooltip and to a screen reader as its name.
 */
export function CurrentDot({ label }: CurrentDotProps): ReactElement {
  return <span aria-label={label} className="current-dot" role="img" {...tooltip(label)} />;
}
