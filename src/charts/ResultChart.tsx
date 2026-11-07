import {
  memo,
  useState,
  useSyncExternalStore,
  type PointerEvent,
  type ReactElement,
  type Ref
} from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import { createValueStore, type ValueStore } from '../store/ValueStore.js';
import { pieArcs } from './Pie.logic.js';
import {
  STACKABLE_CHART_TYPES,
  cutLabel,
  legendLayout,
  shownLabels,
  splinePath,
  stackedRanges,
  valueDomain,
  type ChartSeries,
  type ResultChartType
} from './ResultChart.logic.js';
import { domainOf, scaled, tickLabel, ticksOf, type Domain } from './Scatter.logic.js';
import { seriesColour as colour } from './seriesColour.js';

/** A value as an axis and the read-out write it: six significant digits, no exponent for everyday sizes. */
const valueText = (value: number): string => String(Number(value.toPrecision(6)));

/** What the pointer is on: a series' value at a category, or a slice. */
interface Hovered {
  readonly series: number;
  readonly at: number;
}

/**
 * The value under the pointer, read out under the drawing: it follows the
 * hover on its own, so the pointer moving from mark to mark draws this line
 * alone, never the chart's marks.
 */
function ResultChartReadout({
  hover,
  type,
  categories,
  series
}: {
  readonly hover: ValueStore<Hovered | null>;
  readonly type: ResultChartType;
  readonly categories: readonly string[];
  readonly series: readonly ChartSeries[];
}): ReactElement {
  const labels = useLabels().charts;
  const hovered = useSyncExternalStore(hover.subscribe, hover.get);
  const shown = (seriesIndex: number, at: number): string => {
    const value = series[seriesIndex]?.values[at];

    return labels.seriesCategoryValue(
      series[seriesIndex]?.name ?? '',
      categories[at] ?? '',
      value === null || value === undefined ? labels.noValue : valueText(value)
    );
  };

  return (
    <p aria-live="polite" className="result-chart-readout">
      {hovered === null
        ? // A no-break space keeps the line's height while nothing is hovered.
          '\u00a0'
        : type === 'pie'
          ? labels.seriesValue(
              categories[hovered.at] ?? '',
              valueText(series[0]?.values[hovered.at] ?? 0)
            )
          : shown(hovered.series, hovered.at)}
    </p>
  );
}

/** Props for {@link ResultChart}. */
export interface ResultChartProps {
  /** How the table is drawn. */
  readonly type: ResultChartType;
  /** Whether series stack on each other; only bar, column, and area stack (`STACKABLE_CHART_TYPES`). */
  readonly stacked: boolean;
  /** The title drawn above the legend, and the accessible name; empty for none (named by `charts.chart`). */
  readonly title: string;
  /** The X axis's title: the category or number axis (the vertical one for bar). */
  readonly xLabel: string;
  /** The value axis's title (the horizontal one for bar). */
  readonly yLabel: string;
  /** Each row's X value as text, a category apiece; a pie's slice names. */
  readonly categories: readonly string[];
  /** Each row's X value as a number (Unix milliseconds for a time), for timeline and scatter; null where it has none. */
  readonly xValues: readonly (number | null)[];
  /** The series, each a value per row; a pie draws the first alone. */
  readonly series: readonly ChartSeries[];
  /** The drawing's width in pixels. */
  readonly width: number;
  /** The drawing's height in pixels. */
  readonly height: number;
  /** Receives the `<svg>`, for saving it with `svgMarkup` and `svgPng`. */
  readonly svgRef?: Ref<SVGSVGElement>;
}

/**
 * A chart of a table of rows, in SVG from the chart tokens: bar
 * (horizontal) and column (vertical), each grouped or stacked; line, spline
 * (a monotone curve), and area (filled to zero, or stacked); pie of one
 * series; timeline over a time axis; and scatter over a number axis. Title,
 * legend, and axis labels are drawn inside the SVG, so its picture saves
 * whole; hovering a value reads it out under the drawing. Each mark names
 * its value in `data-series` and `data-at`, which one listener on the
 * drawing reads, and the hover lives in a store the read-out follows, so
 * the marks draw again only when the chart changes.
 */
