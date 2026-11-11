/*
 * The layout of the chart of a table (`ResultChart.tsx`): its eight types,
 * with stacking for bar, column, and area, worked out here as numbers that
 * the component draws.
 */

import type { Domain } from './Scatter.logic.js';

/** The types `ResultChart` draws, in the order a type picker lists them. */
export const RESULT_CHART_TYPES = [
  'bar',
  'column',
  'line',
  'spline',
  'area',
  'pie',
  'timeline',
  'scatter'
] as const;
/** One of the types `ResultChart` draws: bar, column, line, spline, area, pie, timeline, or scatter. */
export type ResultChartType = (typeof RESULT_CHART_TYPES)[number];

/** The types `stacked` applies to; the others draw each series on its own. */
export const STACKABLE_CHART_TYPES: ReadonlySet<ResultChartType> = new Set([
  'bar',
  'column',
  'area'
]);

/** A series: its name and a value per category (one a row), null where the row holds none. */
export interface ChartSeries {
  readonly name: string;
  readonly values: readonly (number | null)[];
}

/**
 * The value axis's domain: from zero (or below, for a negative value) to
 * the largest value, or the largest stacked sum, so bars and areas grow from
 * zero; one unit wide where every value is equal.
 */
export function valueDomain(series: readonly ChartSeries[], stacked: boolean): Domain {
  const length = Math.max(0, ...series.map((entry) => entry.values.length));
  let min = 0;
  let max = 0;

  if (stacked) {
    for (let at = 0; at < length; at++) {
      let up = 0;
      let down = 0;

      for (const entry of series) {
        const value = entry.values[at] ?? 0;

        if (value >= 0) up += value;
        else down += value;
      }
      max = Math.max(max, up);
      min = Math.min(min, down);
    }
  } else {
    for (const entry of series) {
      for (const value of entry.values) {
        if (value === null || !Number.isFinite(value)) continue;
        max = Math.max(max, value);
        min = Math.min(min, value);
      }
    }
  }
  return max === min ? { min, max: min + 1 } : { min, max };
}

/** Where each series' segment starts and ends in a stack, by category: positive values up, negative down. */
export function stackedRanges(
  series: readonly ChartSeries[]
): (readonly { readonly from: number; readonly to: number }[])[] {
  const length = Math.max(0, ...series.map((entry) => entry.values.length));
  const up = Array.from({ length }, () => 0);
  const down = Array.from({ length }, () => 0);

  return series.map((entry) =>
    Array.from({ length }, (_unused, at) => {
      const value = entry.values[at] ?? 0;
      const base = value >= 0 ? (up[at] ?? 0) : (down[at] ?? 0);
      const top = base + value;

      if (value >= 0) up[at] = top;
      else down[at] = top;
      return { from: base, to: top };
    })
  );
}

/**
 * A smooth path through points, a monotone cubic (Fritsch and Carlson), so
 * the spline never swings past a point's value; a gap (null) breaks it.
 */
