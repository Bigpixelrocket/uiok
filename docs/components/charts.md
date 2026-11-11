# Charts (`@bigpixelrocket/uiok/charts`)

SVG charts painted from the theme's chart tokens, so they follow light, dark, and every theme without a colour of their own:

- `LineChart`: a time series per line, with a hover read-out and an optional drag to pick a time range.
- `PieChart`: slices with a legend of values and shares.
- `ScatterChart`: points on number, time, or category axes, with drag-to-zoom and a resizable frame.
- `ResultChart`: a table of rows drawn as bar, column, line, spline, area, pie, timeline, or scatter, stackable where it makes sense, with title, legend, and axes inside the SVG so it saves whole as a picture.
- `tokenColour`, `svgMarkup`, `svgPng`: save a chart as SVG text or PNG bytes.

Series take `--chart-1` to `--chart-8` in turn and start over after the eighth (a pie's slices then hatch; see `ResultChart` and `PieChart`). `seriesColour(index)` gives that colour as a `var()` (`seriesColour(2)` is `'var(--chart-3)'`), so a series an app draws outside these charts, in its own legend or plot, matches theirs. The chrome reads `--text`, `--text-dim`, `--row-meta-text`, `--border`, `--border-strong`, `--surface`, `--accent`, and `--hover-wash`.

## Example

```tsx
import { LineChart, PieChart, ResultChart, ScatterChart, svgMarkup, svgPng, tokenColour } from '@bigpixelrocket/uiok/charts';
import { useLabels } from '@bigpixelrocket/uiok';

const count = new Intl.NumberFormat(locale);
const clock = new Intl.DateTimeFormat(locale, { timeStyle: 'medium' });

<LineChart
  label="Requests"
  series={[{ label: 'GET', points: [{ at: t0, value: 12 }, { at: t1, value: null }, { at: t2, value: 9 }] }]}
  from={t0}
  to={t2}
  format={(value) => count.format(value)}
  timeText={(at) => clock.format(at)}
  onSelect={(from, to) => zoomTo(from, to)}
/>

<PieChart label="Time per state" slices={[{ label: 'busy', value: 3 }, { label: 'idle', value: 1 }]} format={(value) => count.format(value)} />

<ScatterChart
  key={plotId} // a new key starts the zoom over
  label="price against weight"
  points={rows.map((row) => ({ id: row.id, x: row.weight, y: row.price, label: row.name }))}
  x={{ title: 'weight', kind: 'number' }}
  y={{ title: 'price', kind: 'number' }}
  picked={pickedId}
  onPick={setPickedId}
/>

function SavableChart({ table }: { table: Table }) {
  const svg = useRef<SVGSVGElement>(null);
  const labels = useLabels().charts;

  const save = async () => {
    const element = svg.current;
    if (element === null) return;
    const markup = svgMarkup(element, tokenColour(element, '--bg', labels));
    const png = await svgPng(markup, 640, 360, labels);
    // hand `markup` or `png` to the app's own file save
  };

  return (
    <ResultChart
      type="column"
      stacked={false}
      title="Sales by day"
      xLabel="day"
      yLabel="amount"
      categories={table.days}
      xValues={table.days.map(() => null)}
      series={[{ name: 'sales', values: table.sales }]}
      width={640}
      height={360}
      svgRef={svg}
    />
  );
}
```

## Props

### `LineChart` (`LineChartProps`)

| Prop       | Type                                 | Meaning                                                                                             |
| ---------- | ------------------------------------ | --------------------------------------------------------------------------------------------------- |
| `label`    | `string`                             | The accessible name of the `<figure>`                                                               |
| `series`   | `readonly LineSeries[]`              | `{ label, points }`, each point `{ at, value }` in time order; a `null` value breaks the line       |
| `from`     | `number`                             | The time axis's start, Unix milliseconds                                                            |
| `to`       | `number`                             | Its end; points outside `from` to `to` are not drawn                                                |
| `format`   | `(value: number) => string`          | A value as the axis and the read-out write it                                                       |
| `timeText` | `(at: number) => string`             | A moment as the axis and the read-out write it                                                      |
| `onSelect` | `(from: number, to: number) => void` | Optional. A drag across the plot hands over the picked range, earlier end first; a click picks none |

The chart fills its frame's width and is 55% as high, clamped to 120 to 360 pixels. Time labels are measured after the first layout so they never overlap or leave the plot.

### `PieChart` (`PieChartProps`)

| Prop     | Type                        | Default | Meaning                                                                     |
| -------- | --------------------------- | ------- | --------------------------------------------------------------------------- |
| `label`  | `string`                    |         | The accessible name of the `<figure>`                                       |
| `slices` | `readonly PieSlice[]`       |         | `{ label, value }`, clockwise from twelve o'clock; zero or less is left out |
| `format` | `(value: number) => string` |         | A value as its legend row writes it, before the share                       |
| `size`   | `number`                    | `160`   | Width and height in pixels                                                  |

Labels must be unique; they key the slices.

### `ScatterChart` (`ScatterChartProps`)

| Prop     | Type                      | Meaning                                                                                                                            |
| -------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `label`  | `string`                  | The accessible name of the `<figure>` and the plot                                                                                 |
| `points` | `readonly ScatterPoint[]` | `{ id, x, y, label }`; ids are unique, a label is the point's tooltip and accessible name                                          |
| `x`, `y` | `ScatterAxis`             | `{ title, kind, categories?, timeOfDay? }`; `kind` is `'number'`, `'time'` (Unix ms), or `'category'` (an index into `categories`) |
| `picked` | `number \| null`          | Optional. The picked point's id, drawn lit                                                                                         |
| `onPick` | `(id: number) => void`    | A click on a point, or Return or Space on a focused one                                                                            |

Time ticks are written in UTC (`2026-01-02`, `2026-01-02 10:00`, or `10:00` for a time of day); numbers from a million up are written short (`2.5M`, `1.7936T`). The frame resizes by its corner (CSS `resize: both`). The picked point is drawn last, ringed 2px in `--text` over a halo of its colour. Mount `TooltipLayer` for the point tooltips.

### `ResultChart` (`ResultChartProps`)

| Prop               | Type                          | Meaning                                                                                              |
| ------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `type`             | `ResultChartType`             | One of `RESULT_CHART_TYPES`: `bar`, `column`, `line`, `spline`, `area`, `pie`, `timeline`, `scatter` |
| `stacked`          | `boolean`                     | Stack the series; applies to `STACKABLE_CHART_TYPES` (bar, column, area) and is ignored by the rest  |
| `title`            | `string`                      | Drawn at the top and used as the accessible name; `''` for none (the name is then `charts.chart`)    |
| `xLabel`, `yLabel` | `string`                      | The category or number axis's title and the value axis's title (bar swaps their sides)               |
| `categories`       | `readonly string[]`           | Each row's X value as text; a pie's slice names                                                      |
| `xValues`          | `readonly (number \| null)[]` | Each row's X value as a number (Unix ms for `timeline`), read by `timeline` and `scatter`            |
| `series`           | `readonly ChartSeries[]`      | `{ name, values }`, a value per row, `null` for none; `pie` draws the first series                   |
| `width`, `height`  | `number`                      | The drawing's size in pixels                                                                         |
| `svgRef`           | `Ref<SVGSVGElement>`          | Optional. Receives the `<svg>` for `svgMarkup`                                                       |

`ResultChart` is memoised: keep the arrays stable across renders. The legend starts at the plot's left edge and shows at most 24 entries in up to four rows; the title is centred on the plot. Values are written with six significant digits. An area's fill breaks where a value is missing, as its line does. The legend keeps the same 12px of air under its last row whether it fits one row or wraps. A pie with more slices than the eight series colours numbers each slice on a leader outside the rim and its legend entry to match. Past the eighth slice the colours come round again hatched (stripes of `--surface` across the hue), and past the sixteenth crosshatched, so the 24 legend entries each have a fill of their own; beyond 24 a slice that would match a neighbour, round the circle too, takes the next of the three, so no two neighbouring slices share a fill. A number or time X axis shows at least three ticks and leaves out any label that would touch its neighbour.

## Look

Every chart shares one vocabulary: caption-size type with tabular figures; a 10px swatch with a 2px corner, a dash for a line series; a left axis and a baseline in `--border-strong` with grid lines in `--border-faint`, never a box; a hovered mark ringed in `--text`; a dragged range in `--accent-wash`. A `LineChart` value with no value beside it (a series of one point, or one between two gaps) is a dot at rest, since a line of one point has no length. Hovering a `LineChart` puts a dot on every line at the guide and a read-out in the tooltip's look; hovering a `ResultChart` mark puts the same read-out beside it. An axis whose ticks lie too close together for their size to tell apart in short form (epoch milliseconds on a number axis) labels the first tick in full and the rest by their offset from it (`+100M`). Area fills are faint (`--chart-area-opacity`) and lie under the grid; where unstacked areas overlap, only the front series' tint shows (a mask cuts each fill wherever a series in front has its own), so an overlap never mixes into a hue the legend lacks; the unlit pie slices step back to `--dimmed-opacity`. Hovering a pie slice or its legend row lights both and steps the other slices back.

A chart with no values keeps its plot's place and centres one dim line in it (`charts.noValue`): a `LineChart` draws its axes only, a `PieChart` a dashed ring, a `ScatterChart` its axes and titles, and a `ResultChart` its title, axes, and titles. The rules are `.chart-empty` (an HTML plot) and `.chart-empty-text` (inside an SVG).

## Saving a picture

- `tokenColour(element, token, labels?)` reads a custom property where `element` renders and returns `#rrggbb`. It throws an `Error` with `labels.coloursUnreadable` when the value is not a hex or `rgb()` colour.
- `svgMarkup(svg, background)` returns a standalone SVG document: computed fills, strokes, and text styles written in as attributes, classes removed, sized to the element's box, on a `background` rectangle. The element must be in the document.
- `svgPng(markup, width, height, labels?)` resolves to PNG bytes at twice the size; it rejects with `labels.drawFailed` when the browser cannot draw or encode it.

Nothing is fetched: the SVG is loaded from its own `data:` URL. Writing the bytes to a file is the app's job. Pass `useLabels().charts` for messages in the app's language; without it they are English.

## Keyboard and pointer

- Every `ScatterChart` point is a focusable `role="button"`; Return or Space picks it.
- Pointer drags: `LineChart` picks a range with `onSelect`, `ScatterChart` zooms to a rectangle of at least 4 pixels a side (Reset zoom undoes it). A zoom finer than a double can resolve is refused.
- Read-outs: `LineChart` shows a `role="status"` box at the nearest moment; `ResultChart` floats the same box beside the hovered mark and writes its words to a visually hidden polite live line.

## Styling

`.line-chart`, `.line-*`, `.pie-chart`, `.pie-*`, `.scatter-chart`, `.scatter-*`, `.result-chart`, `.result-chart-*`, in `@bigpixelrocket/uiok/styles.css`.

## Labels read

`charts`: `noValue` (every chart with no values), `time` and `seriesValue` (`LineChart` read-out), `points`, `pointsShown`, and `resetZoom` (`ScatterChart` caption), `seriesValue`, `seriesCategoryValue`, `noValue`, and `chart` (`ResultChart`), `coloursUnreadable` and `drawFailed` (`tokenColour`, `svgPng`, when passed). See [labels](../labels.md).
