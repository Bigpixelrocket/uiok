import type { LucideIcon } from 'lucide-react';
import type { ReactElement } from 'react';

import { tooltip } from '../tooltip/Tooltip.logic.js';
import { ICON_MD } from './sizes.js';

/**
 * The tones an icon may stand in on its own: the accent (something offered),
 * ready, a warning (an update waiting), or danger (a failure).
 */
export type IconTone = 'accent' | 'ready' | 'warning' | 'danger';

/** Props for {@link ToneIcon}. */
export interface ToneIconProps {
  /** The glyph, a lucide icon. */
  readonly icon: LucideIcon;
  /** The theme tone it is drawn in (`data-tone`). */
  readonly tone: IconTone;
  /**
   * What the glyph says when it stands alone ("Update available"): its
   * name (`role="img"`) and its tooltip. Absent, it is decorative beside
   * words that say the same.
   */
  readonly label?: string;
  /** One of the icon sizes; `ICON_MD` unless given. */
  readonly size?: number;
}

/**
 * An icon in a theme tone of its own, apart from the words around it: an
 * amber update arrow after a version in a listing `Cell`, or in a
 * `TreeRow`'s trailing column. It takes the tone's text colour, which keeps
 * its contrast on the listing, the cursor and hover fills, and a mark, and
 * on an active selection it takes the selection's words as the row's other
 * parts do. The words beside it keep their own tone. With a `label` it is an
 * image of its own with that name and tooltip; without one it is hidden
 * from assistive technology.
 */
export function ToneIcon({ icon: Icon, tone, label, size = ICON_MD }: ToneIconProps): ReactElement {
  const named = label !== undefined && label !== '';

  return (
    <span
      className="tone-icon"
      data-tone={tone}
      {...(named ? { 'aria-label': label, role: 'img' as const, ...tooltip(label) } : {})}
      aria-hidden={named ? undefined : true}
    >
      <Icon aria-hidden size={size} />
    </span>
  );
}
