import { RotateCcw } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement
} from 'react';

import { Button } from '../button/Button.js';
import { ICON_SM } from '../icon/index.js';
import { useLabels } from '../labels/UiokProvider.js';
import { createValueStore, type ValueStore } from '../store/ValueStore.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import {
  domainOf,
  scaled,
  tickLabels,
  ticksOf,
  zoomedTo,
  type Domain,
  type ScatterAxis
} from './Scatter.logic.js';

/** A point of a {@link ScatterChart}: the id its caller knows it by, where it goes, and its label. */
export interface ScatterPoint {
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly label: string;
}

/** The room the axes' ticks and titles take around the plot. */
const MARGIN = { top: 10, right: 14, bottom: 40, left: 64 };

/** The size the chart starts at, before the frame reports its own. */
const START = { width: 640, height: 360 };

/** A rectangle dragged over the plot, from where the press began to where the pointer is, in plot pixels. */
interface Drag {
  readonly from: { readonly x: number; readonly y: number };
  readonly to: { readonly x: number; readonly y: number };
}

/**
 * The rectangle a drag draws over the plot: it follows the drag on its own,
 * so a move draws this rectangle alone, never the points under it.
 */
function ScatterSelection({
  drag
}: {
  readonly drag: ValueStore<Drag | null>;
}): ReactElement | null {
  const held = useSyncExternalStore(drag.subscribe, drag.get);

  return held === null ? null : (
    <rect
      className="scatter-selection"
      height={Math.abs(held.to.y - held.from.y)}
      width={Math.abs(held.to.x - held.from.x)}
      x={Math.min(held.from.x, held.to.x)}
      y={Math.min(held.from.y, held.to.y)}
    />
  );
}

/** Props for {@link ScatterChart}. */
export interface ScatterChartProps {
  /** What the chart shows, for screen readers ("price against made"). */
  readonly label: string;
  /** The points; each id must be unique, and each label is the point's tooltip and accessible name. */
  readonly points: readonly ScatterPoint[];
  /** The horizontal axis: its title, kind, and categories. */
  readonly x: ScatterAxis;
  /** The vertical axis: its title, kind, and categories. */
  readonly y: ScatterAxis;
  /** The id of the point the caller has picked, drawn lit; null for none. */
  readonly picked?: number | null;
  /** Hands over a point's id when it is clicked, or focused and Return or Space is pressed. */
  readonly onPick: (id: number) => void;
}

/**
 * A scatter chart drawn in SVG from the chart tokens, in light and dark: a
 * point per value pair on number, time, or category axes, each titled. A
 * point's label shows on hover, and a click, Return, or Space on a point
 * hands it to `onPick`. Dragging a rectangle over the plot zooms to it, and
 * Reset zoom comes back to every point; the frame resizes by its bottom
 * right corner. A caller that plots other points gives the chart a new
 * `key`, so the zoom starts over. The drag lives in a store its rectangle
 * follows, so dragging draws the rectangle alone and the points only once
 * it zooms. Needs `TooltipLayer` mounted for the point tooltips.
 */
