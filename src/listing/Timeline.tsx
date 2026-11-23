import type { CSSProperties, ReactElement } from 'react';

import { describedTooltip } from '../tooltip/Tooltip.logic.js';

/** A share of a scale, clamped to it, as a CSS percentage. */
const share = (value: number, max: number): string =>
  `${max > 0 ? (Math.min(Math.max(value, 0), max) / max) * 100 : 0}%`;

/** Props for {@link TimelineCell}. */
export interface TimelineCellProps {
  /** When the item began, on the scale's units (seconds after a start). */
  readonly start: number;
  /** When it ended, or where it stands now; not before `start`. */
  readonly end: number;
  /** The scale's end, shared by every row of the listing, so the bars line up. */
  readonly max: number;
  /**
   * The item is on the path that matters (the slowest path of a start): its
   * bar in the solid accent, the others in the accent's lighter line.
   */
  readonly emphasis?: boolean;
  /**
   * Draws the wait before `start` as a hairline from the scale's start, for
   * an item that waited on another; none for one that began at once.
   */
  readonly waited?: boolean;
  /** The span in words, its accessible name and tooltip: "began at 1.9 s, took 0.8 s". */
  readonly label: string;
}

/**
 * A row's span on a shared scale, as a cell (`Cell`'s place in a `Row`):
 * a bar from `start` to `end` of a scale from 0 to `max`, after a hairline
 * for the wait before it, in the solid accent on the path that matters and
 * the accent's line otherwise. Every row of a listing passes the same
 * `max`, and `TimelineScale` heads the column with its ticks. For a plan's
 * startup timing or a dependency graph's, read as rows rather than drawn
 * on a canvas. Draws `.timeline-cell` with `--timeline-start` and
 * `--timeline-end`.
 */
export function TimelineCell({
  start,
  end,
  max,
  emphasis = false,
  waited = false,
  label
}: TimelineCellProps): ReactElement {
  return (
    <span
      aria-label={label}
      className="row-meta timeline-cell"
      data-emphasis={emphasis || undefined}
      role="cell"
      style={
        {
          '--timeline-start': share(start, max),
          '--timeline-end': share(Math.max(start, end), max)
        } as CSSProperties
      }
      {...describedTooltip(label)}
    >
      <span aria-hidden className="timeline-track">
        {waited ? <span className="timeline-wait" /> : null}
        <span className="timeline-bar" />
      </span>
    </span>
  );
}

/** One tick of a `TimelineScale`: where it stands and its words ("1 s"). */
export interface TimelineTick {
  readonly at: number;
  readonly label: string;
}

/** Props for {@link TimelineScale}. */
export interface TimelineScaleProps {
  /** The scale's end, the `max` every `TimelineCell` under it passes. */
  readonly max: number;
  /** Its ticks, each at its place on the scale. */
  readonly ticks: readonly TimelineTick[];
}

/**
 * The ticks over a column of `TimelineCell`s, for the column's `control`
 * in a `Listing`: each tick's words start at its place on the same scale,
 * in the strip's quiet tone. Decorative: each cell names its own span.
 */
export function TimelineScale({ max, ticks }: TimelineScaleProps): ReactElement {
  return (
    <span aria-hidden className="timeline-scale">
      {ticks.map((tick) => (
        <span
          className="timeline-tick"
          key={tick.label}
          style={{ '--timeline-at': share(tick.at, max) } as CSSProperties}
        >
          {tick.label}
        </span>
      ))}
    </span>
  );
}
