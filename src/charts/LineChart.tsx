import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent,
  type ReactElement
} from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import {
  linePath,
  nearestMoment,
  timeTickLabels,
  valueDomain,
  type LinePoint
} from './Line.logic.js';
import { scaled, ticksOf, unscaled, type Domain } from './Scatter.logic.js';
import { seriesColour } from './seriesColour.js';

/** The room the axes' ticks take around the plot. */
const MARGIN = { top: 8, right: 10, bottom: 22, left: 52 };

/** A series of a {@link LineChart}: its label in the legend and the read-out, and its values in time order. */
export interface LineSeries {
  readonly label: string;
  readonly points: readonly LinePoint[];
}

/** Props for {@link LineChart}. */
export interface LineChartProps {
  /** What the chart shows, for screen readers ("Questions"). */
  readonly label: string;
  /** The series, each drawn in the next chart token. */
  readonly series: readonly LineSeries[];
  /** The time axis's start, in Unix milliseconds. */
  readonly from: number;
  /** The time axis's end, in Unix milliseconds; a point outside `from` to `to` is not drawn. */
  readonly to: number;
  /** A value as the axis and the read-out write it. */
  readonly format: (value: number) => string;
  /** A moment as the axis and the read-out write it (`10:42:05`). */
  readonly timeText: (at: number) => string;
  /** Hands over the time range a drag across the plot picked, earlier end first; without it the plot only reads out. */
  readonly onSelect?: (from: number, to: number) => void;
}

/**
 * A time-series line chart drawn in SVG from the chart tokens, in light and
 * dark: a line per series over a time axis from `from` to `to` and a value
 * axis from zero, with a legend under it. A missing value breaks its line.
 * Hovering the plot marks the nearest moment and reads out every series'
 * value there. With `onSelect`, dragging across the plot picks the time
 * range between the press and the release and hands it over. The chart is
 * as wide as its frame and 55% as high, between 120 and 360 pixels.
 */