export function ScatterChart({
  label,
  points,
  x,
  y,
  picked = null,
  onPick
}: ScatterChartProps): ReactElement {
  const labels = useLabels().charts;
  const frame = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState(START);
  const [zoom, setZoom] = useState<{ readonly x: Domain; readonly y: Domain } | null>(null);
  const [drag] = useState(() => createValueStore<Drag | null>(null));

  useEffect(() => {
    const element = frame.current;

    if (element === null || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(([entry]) => {
      if (entry === undefined) return;

      const { width, height } = entry.contentRect;

      if (width > 0 && height > 0) setSize({ width, height });
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const width = Math.max(80, size.width - MARGIN.left - MARGIN.right);
  const height = Math.max(60, size.height - MARGIN.top - MARGIN.bottom);
  const domains = zoom ?? {
    x: domainOf(
      points.map((point) => point.x),
      x.kind
    ),
    y: domainOf(
      points.map((point) => point.y),
      y.kind
    )
  };
  const px = (value: number): number => scaled(value, domains.x, 0, width);
  const py = (value: number): number => scaled(value, domains.y, height, 0);
  const inView = points.filter(
    (point) =>
      point.x >= domains.x.min &&
      point.x <= domains.x.max &&
      point.y >= domains.y.min &&
      point.y <= domains.y.max
  );
  // The picked point is drawn last, over its neighbours, so its ring shows whole.
  const shown = [
    ...inView.filter((point) => point.id !== picked),
    ...inView.filter((point) => point.id === picked)
  ];

  /** Where a pointer is in the plot, in its own pixels. */
  const inPlot = (event: PointerEvent<SVGRectElement>): { x: number; y: number } => {
    const box = event.currentTarget.getBoundingClientRect();

    return {
      x: Math.min(width, Math.max(0, event.clientX - box.left)),
      y: Math.min(height, Math.max(0, event.clientY - box.top))
    };
  };

  const pickKey = (event: KeyboardEvent<SVGCircleElement>, id: number): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onPick(id);
    }
  };

  const xTicks = ticksOf(domains.x, x.kind, Math.max(2, Math.floor(width / 110)));
  const yTicks = ticksOf(domains.y, y.kind, Math.max(2, Math.floor(height / 50)));
  const xTickLabels = tickLabels(xTicks, x, domains.x);
  const yTickLabels = tickLabels(yTicks, y, domains.y);

  return (
    <figure aria-label={label} className="scatter-chart">
      <div className="scatter-frame" ref={frame}>
        <svg
          className="scatter-svg"
          height={size.height}
          role="group"
          aria-label={label}
          width={size.width}
        >
          <g transform={`translate(${MARGIN.left} ${MARGIN.top})`}>
            {points.length > 0 &&
              xTicks.map((tick, at) => (
                <g className="scatter-tick" key={`x${tick}`} transform={`translate(${px(tick)} 0)`}>
                  <line className="scatter-grid" y1={0} y2={height} />
                  <text dy="1.2em" textAnchor="middle" y={height + 4}>
                    {xTickLabels[at]}
                  </text>
                </g>
              ))}
            {points.length > 0 &&
              yTicks.map((tick, at) => (
                <g className="scatter-tick" key={`y${tick}`} transform={`translate(0 ${py(tick)})`}>
                  <line className="scatter-grid" x1={0} x2={width} />
                  <text dy="0.32em" textAnchor="end" x={-6}>
                    {yTickLabels[at]}
                  </text>
                </g>
              ))}
            <path className="scatter-axes" d={`M0 0V${height}H${width}`} />
            <rect
              className="scatter-plot"
              data-testid="scatter-plot"
              height={height}
              onPointerDown={(event) => {
                if (event.button !== 0) return;
                event.currentTarget.setPointerCapture?.(event.pointerId);

                const at = inPlot(event);

                drag.set({ from: at, to: at });
              }}
              onPointerMove={(event) => {
                const held = drag.get();

                if (held !== null) drag.set({ from: held.from, to: inPlot(event) });
              }}
              onPointerUp={(event) => {
                const held = drag.get();

                if (held === null) return;

                const zoomed = zoomedTo(held.from, inPlot(event), domains, width, height);

                drag.set(null);
                if (zoomed !== null) setZoom(zoomed);
              }}
              width={width}
            />
            <ScatterSelection drag={drag} />
            {/* A halo of the picked point's colour behind it, so it is found among many. */}
            {shown
              .filter((point) => point.id === picked)
              .map((point) => (
                <circle
                  className="scatter-halo"
                  cx={px(point.x)}
                  cy={py(point.y)}
                  key="halo"
                  r={10}
                />
              ))}
            {points.length === 0 && (
              <text
                className="chart-empty-text"
                dominantBaseline="middle"
                textAnchor="middle"
                x={width / 2}
                y={height / 2}
              >
                {labels.noValue}
              </text>
            )}
            {shown.map((point) => (
              <circle
                aria-label={point.label}
                className={picked === point.id ? 'scatter-point lit' : 'scatter-point'}
                cx={px(point.x)}
                cy={py(point.y)}
                key={point.id}
                onClick={() => onPick(point.id)}
                onKeyDown={(event) => pickKey(event, point.id)}
                r={picked === point.id ? 6 : 4}
                role="button"
                tabIndex={0}
                {...tooltip(point.label)}
              />
            ))}
            <text className="scatter-title" textAnchor="middle" x={width / 2} y={height + 34}>
              {x.title}
            </text>
            <text
              className="scatter-title"
              textAnchor="middle"
              transform={`translate(${-MARGIN.left + 12} ${height / 2}) rotate(-90)`}
            >
              {y.title}
            </text>
          </g>
        </svg>
      </div>
      <figcaption className="scatter-caption">
        <span>
          {shown.length === points.length
            ? labels.points(points.length)
            : labels.pointsShown(shown.length, points.length)}
        </span>
        <Button disabled={zoom === null} onClick={() => setZoom(null)} size="small">
          <RotateCcw aria-hidden size={ICON_SM} />
          {labels.resetZoom}
        </Button>
      </figcaption>
    </figure>
  );
}
