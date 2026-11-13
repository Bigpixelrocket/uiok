import type { ReactElement } from 'react';

/** Props for {@link ActivityBar}. */
export interface ActivityBarProps {
  /** Fraction done, in [0, 1], or null where the run reports none. */
  readonly fraction: number | null;
  /** The bar's accessible name ("Whole transfer"). */
  readonly label: string;
  /**
   * Whether the run is working now. Only then do the stripes move and does a
   * fill keep the accent; a bar that is not moving dims to the idle tone. A
   * static meter that is never "working" (space used) passes `true`.
   */
  readonly moving: boolean;
  /**
   * A class for the track beside its own `activity-bar`, for a host that
   * places the bar or recolours it for a state (a failed run's fill).
   */
  readonly className?: string;
  /** A class for the fill beside its own `activity-fill`; also put on the stripes. */
  readonly fillClassName?: string;
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
 * The bar draws its own track and fill (`.activity-bar`, `.activity-fill`):
 * an 8px trough in `--control-track` ringed in `--control-border`, and an
 * accent fill, so every caller's bar looks the same. The caller's classes
 * sit beside them and win over them, for placement and for a state colour.
 * The stripes take their colour from `--stripe-ink` on the fill, the accent
 * while moving and `--progress-idle` while standing still; a fill does the
 * same, so a paused or stopped bar never reads as a working one in either
 * form. Any fraction above zero draws at least a 4px nub, so a run at 1%
 * still shows it has started.
 */
export function ActivityBar({
  fraction,
  label,
  moving,
  className,
  fillClassName
}: ActivityBarProps): ReactElement {
  const track = className ? `activity-bar ${className}` : 'activity-bar';
  const motion = moving ? ' moving' : '';
  const fill = fillClassName ? `activity-fill ${fillClassName}` : 'activity-fill';

  if (fraction === null) {
    return (
      <div
        aria-busy={moving}
        aria-label={label}
        className={`${track} indeterminate${motion}`}
        role="progressbar"
      >
        <div className={`${fill} activity-stripes`} />
      </div>
    );
  }

  const done = Math.min(Math.max(fraction, 0), 1);

  return (
    <div
      aria-label={label}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={Math.round(fraction * 100)}
      className={track + motion}
      role="progressbar"
    >
      <div
        className={fill}
        style={{ width: `${done * 100}%`, minWidth: done > 0 ? 'var(--space-2)' : undefined }}
      />
    </div>
  );
}
