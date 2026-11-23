import { CircleAlert, type LucideIcon } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';

import { drawn } from '../frame/WindowFrame.js';
import { ICON_XL } from '../icon/sizes.js';

/** Props for {@link LoadFailure}. */
export interface LoadFailureProps {
  /** What could not load ("Could not load projects"). */
  readonly title: string;
  /** Why, as the system said it or in a sentence. */
  readonly reason?: ReactNode;
  /** Its way on (a `Button`: Try Again). */
  readonly action?: ReactNode;
  /** The failure's glyph, in the danger tone; `CircleAlert` unless given. */
  readonly icon?: LucideIcon;
}

/**
 * The block a window shows in place of content that failed to load, outside
 * any pane: the failure's glyph in the danger tone, the headline, the
 * reason (dim, at most 420px wide), and its way on, centred in the space it
 * takes and announced as an alert. Its words can be selected and copied. A
 * pane inside the window that could not load says so with `EmptyState`'s
 * `failure` instead.
 */
export function LoadFailure({
  title,
  reason,
  action,
  icon: Icon = CircleAlert
}: LoadFailureProps): ReactElement {
  return (
    <div className="space-load-failure" role="alert">
      <Icon aria-hidden size={ICON_XL} />
      <strong>{title}</strong>
      {drawn(reason) ? <p>{reason}</p> : null}
      {action}
    </div>
  );
}