export function splinePath(points: readonly ([number, number] | null)[]): string {
  const runs: [number, number][][] = [];
  let run: [number, number][] = [];

  for (const point of points) {
    if (point === null) {
      if (run.length > 0) runs.push(run);
      run = [];
    } else {
      run.push(point);
    }
  }
  if (run.length > 0) runs.push(run);

  const fixed = (value: number): string => String(Math.round(value * 100) / 100);

  return runs
    .map((line) => {
      const [first] = line;

      if (first === undefined) return '';
      if (line.length < 3) {
        return line.map(([x, y], at) => `${at === 0 ? 'M' : 'L'}${fixed(x)} ${fixed(y)}`).join(' ');
      }

      const slopes = line.slice(1).map(([x, y], at) => {
        const [px, py] = line[at] ?? [x, y];

        return x === px ? 0 : (y - py) / (x - px);
      });
      const tangents = line.map((_point, at) => {
        if (at === 0) return slopes[0] ?? 0;
        if (at === line.length - 1) return slopes[at - 1] ?? 0;

        const before = slopes[at - 1] ?? 0;
        const after = slopes[at] ?? 0;

        if (before * after <= 0) return 0;

        // Fritsch-Carlson limit: a tangent past three times the gentler
        // slope would carry the curve beyond a neighbour's value.
        const limit = 3 * Math.min(Math.abs(before), Math.abs(after));

        return Math.sign(before) * Math.min(Math.abs((before + after) / 2), limit);
      });
      let path = `M${fixed(first[0])} ${fixed(first[1])}`;

      for (let at = 1; at < line.length; at++) {
        const [x0, y0] = line[at - 1] ?? first;
        const [x1, y1] = line[at] ?? first;
        const step = (x1 - x0) / 3;

        path += ` C${fixed(x0 + step)} ${fixed(y0 + (tangents[at - 1] ?? 0) * step)} ${fixed(x1 - step)} ${fixed(y1 - (tangents[at] ?? 0) * step)} ${fixed(x1)} ${fixed(y1)}`;
      }
      return path;
    })
    .filter(Boolean)
    .join(' ');
}

/** Which category labels an axis of `span` pixels shows, about one per `room` pixels, the first always. */
export function shownLabels(count: number, span: number, room = 64): Set<number> {
  const every = Math.max(1, Math.ceil(count / Math.max(1, Math.floor(span / room))));
  const shown = new Set<number>();

  for (let at = 0; at < count; at += every) shown.add(at);
  return shown;
}

/** A label cut to `limit` characters with an ellipsis, so an axis stays readable. */
export const cutLabel = (text: string, limit = 18): string =>
  Array.from(text).length <= limit
    ? text
    : `${Array.from(text)
        .slice(0, limit - 1)
        .join('')}…`;

/**
 * Where each legend entry goes: one after another on a row, each as wide
 * as its swatch, its text at about 6.5 pixels a character, and a gap,
 * wrapping to the next row where the next would pass `width`.
 */
export function legendLayout(
  texts: readonly string[],
  width: number
): { readonly text: string; readonly x: number; readonly row: number }[] {
  let x = 0;
  let row = 0;

  return texts.map((text) => {
    const span = 14 + Array.from(text).length * 6.5 + 14;

    if (x > 0 && x + span > width) {
      x = 0;
      row += 1;
    }

    const place = { text, x, row };

    x += span;
    return place;
  });
}

/** A tick's label as an axis draws it: its left edge, from the plot's start, and its text. */
export interface PlacedTick {
  readonly x: number;
  readonly text: string;
}

/**
 * Which tick labels a horizontal axis of `span` pixels draws, and where:
 * each centred on its tick at about `charWidth` pixels a character, moved
 * inside the plot where it would pass an edge, and left out where it would
 * come within `gap` pixels of the one before, so no two labels touch and
 * none hangs past the plot.
 */
export function spacedTicks(
  ticks: readonly { readonly at: number; readonly text: string }[],
  span: number,
  charWidth = 6.5,
  gap = 8
): PlacedTick[] {
  const placed: PlacedTick[] = [];
  let end = -Infinity;

  for (const tick of ticks) {
    const width = Array.from(tick.text).length * charWidth;
    const x = Math.min(Math.max(0, tick.at - width / 2), Math.max(0, span - width));

    if (x < end + gap) continue;
    placed.push({ x, text: tick.text });
    end = x + width;
  }
  return placed;
}

/**
 * The runs of consecutive points a line or an area draws, each at least
 * one point long; a missing point (null) ends a run.
 */
export function pointRuns<Point>(
  points: readonly (Point | null)[]
): { readonly at: number; readonly point: Point }[][] {
  const runs: { readonly at: number; readonly point: Point }[][] = [];
  let run: { readonly at: number; readonly point: Point }[] = [];

  points.forEach((point, at) => {
    if (point === null) {
      if (run.length > 0) runs.push(run);
      run = [];
    } else {
      run.push({ at, point });
    }
  });
  if (run.length > 0) runs.push(run);
  return runs;
}
