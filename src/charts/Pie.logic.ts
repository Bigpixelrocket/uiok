/*
 * The geometry of the pie chart (`PieChart.tsx`) and of `ResultChart`'s pie:
 * each slice's share and its arc as an SVG path, and the fill each slice
 * takes so neighbours and legend swatches never match.
 */

import { SERIES_COLOURS } from './seriesColour.js';

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

/** A slice's tag outside the pie: a leader from the rim to `x`, `y`, and its number at `textX`, `textY`. */
export interface PieTag {
  /** The leader's start, on the rim at the slice's middle. */
  readonly fromX: number;
  readonly fromY: number;
  /** The leader's end. */
  readonly x: number;
  readonly y: number;
  /** Which way the tag's text runs from its anchor. */
  readonly anchor: 'start' | 'middle' | 'end';
  /** The number's anchor point (drawn with a middle baseline). */
  readonly textX: number;
  readonly textY: number;
  /** The number drawn. */
  readonly text: string;
}

/** How far out a tag stands from the rim, on its first ring and on its second. */
export const PIE_TAG_REACH = 8;
const SECOND_RING = 14;

/**
 * The box a tag's number takes, for 11px tabular figures (about 6.6px a
 * figure and 11px tall); `pieTags` keeps these boxes `PIE_TAG_CLEAR`
 * pixels apart side by side and `PIE_TAG_CLEAR_ABOVE` one above the other.
 */
const FIGURE_WIDTH = 6.6;
const FIGURE_HEIGHT = 11;
/**
 * The least room between two tags' numbers side by side: more than a
 * figure's width, so "12" beside "1" never reads as "121".
 */
export const PIE_TAG_CLEAR = 8;
/** The least room between two tags' numbers one above the other, where lines keep them apart. */
export const PIE_TAG_CLEAR_ABOVE = 3;
/** The least room between a number and another tag's leader. */
const LEADER_CLEAR = 2;

/** A box by its edges. */
export interface PieTagBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The box `tag`'s number takes as drawn. */
export function pieTagBox(tag: PieTag): PieTagBox {
  const width = tag.text.length * FIGURE_WIDTH;
  const left =
    tag.anchor === 'start'
      ? tag.textX
      : tag.anchor === 'end'
        ? tag.textX - width
        : tag.textX - width / 2;

  return {
    left,
    right: left + width,
    top: tag.textY - FIGURE_HEIGHT / 2,
    bottom: tag.textY + FIGURE_HEIGHT / 2
  };
}

const boxesMeet = (a: PieTagBox, b: PieTagBox): boolean =>
  a.left < b.right + PIE_TAG_CLEAR &&
  b.left < a.right + PIE_TAG_CLEAR &&
  a.top < b.bottom + PIE_TAG_CLEAR_ABOVE &&
  b.top < a.bottom + PIE_TAG_CLEAR_ABOVE;

type Segment = readonly [number, number, number, number];

/** Whether the segment from (x1, y1) to (x2, y2) passes through `box` grown by `clear`. */
const segmentMeetsBox = ([x1, y1, x2, y2]: Segment, box: PieTagBox, clear: number): boolean => {
  // Clip the segment's parameter range to the box, one axis at a time.
  let low = 0;
  let high = 1;
  const clip = (from: number, delta: number, min: number, max: number): boolean => {
    if (delta === 0) return from > min && from < max;
    const a = (min - from) / delta;
    const b = (max - from) / delta;

    low = Math.max(low, Math.min(a, b));
    high = Math.min(high, Math.max(a, b));
    return low < high;
  };

  return (
    clip(x1, x2 - x1, box.left - clear, box.right + clear) &&
    clip(y1, y2 - y1, box.top - clear, box.bottom + clear)
  );
};

/** Whether two segments cross. */
const segmentsCross = (a: Segment, b: Segment): boolean => {
  const side = (s: Segment, x: number, y: number) =>
    Math.sign((s[2] - s[0]) * (y - s[1]) - (s[3] - s[1]) * (x - s[0]));

  return (
    side(a, b[0], b[1]) * side(a, b[2], b[3]) < 0 && side(b, a[0], a[1]) * side(b, a[2], a[3]) < 0
  );
};

/** How far one step of spreading moves a crowded tag, in turns (a quarter of a degree). */
const SPREAD_STEP = 1 / 1440;
const SPREAD_ROUNDS = 2000;

/**
 * Where each slice's number goes when colours alone cannot tell slices apart
 * (more slices than series colours): just outside the rim at the slice's
 * middle, on a short leader. Each number's box keeps clear of every other
 * number (`PIE_TAG_CLEAR` side by side) and leader, round the circle too, so the last tag and
 * the first keep apart. Where tags crowd, they spread apart along their ring,
 * keeping their order, so leaders never cross; where one ring cannot hold a
 * run of thin slices, every other tag of the run steps out to a second ring.
 * A leader is straight and never cuts into the pie, which bounds how far a
 * tag may spread from its slice. A tag that still finds no clear place is
 * `null` and its slice is left to the legend. `texts` holds each arc's
 * number. A chart draws the pie `pieTagRoom` smaller to make the room.
 */
