import { LoaderCircle } from 'lucide-react';
import type { ReactElement } from 'react';

import { ICON_SM } from './sizes.js';

/** Props for {@link Spinner}. */
export interface SpinnerProps {
  /** Its size, one of the icon sizes; `ICON_SM` unless given. */
  readonly size?: number;
  /** Classes the host adds for its place and colour. */
  readonly className?: string;
}

/**
 * The library's one spinner: a turning ring for work under way, drawn in the
 * current text colour. It turns once per `--duration-spin` and stands still
 * under reduced motion, where the words beside it say the work is running.
 * Decorative: it is hidden from assistive technology, so the host says what
 * is busy in words.
 */
export function Spinner({ size = ICON_SM, className }: SpinnerProps): ReactElement {
  return (
    <LoaderCircle
      aria-hidden
      className={className === undefined ? 'spinner' : `spinner ${className}`}
      size={size}
    />
  );
}