export function LineChart({
  label,
  series,
  from,
  to,
  format,
  timeText,
  onSelect
}: LineChartProps): ReactElement {
  const labels = useLabels().charts;
  const frame = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [labelWidths, setLabelWidths] = useState<Readonly<Record<string, number>>>({});
  const [width, setWidth] = useState(320);
  const [hover, setHover] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ readonly from: number; readonly to: number } | null>(null);

  useEffect(() => {
    const element = frame.current;

    if (element === null || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      const measured = entry?.contentRect.width ?? 0;

      if (measured > 0) setWidth(measured);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const height = Math.round(Math.min(360, Math.max(120, width * 0.55)));
  // The first layout uses a conservative estimate; SVG supplies real glyph widths
  // before paint, including locale-specific numeric separators and units.
  const widthOf = (text: string): number => labelWidths[text] ?? Array.from(text).length * 8;
  const values = valueDomain(series.flatMap((entry) => entry.points.map((point) => point.value)));
  const valueTicks = ticksOf(
    values,
    'number',
    Math.max(2, Math.floor((height - MARGIN.top - MARGIN.bottom) / 40))
  );
  const left = Math.max(MARGIN.left, ...valueTicks.map((tick) => widthOf(format(tick)) + 8));
  const plotWidth = Math.max(40, width - left - MARGIN.right);
  const plotHeight = Math.max(40, height - MARGIN.top - MARGIN.bottom);
  const time: Domain = { min: from, max: to > from ? to : from + 1 };
  const px = (at: number): number => scaled(at, time, 0, plotWidth);
  const py = (value: number): number => scaled(value, values, plotHeight, 0);
  const timeTicks = ticksOf(time, 'time', Math.max(2, Math.floor(plotWidth / 90)));
  const timeLabels = timeTickLabels(timeTicks, timeText, px, plotWidth, widthOf);
  const labelKey = JSON.stringify([...timeTicks.map(timeText), ...valueTicks.map(format)]);

  useLayoutEffect(() => {
    const measured: Record<string, number> = {};

    for (const label of svg.current?.querySelectorAll<SVGTextElement>('.line-measure text') ?? []) {
      if (typeof label.getComputedTextLength !== 'function') continue;
      const width = label.getComputedTextLength();

      if (width > 0) measured[label.textContent ?? ''] = Math.ceil(width);
    }
    setLabelWidths((known) =>
      Object.entries(measured).some(([text, width]) => known[text] !== width) ? measured : known
    );
  }, [labelKey]);

  const moments = [
    ...new Set(series.flatMap((entry) => entry.points.map((point) => point.at)))
  ].sort((a, b) => a - b);

  /** The moment a pointer stands over in the plot. */
  const momentOf = (event: PointerEvent<SVGRectElement>): number => {
    const box = event.currentTarget.getBoundingClientRect();
    const x = Math.min(plotWidth, Math.max(0, event.clientX - box.left));

    return unscaled(x, time, 0, plotWidth);
  };
  const shown = hover === null ? null : nearestMoment(moments, hover);

  return (
    <figure aria-label={label} className="line-chart">
      <div className="line-frame" ref={frame}>
        {/* With no value to draw, the plot keeps its place and says so there. */}
        {moments.length === 0 ? (
          <div className="chart-empty" style={{ height }}>
            {labels.noValue}
          </div>
        ) : (
          <svg aria-hidden className="line-svg" height={height} ref={svg} width={width}>
            <g className="line-tick line-measure" visibility="hidden">
              {[...new Set([...timeTicks.map(timeText), ...valueTicks.map(format)])].map((text) => (
                <text key={text}>{text}</text>
              ))}
            </g>
            <g transform={`translate(${left} ${MARGIN.top})`}>
              {timeTicks.map((tick) => (
                <line
                  className="line-grid"
                  key={`grid${tick}`}
                  x1={px(tick)}
                  x2={px(tick)}
                  y1={0}
                  y2={plotHeight}
                />
              ))}
              {timeLabels.map((tick) => (
                <g className="line-tick" key={`x${tick.at}`}>
                  <text dy="1.1em" textAnchor="start" x={tick.left} y={plotHeight + 4}>
                    {tick.text}
                  </text>
                </g>
              ))}
              {valueTicks.map((tick) => (
                <g className="line-tick" key={`y${tick}`} transform={`translate(0 ${py(tick)})`}>
                  <line className="line-grid" x1={0} x2={plotWidth} />
                  <text dy="0.32em" textAnchor="end" x={-6}>
                    {format(tick)}
                  </text>
                </g>
              ))}
              <path className="line-axes" d={`M0 0V${plotHeight}H${plotWidth}`} />
              {series.map((entry, index) => (
                <path
                  className="line-series"
                  d={linePath(
                    entry.points.filter((point) => point.at >= time.min && point.at <= time.max),
                    px,
                    py
                  )}
                  key={`${index}:${entry.label}`}
                  stroke={seriesColour(index)}
                />
              ))}
              {shown !== null && (
                <line className="line-guide" x1={px(shown)} x2={px(shown)} y1={0} y2={plotHeight} />
              )}
              {shown !== null &&
                series.map((entry, index) => {
                  const value = entry.points.find((point) => point.at === shown)?.value ?? null;

                  return value === null ? null : (
                    <circle
                      className="line-dot"
                      cx={px(shown)}
                      cy={py(value)}
                      fill={seriesColour(index)}
                      key={`dot${index}:${entry.label}`}
                      r={3}
                    />
                  );
                })}
              {drag !== null && (
                <rect
                  className="line-selection"
                  height={plotHeight}
                  width={Math.abs(px(drag.to) - px(drag.from))}
                  x={Math.min(px(drag.from), px(drag.to))}
                />
              )}
              <rect
                className={onSelect === undefined ? 'line-plot' : 'line-plot selectable'}
                data-testid="line-plot"
                height={plotHeight}
                onPointerDown={(event) => {
                  if (onSelect === undefined || event.button !== 0) return;
                  event.currentTarget.setPointerCapture?.(event.pointerId);

                  const at = momentOf(event);

                  setDrag({ from: at, to: at });
                }}
                onPointerLeave={() => setHover(null)}
                onPointerMove={(event) => {
                  const at = momentOf(event);

                  setHover(at);
                  if (drag !== null) setDrag({ from: drag.from, to: at });
                }}
                onPointerUp={(event) => {
                  if (drag === null) return;

                  const end = momentOf(event);

                  setDrag(null);
                  // A click, or a drag of less than a pixel, picks no range.
                  if (onSelect !== undefined && Math.abs(px(end) - px(drag.from)) >= 2) {
                    onSelect(Math.min(drag.from, end), Math.max(drag.from, end));
                  }
                }}
                width={plotWidth}
              />
            </g>
          </svg>
        )}
        {shown !== null && (
          <div
            className="line-readout"
            role="status"
            style={
              px(shown) > plotWidth / 2
                ? { right: width - left - px(shown) + 8 }
                : { left: left + px(shown) + 8 }
            }
          >
            <strong>{labels.time(timeText(shown))}</strong>
            {series.map((entry, index) => {
              const value = entry.points.find((point) => point.at === shown)?.value ?? null;

              return (
                <span key={`${index}:${entry.label}`}>
                  <span
                    aria-hidden
                    className="line-swatch"
                    style={{ background: seriesColour(index) }}
                  />
                  {labels.seriesValue(entry.label, value === null ? '---' : format(value))}
                </span>
              );
            })}
          </div>
        )}
      </div>
      <ul className="line-legend">
        {series.map((entry, index) => (
          <li key={`${index}:${entry.label}`}>
            <span aria-hidden className="line-swatch" style={{ background: seriesColour(index) }} />
            {entry.label}
          </li>
        ))}
      </ul>
    </figure>
  );
}