export function pieTags(
  arcs: readonly PieArc[],
  r: number,
  texts: readonly string[] = arcs.map((_arc, at) => String(at + 1))
): (PieTag | null)[] {
  const count = arcs.length;

  if (count === 0) return [];

  const radii = [r + PIE_TAG_REACH, r + PIE_TAG_REACH + SECOND_RING];
  // How far a tag may stand from its slice's middle on each ring: a
  // straight leader from the rim leaves it outward while the end stays at
  // least as far out along the slice's own direction as the rim.
  const reaches = radii.map((radius) => Math.acos(r / radius) / (2 * Math.PI));

  const tagAt = (at: number, ring: number, turn: number): PieTag => {
    const radius = radii[ring] ?? r;
    const angle = turn * 2 * Math.PI;
    const middle = (arcs[at]?.middle ?? 0) * 2 * Math.PI;
    const x = radius * Math.sin(angle);
    const y = -radius * Math.cos(angle);
    const anchor = Math.abs(Math.sin(angle)) < 0.3 ? 'middle' : x > 0 ? 'start' : 'end';

    return {
      fromX: r * Math.sin(middle),
      fromY: -r * Math.cos(middle),
      x,
      y,
      anchor,
      // A tag above or below the pie stands clear of its leader's end; one
      // to a side, a little way along from it.
      textX: x + (anchor === 'start' ? 2 : anchor === 'end' ? -2 : 0),
      textY: y + (anchor === 'middle' ? (y < 0 ? -6 : 6) : 0),
      text: texts[at] ?? String(at + 1)
    };
  };
  const leaderOf = (tag: PieTag): Segment => [tag.fromX, tag.fromY, tag.x, tag.y];
  const meet = (a: PieTag, b: PieTag): boolean => {
    const boxA = pieTagBox(a);
    const boxB = pieTagBox(b);

    return (
      boxesMeet(boxA, boxB) ||
      segmentMeetsBox(leaderOf(a), boxB, LEADER_CLEAR) ||
      segmentMeetsBox(leaderOf(b), boxA, LEADER_CLEAR) ||
      segmentsCross(leaderOf(a), leaderOf(b))
    );
  };

  // Sweep from just after the widest gap between slice middles, so a run
  // of thin slices is never split between the sweep's end and its start.
  let first = 0;
  let widest = -1;

  arcs.forEach((arc, at) => {
    const before = arcs[(at + count - 1) % count]?.middle ?? 0;
    const gap = (arc.middle - before + 1) % 1 || (count === 1 ? 1 : 0);

    if (gap > widest) {
      widest = gap;
      first = at;
    }
  });
  const order = Array.from({ length: count }, (_, step) => (first + step) % count);
  // Each tag's slice middle, unwrapped so it rises along the sweep.
  const middles = order.map((at) => arcs[at]?.middle ?? 0);

  middles.forEach((turn, step) => {
    if (step > 0 && turn < (middles[step - 1] ?? 0)) middles[step] = turn + 1;
  });

  /**
   * Spreads tags on the given rings (by sweep step) until none meets
   * another: each round, every two tags that meet move apart by one step,
   * the earlier back and the later on, so their order holds.
   */
  const spread = (rings: readonly number[]): number[] => {
    const turns = [...middles];

    for (let round = 0; round < SPREAD_ROUNDS; round++) {
      const tags = turns.map((turn, step) => tagAt(order[step] ?? 0, rings[step] ?? 0, turn));
      const moves = turns.map(() => 0);
      let crowded = false;

      for (let a = 0; a < count; a++) {
        for (let b = a + 1; b < count; b++) {
          if (meet(tags[a]!, tags[b]!)) {
            crowded = true;
            // The first and the last meet round the circle's end, so the
            // last moves back and the first on.
            const wraps = b - a > count / 2;

            moves[a] = (moves[a] ?? 0) + (wraps ? SPREAD_STEP : -SPREAD_STEP);
            moves[b] = (moves[b] ?? 0) + (wraps ? -SPREAD_STEP : SPREAD_STEP);
          }
        }
      }
      if (!crowded) break;
      turns.forEach((turn, step) => {
        turns[step] = turn + Math.sign(moves[step] ?? 0) * SPREAD_STEP;
      });
    }
    return turns;
  };

  /** The tags on `rings` once spread, each kept only where it is clear and within reach. */
  const place = (rings: readonly number[]): (PieTag | null)[] => {
    const turns = spread(rings);
    const kept: PieTag[] = [];
    const placed: (PieTag | null)[] = arcs.map(() => null);

    order.forEach((at, step) => {
      const ring = rings[step] ?? 0;
      const turn = turns[step] ?? 0;
      const tag = tagAt(at, ring, turn);

      if (
        Math.abs(turn - (middles[step] ?? 0)) <= (reaches[ring] ?? 0) &&
        !kept.some((other) => meet(tag, other))
      ) {
        kept.push(tag);
        placed[at] = tag;
      }
    });
    return placed;
  };

  const oneRing = place(order.map(() => 0));

  if (!oneRing.includes(null)) return oneRing;

  // One ring cannot hold them: in each run of tags that crowd at their
  // slices' middles, every other tag steps out to the second ring.
  const rings: number[] = [];

  order.forEach((at, step) => {
    const before = step > 0 ? tagAt(order[step - 1] ?? 0, 0, middles[step - 1] ?? 0) : null;
    const crowds = before !== null && meet(before, tagAt(at, 0, middles[step] ?? 0));

    rings.push(crowds && rings[step - 1] === 0 ? 1 : 0);
  });
  const twoRings = place(rings);
  const placed =
    twoRings.filter((tag) => tag === null).length <= oneRing.filter((tag) => tag === null).length
      ? twoRings
      : oneRing;

  // A tag left out takes the nearest clear place on either ring, if any.
  order.forEach((at, step) => {
    if (placed[at] !== null) return;

    const kept = placed.filter((tag): tag is PieTag => tag !== null);
    const middle = middles[step] ?? 0;
    const tries: { ring: number; turn: number; cost: number }[] = [];

    radii.forEach((radius, ring) => {
      for (let nudge = 0; nudge <= (reaches[ring] ?? 0); nudge += SPREAD_STEP) {
        for (const sign of nudge === 0 ? [0] : [1, -1]) {
          tries.push({
            ring,
            turn: middle + sign * nudge,
            cost: nudge * 2 * Math.PI * radius + ring * SECOND_RING
          });
        }
      }
    });
    tries.sort((a, b) => a.cost - b.cost);
    for (const { ring, turn } of tries) {
      const tag = tagAt(at, ring, turn);

      if (!kept.some((other) => meet(tag, other))) {
        placed[at] = tag;
        return;
      }
    }
  });
  return placed;
}

