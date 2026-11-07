import type { ReactElement } from 'react';

/** Props for {@link ActivityBar}. */
export interface ActivityBarProps {
  /** Fraction done, in [0, 1], or null where the run reports none. */
  readonly fraction: number | null;
  /** The bar's accessible name ("Whole transfer"). */
  readonly label: string;
  /** Whether the run is working now; only then do the stripes move. */
  readonly moving: boolean;
  /** The track's class, which sizes and colours it where it is drawn. */
  readonly className: string;
  /** The fill's class, or the stripes' when the bar is indeterminate. */
  readonly fillClassName: string;
}

/**
 * A progress bar that is either determinate, a fill as wide as the fraction
 * done, or indeterminate, diagonal stripes across the whole track for a run
 * that works without reporting how far it has got. The stripes scroll while
 * the run goes on and stand still once it waits, pauses, or settles; with
 * reduced motion they never scroll, and the caller's words and clock say
 * that it is working (the `.activity-stripes` rules in `@bigpixelrocket/uiok/styles.css`).
 * An indeterminate bar has no value for assistive technology, which reads
 * it as busy while it moves.
 *
 * The track and fill look is the caller's (`className`, `fillClassName`);
 * the stripes take their colour from `--stripe-ink` on the fill, the accent
 * unless a rule sets another.
 */
export function ActivityBar({
  fraction,
  label,
  moving,
  className,
  fillClassName
}: ActivityBarProps): ReactElement {
  if (fraction === null) {
    return (
      <div
        aria-busy={moving}
        aria-label={label}
        className={`${className} indeterminate${moving ? ' moving' : ''}`}
        role="progressbar"
      >
        <div className={`${fillClassName} activity-stripes`} />
      </div>
    );
  }

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(fraction * 100)}
      className={className}
      role="progressbar"
    >
      <div
        className={fillClassName}
        style={{ width: `${Math.min(Math.max(fraction, 0), 1) * 100}%` }}
      />
    </div>
  );
}
