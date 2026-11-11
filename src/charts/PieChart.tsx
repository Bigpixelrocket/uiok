import { useId, useState, type ReactElement } from 'react';

import { useLabels } from '../labels/UiokProvider.js';
import { pieArcs, pieFills, sliceFill, type PieSlice } from './Pie.logic.js';
import { SliceHatches, slicePaint, sliceSwatch } from './PieFill.js';

/** Props for {@link PieChart}. */
export interface PieChartProps {
  /** What the chart shows, for screen readers ("Time per state"). */
  readonly label: string;
  /** The slices, clockwise from twelve o'clock in this order; one of nothing or less is left out. */
  readonly slices: readonly PieSlice[];
  /** A slice's value as its legend row writes it, before the share. */
  readonly format: (value: number) => string;
  /** The pie's width and height in pixels; 160 unless given. */
  readonly size?: number;
}

/**
 * A pie chart drawn in SVG from the chart tokens, in light and dark: a slice
 * per value, clockwise from twelve o'clock, and a legend beside it naming
 * each slice with its value and its share. Hovering a slice or its legend
 * row lights both, and the other slices step back. With no slice to draw it
 * keeps the pie's place as a dashed ring and says there is no value.
 */
export function PieChart({ label, slices, format, size = 160 }: PieChartProps): ReactElement {
  const labels = useLabels().charts;
  const [lit, setLit] = useState<number | null>(null);
  const r = size / 2 - 2;
  const arcs = pieArcs(slices, r);
  // Past the eight colours, slices are hatched, then crosshatched, so no
  // two neighbours and no two legend swatches share a fill.
  const fills = pieFills(arcs.map((_, index) => index));
  const prefix = `pie-${useId().replace(/[^\w-]/g, '')}`;

  return (
    <figure aria-label={label} className="pie-chart">
      <svg
        aria-hidden
        height={size}
        viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
        width={size}
      >
        <SliceHatches fills={fills} prefix={prefix} />
        {arcs.length === 0 && <circle className="pie-empty-ring" r={r} />}
        {arcs.map((arc, index) => (
          <path
            className={lit === index ? 'pie-slice lit' : 'pie-slice'}
            d={arc.path}
            fill={slicePaint(prefix, fills[index] ?? sliceFill(index))}
            key={arc.label}
            onPointerEnter={() => setLit(index)}
            onPointerLeave={() => setLit(null)}
          />
        ))}
      </svg>
      {arcs.length === 0 && <p className="chart-empty-text-line">{labels.noValue}</p>}
      <ul className="pie-legend">
        {arcs.map((arc, index) => (
          <li
            className={lit === index ? 'lit' : undefined}
            key={arc.label}
            onPointerEnter={() => setLit(index)}
            onPointerLeave={() => setLit(null)}
          >
            <span
              aria-hidden
              className="pie-swatch"
              style={sliceSwatch(fills[index] ?? sliceFill(index))}
            />
            <span className="pie-label">{arc.label}</span>
            <span className="pie-value">
              {format(arc.value)} ({(arc.share * 100).toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </figure>
  );
}
