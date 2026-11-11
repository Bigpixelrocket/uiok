/*
 * The geometry of the pie chart (`PieChart.tsx`) and of `ResultChart`'s pie:
 * each slice's share and its arc as an SVG path.
 */

/** A slice of a pie: what it stands for and how much. */
export interface PieSlice {
  readonly label: string;
  readonly value: number;
}

/**
 * A slice as drawn: its share of the whole, its path in a circle of radius
 * `r` at the origin, and the turn (from twelve o'clock, clockwise) at its
 * middle, where a tag naming it points.
 */
export interface PieArc extends PieSlice {
  readonly share: number;
  readonly path: string;
  readonly middle: number;
}

/** A point on the circle of radius `r` at `turn` turns from twelve o'clock, clockwise. */
const pointAt = (r: number, turn: number): string => {
  const angle = turn * 2 * Math.PI;

  return `${(r * Math.sin(angle)).toFixed(3)} ${(-r * Math.cos(angle)).toFixed(3)}`;
};

/**
 * The arcs of `slices`, clockwise from twelve o'clock in the order given;
 * a slice of nothing or less is left out, and a lone slice is the whole
 * circle.
 */
export function pieArcs(slices: readonly PieSlice[], r: number): PieArc[] {
  const kept = slices.filter((slice) => slice.value > 0);
  const total = kept.reduce((sum, slice) => sum + slice.value, 0);
  let turn = 0;

  return kept.map((slice) => {
    const share = slice.value / total;
    const start = turn;

    turn += share;

    const path =
      share >= 1
        ? `M 0 ${-r} A ${r} ${r} 0 1 1 0 ${r} A ${r} ${r} 0 1 1 0 ${-r} Z`
        : `M 0 0 L ${pointAt(r, start)} A ${r} ${r} 0 ${share > 0.5 ? 1 : 0} 1 ${pointAt(r, turn)} Z`;

    return { ...slice, share, path, middle: start + share / 2 };
  });
}

/** A slice's tag outside the pie: a leader from the rim to `x`, `y`, where its number stands. */
export interface PieTag {
  /** The leader's start, on the rim. */
  readonly fromX: number;
  readonly fromY: number;
  /** The leader's end and the tag's anchor point. */
  readonly x: number;
  readonly y: number;
  /** Which way the tag's text runs from its anchor. */
  readonly anchor: 'start' | 'middle' | 'end';
}

/** How far out a tag stands from the rim, on its first ring and on its second. */
export const PIE_TAG_REACH = 8;
const SECOND_RING = 14;

/**
 * Where each slice's number goes when colours alone cannot tell slices apart
 * (more slices than series colours): just outside the rim at the slice's
 * middle, on a short leader, or a ring further out where it would come
 * within `gap` pixels of the tag before it, so neighbouring thin slices
 * keep apart. A chart draws the pie `pieTagRoom` smaller to make the room.
 */
export function pieTags(arcs: readonly PieArc[], r: number, gap = 14): PieTag[] {
  let previous: { x: number; y: number; ring: number } | null = null;

  return arcs.map((arc) => {
    const angle = arc.middle * 2 * Math.PI;
    const at = (radius: number) => ({ x: radius * Math.sin(angle), y: -radius * Math.cos(angle) });
    let ring = 0;
    let end = at(r + PIE_TAG_REACH);

    if (
      previous !== null &&
      previous.ring === 0 &&
      Math.hypot(end.x - previous.x, end.y - previous.y) < gap
    ) {
      ring = 1;
      end = at(r + PIE_TAG_REACH + SECOND_RING);
    }
    previous = { ...end, ring };

    const rim = at(r);
    const sideways = Math.abs(Math.sin(angle));

    return {
      fromX: rim.x,
      fromY: rim.y,
      x: end.x,
      y: end.y,
      anchor: sideways < 0.3 ? 'middle' : end.x > 0 ? 'start' : 'end'
    };
  });
}

/** How much smaller a pie draws to make room for its tags outside the rim, both rings and the numbers on them. */
export const pieTagRoom = PIE_TAG_REACH + SECOND_RING + 16;
