/*
 * The colour of the nth series, slice, or legend entry in every chart: the
 * theme's chart tokens in turn, starting over after the last.
 */

/** How many series colours the theme defines (`--chart-1` to `--chart-8`). */
const SERIES_COLOURS = 8;

/**
 * The chart token the series at `index` (from zero) is drawn in, as a
 * `var()`: `--chart-1` for 0 through `--chart-8` for 7, starting over at 8.
 * A series an app draws beside the charts (its own legend, a map layer)
 * takes the same colour as the chart's: `seriesColour(2)` is
 * `'var(--chart-3)'`.
 */
export const seriesColour = (index: number): string =>
  `var(--chart-${(index % SERIES_COLOURS) + 1})`;