function ResultChartDrawing({
  type,
  stacked,
  title,
  xLabel,
  yLabel,
  categories,
  xValues,
  series,
  width,
  height,
  svgRef
}: ResultChartProps): ReactElement {
  const labels = useLabels().charts;
  const [hover] = useState(() => createValueStore<Hovered | null>(null));
  const stack = stacked && STACKABLE_CHART_TYPES.has(type);
  const legendNames = (type === 'pie' ? categories : series.map((entry) => entry.name)).slice(
    0,
    24
  );
  const legendPlaces = legendLayout(
    legendNames.map((name) => cutLabel(name, 24)),
    width - 24
  );
  const legendRows = legendPlaces.reduce((rows, place) => Math.max(rows, place.row + 1), 0);
  const top = (title === '' ? 8 : 28) + Math.min(4, legendRows) * 16;
  const values = valueDomain(series, stack);
  const valueTicks = type === 'pie' ? [] : ticksOf(values, 'number');
  // The value axis's title sits clear of its widest tick (11px figures run about 6.5px each).
  const tickWidth = valueTicks.reduce(
    (widest, tick) => Math.max(widest, valueText(tick).length),
    0
  );
  const margin = {
    top,
    right: 16,
    bottom: 44,
    left: type === 'bar' ? 110 : Math.max(64, Math.ceil(tickWidth * 6.5) + 30)
  };
  const plotWidth = Math.max(40, width - margin.left - margin.right);
  const plotHeight = Math.max(40, height - margin.top - margin.bottom);
  const ranges = stack ? stackedRanges(series) : [];
  const count = categories.length;
  const band = (vertical: boolean) => (vertical ? plotHeight : plotWidth) / Math.max(1, count);
  const numericX = type === 'timeline' || type === 'scatter';
  const xDomain: Domain = domainOf(
    xValues.filter((value): value is number => value !== null),
    type === 'timeline' ? 'time' : 'number'
  );
  /** A value's place on the value axis. */
  const along = (value: number): number =>
    type === 'bar' ? scaled(value, values, 0, plotWidth) : scaled(value, values, plotHeight, 0);
  /** A category's centre on the category axis, or a number's place on the X axis. */
  const across = (at: number): number => {
    if (numericX) return scaled(xValues[at] ?? xDomain.min, xDomain, 0, plotWidth);
    return band(type === 'bar') * (at + 0.5);
  };

  const plot: ReactElement[] = [];

  if (type === 'pie') {
    const first = series[0];
    const r = Math.max(10, Math.min(plotWidth, plotHeight) / 2 - 4);
    const arcs = pieArcs(
      categories.map((label, at) => ({ label, value: Math.max(0, first?.values[at] ?? 0) })),
      r
    );

    plot.push(
      <g key="pie" transform={`translate(${plotWidth / 2} ${plotHeight / 2})`}>
        {arcs.map((arc, at) => (
          <path
            className="result-chart-mark"
            d={arc.path}
            fill={colour(at)}
            data-at={at}
            data-series={0}
            key={at}
          />
        ))}
      </g>
    );
  } else if (type === 'column' || type === 'bar') {
    const vertical = type === 'bar';
    const group = band(vertical) * 0.8;
    const each = stack ? group : group / Math.max(1, series.length);

    series.forEach((entry, seriesIndex) => {
      entry.values.forEach((value, at) => {
        if (value === null) return;

        const range = stack ? ranges[seriesIndex]?.[at] : { from: 0, to: value };

        if (range === undefined) return;

        const start =
          band(vertical) * at + (band(vertical) - group) / 2 + (stack ? 0 : each * seriesIndex);
        const a = along(Math.min(range.from, range.to));
        const b = along(Math.max(range.from, range.to));

        plot.push(
          <rect
            className="result-chart-mark"
            data-at={at}
            data-series={seriesIndex}
            fill={colour(seriesIndex)}
            height={vertical ? Math.max(1, each - 1) : Math.max(1, Math.abs(a - b))}
            key={`${seriesIndex}-${at}`}
            width={vertical ? Math.max(1, Math.abs(b - a)) : Math.max(1, each - 1)}
            x={vertical ? Math.min(a, b) : start}
            y={vertical ? start : Math.min(a, b)}
          />
        );
      });
    });
  } else {
    series.forEach((entry, seriesIndex) => {
      const order = entry.values.map((_value, at) => at);

      if (numericX) order.sort((a, b) => (xValues[a] ?? 0) - (xValues[b] ?? 0));

      const points = order.map((at): [number, number] | null => {
        const value = stack ? ranges[seriesIndex]?.[at]?.to : entry.values[at];

        return value === null || value === undefined || (numericX && xValues[at] === null)
          ? null
          : [across(at), along(value)];
      });

      if (type === 'area') {
        const base = order.map((at): [number, number] => [
          across(at),
          along(stack ? (ranges[seriesIndex]?.[at]?.from ?? 0) : Math.max(values.min, 0))
        ]);
        const kept = points.flatMap((point, index) => (point === null ? [] : [{ point, index }]));

        if (kept.length > 0) {
          const outline = [
            ...kept.map(({ point }) => point),
            ...kept.map(({ index }) => base[index] ?? [0, 0]).reverse()
          ];

          plot.push(
            <path
              className="result-chart-area"
              d={`${outline.map(([x, y], at) => `${at === 0 ? 'M' : 'L'}${x} ${y}`).join(' ')} Z`}
              fill={colour(seriesIndex)}
              key={`area-${seriesIndex}`}
            />
          );
        }
      }
      if (type !== 'scatter') {
        plot.push(
          <path
            className="result-chart-line"
            d={
              type === 'spline'
                ? splinePath(points)
                : points
                    .map((point, at) =>
                      point === null
                        ? ''
                        : `${at === 0 || points[at - 1] === null ? 'M' : 'L'}${point[0]} ${point[1]}`
                    )
                    .join(' ')
            }
            fill="none"
            key={`line-${seriesIndex}`}
            stroke={colour(seriesIndex)}
          />
        );
      }
      points.forEach((point, index) => {
        if (point === null) return;

        const at = order[index] ?? index;

        plot.push(
          <circle
            className="result-chart-mark"
            cx={point[0]}
            cy={point[1]}
            data-at={at}
            data-series={seriesIndex}
            fill={colour(seriesIndex)}
            key={`dot-${seriesIndex}-${at}`}
            r={type === 'scatter' ? 4 : 2.5}
          />
        );
      });
    });
  }

  /** The mark the pointer came onto, read from its `data-` attributes; anything else keeps the last. */
  const onPointerOver = (event: PointerEvent<SVGSVGElement>): void => {
    const mark = event.target instanceof Element ? event.target : null;
    const at = mark?.getAttribute('data-at');
    const seriesIndex = mark?.getAttribute('data-series');

    if (at === null || at === undefined || seriesIndex === null || seriesIndex === undefined) {
      return;
    }

    const held = hover.get();
    const next = { series: Number(seriesIndex), at: Number(at) };

    if (held === null || held.series !== next.series || held.at !== next.at) hover.set(next);
  };

  const labelled = shownLabels(
    count,
    type === 'bar' ? plotHeight : plotWidth,
    type === 'bar' ? 18 : 72
  );

  return (
    <figure className="result-chart">
      <svg
        aria-label={title === '' ? labels.chart : title}
        height={height}
        onPointerLeave={() => hover.set(null)}
        onPointerOver={onPointerOver}
        ref={svgRef}
        role="img"
        viewBox={`0 0 ${width} ${height}`}
        width={width}
      >
        {title !== '' && (
          <text className="result-chart-title" textAnchor="middle" x={width / 2} y={18}>
            {title}
          </text>
        )}
        <g transform={`translate(12 ${title === '' ? 8 : 28})`}>
          {legendPlaces.map((place, at) =>
            place.row >= 4 ? null : (
              <g key={at} transform={`translate(${place.x} ${place.row * 16})`}>
                <rect fill={colour(at)} height={9} rx={2} width={9} y={2} />
                <text className="result-chart-legend" x={14} y={10}>
                  {place.text}
                </text>
              </g>
            )
          )}
        </g>
        <g transform={`translate(${margin.left} ${margin.top})`}>
          {type !== 'pie' && (
            <g className="result-chart-axis">
              {valueTicks.map((tick) =>
                type === 'bar' ? (
                  <g key={tick} transform={`translate(${along(tick)} 0)`}>
                    <line className="result-chart-grid" y1={0} y2={plotHeight} />
                    <text textAnchor="middle" y={plotHeight + 14}>
                      {valueText(tick)}
                    </text>
                  </g>
                ) : (
                  <g key={tick} transform={`translate(0 ${along(tick)})`}>
                    <line className="result-chart-grid" x1={0} x2={plotWidth} />
                    <text dominantBaseline="middle" textAnchor="end" x={-6}>
                      {valueText(tick)}
                    </text>
                  </g>
                )
              )}
              {numericX
                ? ticksOf(xDomain, type === 'timeline' ? 'time' : 'number').map((tick) => (
                    <text
                      key={tick}
                      textAnchor="middle"
                      x={scaled(tick, xDomain, 0, plotWidth)}
                      y={plotHeight + 14}
                    >
                      {tickLabel(
                        tick,
                        { title: xLabel, kind: type === 'timeline' ? 'time' : 'number' },
                        xDomain
                      )}
                    </text>
                  ))
                : categories.map((category, at) =>
                    labelled.has(at) ? (
                      type === 'bar' ? (
                        <text
                          dominantBaseline="middle"
                          key={at}
                          textAnchor="end"
                          x={-6}
                          y={across(at)}
                        >
                          {cutLabel(category, 16)}
                        </text>
                      ) : (
                        <text key={at} textAnchor="middle" x={across(at)} y={plotHeight + 14}>
                          {cutLabel(category, 12)}
                        </text>
                      )
                    ) : null
                  )}
              <line
                className="result-chart-baseline"
                x1={0}
                x2={plotWidth}
                y1={plotHeight}
                y2={plotHeight}
              />
              <text
                className="result-chart-axis-title"
                textAnchor="middle"
                x={plotWidth / 2}
                y={plotHeight + 34}
              >
                {type === 'bar' ? yLabel : xLabel}
              </text>
              <text
                className="result-chart-axis-title"
                textAnchor="middle"
                transform={`translate(${-margin.left + 12} ${plotHeight / 2}) rotate(-90)`}
              >
                {type === 'bar' ? xLabel : yLabel}
              </text>
            </g>
          )}
          {plot}
        </g>
      </svg>
      <ResultChartReadout categories={categories} hover={hover} series={series} type={type} />
    </figure>
  );
}

/**
 * A chart of a table of rows in one of eight types (`ResultChartType`),
 * drawn in SVG from the chart tokens with its title, legend, and axes inside,
 * and a read-out of the value under the pointer. It draws again only when a
 * prop changes, so keep `categories`, `xValues`, and `series` stable.
 */
export const ResultChart = memo(ResultChartDrawing);
