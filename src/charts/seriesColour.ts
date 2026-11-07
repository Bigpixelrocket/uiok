/*
 * The colour of the nth series, slice, or legend entry in every chart: the
 * theme's chart tokens in turn, starting over after the last.
 */

/** How many series colours the theme defines (`--chart-1` to `--chart-8`). */
const SERIES_COLOURS = 8;

/** The chart token the series at `index` (from zero) is drawn in, as a `var()`. */
export const seriesColour = (index: number): string =>
  `var(--chart-${(index % SERIES_COLOURS) + 1})`;
