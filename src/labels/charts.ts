/** English digit grouping for the counts the default chart labels write ("1,024 points"). */
const englishCount = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * The words every chart repeats: the read-outs under the pointer, the point
 * count and zoom control of a scatter chart, the accessible name of an
 * untitled chart, and the messages a picture export fails with. A chart's
 * own title, axis titles, and series names are props, not labels.
 *
 * Functions take raw numbers so an app formats them for its locale and
 * applies its plural rules; values already written as text (a series name, a
 * formatted value) arrive as strings.
 */
export interface ChartLabels {
  /** The accessible name of a chart drawn without a title: "Chart". */
  readonly chart: string;
  /** A category's value where its row holds none: "no value". */
  readonly noValue: string;
  /** A scatter chart's caption when every point is in view: "10 points". */
  readonly points: (count: number) => string;
  /** A scatter chart's caption after a zoom leaves some points out: "3 of 10 points". */
  readonly pointsShown: (shown: number, count: number) => string;
  /** The button that undoes a scatter chart's zoom: "Reset zoom". */
  readonly resetZoom: string;
  /** The heading of a line chart's read-out, `time` already written: "Time: 10:42:05". */
  readonly time: (time: string) => string;
  /** One series' value in a read-out: "Questions: 12". */
  readonly seriesValue: (series: string, value: string) => string;
  /** One series' value at a category in a read-out: "sales, Tue: 5". */
  readonly seriesCategoryValue: (series: string, category: string, value: string) => string;
  /** Why a picture could not be saved: the theme sets no readable colour for a token. */
  readonly coloursUnreadable: string;
  /** Why a picture could not be saved: the browser could not draw or encode it. */
  readonly drawFailed: string;
}

/** English chart read-outs and messages: the `charts` group `UiokProvider` starts from. */
export const DEFAULT_CHART_LABELS: ChartLabels = {
  chart: 'Chart',
  noValue: 'no value',
  points: (count) => `${englishCount.format(count)} ${count === 1 ? 'point' : 'points'}`,
  pointsShown: (shown, count) =>
    `${englishCount.format(shown)} of ${englishCount.format(count)} ${count === 1 ? 'point' : 'points'}`,
  resetZoom: 'Reset zoom',
  time: (time) => `Time: ${time}`,
  seriesValue: (series, value) => `${series}: ${value}`,
  seriesCategoryValue: (series, category, value) => `${series}, ${category}: ${value}`,
  coloursUnreadable: 'The theme’s colors could not be read for the picture.',
  drawFailed: 'The picture could not be drawn.'
};
