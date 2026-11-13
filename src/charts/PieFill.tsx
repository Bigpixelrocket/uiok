/*
 * How a pie draws a slice's fill (`sliceFill` in Pie.logic.ts): a series
 * colour, solid, or striped with the chart's surface one way (hatch) or
 * both ways (cross). The stripes are the surface the slices are separated
 * by, so a hatched slice reads as its hue, lighter and textured, in every
 * theme, with no colour of its own.
 */

import type { CSSProperties, ReactElement } from 'react';

import type { SliceFill } from './Pie.logic.js';
import { seriesColour } from './seriesColour.js';

/** A stripe's period and width, in pixels; the hue keeps most of the face. */
const PERIOD = 4;
const STRIPE = 1.5;

const patternId = (prefix: string, fill: SliceFill): string =>
  `${prefix}-${fill.hatch}-${fill.hue}`;

/** What an SVG shape's `fill` is set to for `fill`: its series colour, or its pattern. */
export const slicePaint = (prefix: string, fill: SliceFill): string =>
  fill.hatch === 'solid' ? seriesColour(fill.hue) : `url(#${patternId(prefix, fill)})`;

/**
 * The patterns the striped fills among `fills` paint with, named from
 * `prefix` (unique to the chart), for the chart's SVG; nothing when every
 * fill is solid.
 */
export function SliceHatches({
  prefix,
  fills
}: {
  readonly prefix: string;
  readonly fills: readonly SliceFill[];
}): ReactElement | null {
  const striped = [
    ...new Map(
      fills.filter((fill) => fill.hatch !== 'solid').map((fill) => [patternId(prefix, fill), fill])
    )
  ];

  if (striped.length === 0) return null;
  return (
    <defs>
      {striped.map(([id, fill]) => (
        <pattern
          height={PERIOD}
          id={id}
          key={id}
          patternTransform="rotate(45)"
          patternUnits="userSpaceOnUse"
          width={PERIOD}
        >
          <rect fill={seriesColour(fill.hue)} height={PERIOD} width={PERIOD} />
          <rect className="pie-hatch-stripe" height={PERIOD} width={STRIPE} />
          {fill.hatch === 'cross' && (
            <rect className="pie-hatch-stripe" height={STRIPE} width={PERIOD} />
          )}
        </pattern>
      ))}
    </defs>
  );
}

/** The CSS background of an HTML swatch (a legend's, a read-out's) drawn in `fill`. */
export function sliceSwatch(fill: SliceFill): CSSProperties {
  const hue = seriesColour(fill.hue);
  const stripes = (angle: number) =>
    `repeating-linear-gradient(${angle}deg, var(--surface) 0 ${STRIPE}px, transparent ${STRIPE}px ${PERIOD}px)`;

  return {
    background:
      fill.hatch === 'solid'
        ? hue
        : fill.hatch === 'hatch'
          ? `${stripes(-45)}, ${hue}`
          : `${stripes(-45)}, ${stripes(45)}, ${hue}`
  };
}