/** How much smaller a pie draws to make room for its tags outside the rim, both rings and the numbers on them. */
export const pieTagRoom = PIE_TAG_REACH + SECOND_RING + 16;

/**
 * How a slice's fill is drawn over its series colour: `solid`, `hatch`
 * (stripes of the chart's surface across the hue, one way), or `cross`
 * (stripes both ways).
 */
export type SliceHatch = 'solid' | 'hatch' | 'cross';

/** A slice's fill: which series colour (0 to 7, `--chart-1` to `--chart-8`) and how it is drawn. */
export interface SliceFill {
  readonly hue: number;
  readonly hatch: SliceHatch;
}

const HATCHES: readonly SliceHatch[] = ['solid', 'hatch', 'cross'];

/**
 * How many slices have fills of their own: each of the eight series colours
 * solid, then hatched, then crosshatched. A chart's legend lists no more.
 */
export const DISTINCT_SLICE_FILLS = SERIES_COLOURS * HATCHES.length;

/**
 * The fill of the slice at `at` (from zero) in the order given: the series
 * colours in turn, solid for the first eight, hatched for the next eight,
 * crosshatched for the eight after, so the first 24 slices and their legend
 * swatches never share a fill, and two neighbours never share a colour.
 */
export const sliceFill = (at: number): SliceFill => ({
  hue: at % SERIES_COLOURS,
  hatch: HATCHES[Math.floor(at / SERIES_COLOURS) % HATCHES.length] ?? 'solid'
});

const sameFill = (a: SliceFill | undefined, b: SliceFill): boolean =>
  a !== undefined && a.hue === b.hue && a.hatch === b.hatch;

/**
 * The fills of the slices drawn, in arc order, given the place in the data
 * of each (`places`, rising; a slice of nothing is not drawn, so places may
 * skip). Each slice takes `sliceFill` of its place, so a slice keeps the
 * fill its legend entry shows. Past the 24 fills, where the cycle starts
 * over, a slice that would match the slice before it, or (the last) the
 * first slice it meets round the circle, steps to the next way of drawing
 * its colour, so no two neighbouring slices ever share a fill.
 */
export function pieFills(places: readonly number[]): SliceFill[] {
  const fills: SliceFill[] = [];

  places.forEach((place, at) => {
    let fill = sliceFill(place);

    if (place >= DISTINCT_SLICE_FILLS) {
      const before = fills[at - 1];
      const after = at === places.length - 1 && at > 1 ? fills[0] : undefined;

      for (let step = 1; (sameFill(before, fill) || sameFill(after, fill)) && step < 3; step++) {
        fill = { hue: fill.hue, hatch: HATCHES[(HATCHES.indexOf(fill.hatch) + 1) % 3] ?? 'solid' };
      }
    }
    fills.push(fill);
  });
  return fills;
}
