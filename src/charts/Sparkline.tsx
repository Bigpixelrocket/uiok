import type { ReactElement } from 'react';

import { sparklinePoints } from './Sparkline.logic.js';
import { seriesColour } from './seriesColour.js';

/** Props for {@link Sparkline}. */
export interface SparklineProps {
  /** The values, oldest first. */
  readonly values: readonly number[];
  /** What the line shows and its latest value in words ("CPU, 12% now"), its accessible name. */
  readonly label: string;
  /** Which chart series colour it wears (`seriesColour`); the first unless given. */
  readonly series?: number;
  /** Its size in pixels; 64 by 16 unless given, the height of a row's text. */
  readonly width?: number;
  readonly height?: number;
}

/**
 * A word-sized line of recent values beside a figure (a process's CPU over
 * the last minutes): no axes, no grid, the line alone in a series colour,
 * scaled to its own lowest and highest. It is an image named by `label`,
 * which carries what a reader needs; the line only shows the trend.
 */
export function Sparkline({
  values,
  label,
  series = 0,
  width = 64,
  height = 16
}: SparklineProps): ReactElement {
  return (
    <svg
      aria-label={label}
      className="sparkline"
      height={height}
      role="img"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
    >
      <polyline
        className="sparkline-line"
        points={sparklinePoints(values, width, height)}
        style={{ stroke: seriesColour(series) }}
      />
    </svg>
  );
}
