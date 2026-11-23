/**
 * The points of a sparkline of `values` in a box `width` by `height`, as an
 * SVG `points` list: evenly spaced from the left edge to the right, the
 * smallest value at the foot and the largest at the head, each kept
 * `inset` from the top and bottom edges so the stroke is never cut. A flat
 * series runs through the middle; one value is a flat line across the box.
 * Values that are not finite are left out. Empty for no value.
 */
export function sparklinePoints(
  values: readonly number[],
  width: number,
  height: number,
  inset = 1
): string {
  const finite = values.filter((value) => Number.isFinite(value));

  if (finite.length === 0) {
    return '';
  }

  const series = finite.length === 1 ? [finite[0]!, finite[0]!] : finite;
  const low = Math.min(...series);
  const high = Math.max(...series);
  const span = high - low;
  const room = Math.max(0, height - 2 * inset);
  const step = width / (series.length - 1);
  const round = (value: number): number => Math.round(value * 100) / 100;

  return series
    .map((value, index) => {
      const y = span === 0 ? height / 2 : inset + room - ((value - low) / span) * room;

      return `${round(index * step)},${round(y)}`;
    })
    .join(' ');
}
