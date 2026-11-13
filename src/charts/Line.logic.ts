/*
 * The geometry of the line chart (`LineChart.tsx`): the value axis's domain,
 * each series' path with its gaps, the point nearest a moment for the
 * hover's read-out, and where the time labels fit.
 */

import type { Domain } from './Scatter.logic.js';

/** A value of a series at a moment (Unix milliseconds); null where it has none, which breaks the line. */
export interface LinePoint {
  readonly at: number;
  readonly value: number | null;
}

/**
 * The value axis's domain over every value shown: from zero, or the lowest
 * value where one is below zero, to the highest, with a tenth to spare
 * above it; the unit domain when nothing is shown or every value is zero.
 */
export function valueDomain(values: readonly (number | null)[]): Domain {
  let min = 0;
  let max = 0;

  for (const value of values) {
    if (value === null || !Number.isFinite(value)) continue;
    if (value < min) min = value;
    if (value > max) max = value;
  }
  if (max === min) return { min, max: min + 1 };
  return { min: min < 0 ? min - (max - min) / 10 : min, max: max + (max - min) / 10 };
}

/**
 * A series' path through its points, each placed by `x` and `y`: a line
 * from one value to the next, broken where a value is missing, a lone
 * value a dot-sized stroke so it still shows.
 */
export function linePath(
  points: readonly LinePoint[],
  x: (at: number) => number,
  y: (value: number) => number
): string {
  const parts: string[] = [];
  let open = false;

  for (const point of points) {
    if (point.value === null || !Number.isFinite(point.value)) {
      open = false;
      continue;
    }

    const at = `${x(point.at).toFixed(1)} ${y(point.value).toFixed(1)}`;

    parts.push(open ? `L ${at}` : `M ${at} l 0.01 0`);
    open = true;
  }
  return parts.join(' ');
}

/**
 * The points a line cannot show: a value with no value beside it on either
 * side (the series' only point, or one between two gaps), which a path
 * draws as a speck. The chart marks each with a dot at rest.
 */
export function lonePoints(points: readonly LinePoint[]): LinePoint[] {
  const has = (point: LinePoint | undefined) =>
    point !== undefined && point.value !== null && Number.isFinite(point.value);

  return points.filter(
    (point, index) => has(point) && !has(points[index - 1]) && !has(points[index + 1])
  );
}

/** The moment among `moments` (in order) nearest `at`; null when there is none. */
export function nearestMoment(moments: readonly number[], at: number): number | null {
  let best: number | null = null;

  for (const moment of moments) {
    if (best === null || Math.abs(moment - at) < Math.abs(best - at)) best = moment;
  }
  return best;
}

/** A time label's position, kept inside the plot and clear of its neighbours. */
export interface TimeTickLabel {
  readonly at: number;
  readonly text: string;
  readonly left: number;
  readonly width: number;
}

/**
 * Centre labels on their ticks where there is room; slide boundary labels
 * inside the plot (clear of the value axis), omitting only ticks whose
 * complete labels would collide. The grid and data still use the true ticks.
 */
export function timeTickLabels(
  ticks: readonly number[],
  text: (at: number) => string,
  x: (at: number) => number,
  plotWidth: number,
  widthOf: (text: string) => number,
  gap = 8
): TimeTickLabel[] {
  const labels: TimeTickLabel[] = [];

  for (const at of ticks) {
    const label = text(at);
    const width = widthOf(label);
    const left = Math.max(0, Math.min(x(at) - width / 2, plotWidth - width));
    const previous = labels.at(-1);

    if (
      width > plotWidth ||
      (previous !== undefined && left < previous.left + previous.width + gap)
    )
      continue;
    labels.push({ at, text: label, left, width });
  }
  return labels;
}
