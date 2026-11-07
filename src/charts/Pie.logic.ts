/*
 * The geometry of the pie chart (`PieChart.tsx`) and of `ResultChart`'s pie:
 * each slice's share and its arc as an SVG path.
 */

/** A slice of a pie: what it stands for and how much. */
export interface PieSlice {
  readonly label: string;
  readonly value: number;
}

/** A slice as drawn: its share of the whole and its path in a circle of radius `r` at the origin. */
export interface PieArc extends PieSlice {
  readonly share: number;
  readonly path: string;
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

    return { ...slice, share, path };
  });
}
