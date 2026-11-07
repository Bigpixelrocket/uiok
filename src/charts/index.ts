/**
 * Charts drawn in SVG from the theme's chart tokens: `LineChart`,
 * `PieChart`, `ScatterChart`, and `ResultChart` for a table of rows, plus
 * the helpers that save a chart as a picture.
 */

export { svgMarkup, svgPng, tokenColour } from './Drawing.js';
export type { LinePoint } from './Line.logic.js';
export { LineChart, type LineChartProps, type LineSeries } from './LineChart.js';
export type { PieSlice } from './Pie.logic.js';
export { PieChart, type PieChartProps } from './PieChart.js';
export { ResultChart, type ResultChartProps } from './ResultChart.js';
export {
  RESULT_CHART_TYPES,
  STACKABLE_CHART_TYPES,
  type ChartSeries,
  type ResultChartType
} from './ResultChart.logic.js';
export type { ScatterAxis, ScatterAxisKind } from './Scatter.logic.js';
export { ScatterChart, type ScatterChartProps, type ScatterPoint } from './ScatterChart.js';
