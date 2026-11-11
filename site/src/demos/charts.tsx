/**
 * Each chart over sample series: a day of requests (drag across it to pick a
 * range), time per state, price against weight (drag to zoom), and a week of
 * sales drawn as any result chart type, then each chart with nothing to draw.
 */

import { useId, useMemo, useState } from 'react';

import {
  LineChart,
  PieChart,
  RESULT_CHART_TYPES,
  ResultChart,
  ScatterChart,
  STACKABLE_CHART_TYPES,
  type ResultChartType
} from '@bigpixelrocket/uiok/charts';

import { seeded } from './data';

const HOUR = 3_600_000;
const FROM = Date.UTC(2026, 10, 6, 0, 0);
const TO = FROM + 24 * HOUR;
const count = new Intl.NumberFormat('en-US');
const clock = new Intl.DateTimeFormat('en-US', {
  timeStyle: 'short',
  timeZone: 'UTC',
  hour12: false
});

/** Requests per ten minutes over a day, with a gap where the collector was down. */
const REQUESTS = (() => {
  const random = seeded(3);
  const series = ['GET', 'POST', 'DELETE'].map((label, index) => ({
    label,
    points: Array.from({ length: 145 }, (_, step) => {
      const at = FROM + step * 10 * 60_000;
      const hour = step / 6;
      const wave = Math.max(0, Math.sin(((hour - 6) / 24) * Math.PI * 2));
      const value = Math.round((120 / (index + 1)) * (0.25 + wave) + random() * 18);
      return { at, value: step > 80 && step < 86 ? null : value };
    })
  }));
  return series;
})();

const SLICES = [
  { label: 'running', value: 14.2 },
  { label: 'waiting', value: 5.1 },
  { label: 'paused', value: 2.4 },
  { label: 'failed', value: 0.8 }
];

const PARCELS = (() => {
  const random = seeded(11);
  return Array.from({ length: 80 }, (_, id) => {
    const x = Math.round((0.2 + random() * 9.8) * 10) / 10;
    const y = Math.round(4 + x * 3.1 + (random() - 0.5) * 12);
    return { id, x, y, label: `parcel ${id + 1}: ${x} kg, $${y}` };
  });
})();

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
/** Each day's number in its month, the scatter type's number axis. */
const DAY_NUMBERS = DAYS.map((_, index) => 2 + index);
const SALES = [
  { name: 'online', values: [42, 51, 47, 63, 71, 88, 64] },
  { name: 'in store', values: [30, 28, 35, 33, 41, 57, 49] },
  { name: 'wholesale', values: [12, 18, null, 22, 19, 9, 6] }
];

/** The charts page's demo. */
export function ChartsDemo() {
  const [range, setRange] = useState<[number, number] | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [type, setType] = useState<ResultChartType>('column');
  const [stacked, setStacked] = useState(false);
  const typeId = useId();
  const xValues = useMemo(() => DAYS.map((_, index) => Date.UTC(2026, 10, 2 + index)), []);

  return (
    <div className="demo-stack charts-demo">
      <section>
        <h3 className="demo-subhead">LineChart</h3>
        <LineChart
          format={(value) => count.format(value)}
          from={range?.[0] ?? FROM}
          label="Requests per ten minutes"
          onSelect={(from, to) => setRange([from, to])}
          series={REQUESTS}
          timeText={(at) => clock.format(at)}
          to={range?.[1] ?? TO}
        />
        <code className="demo-readout">
          {range === null
            ? 'drag across the plot to zoom into a range'
            : `${clock.format(range[0])} to ${clock.format(range[1])} UTC `}
          {range === null ? null : (
            <button className="demo-link" onClick={() => setRange(null)} type="button">
              show the whole day
            </button>
          )}
        </code>
      </section>
      <div className="charts-pair">
        <section>
          <h3 className="demo-subhead">PieChart</h3>
          <PieChart format={(value) => `${value} h`} label="Time per state" slices={SLICES} />
        </section>
        <section className="charts-scatter">
          <h3 className="demo-subhead">ScatterChart</h3>
          <ScatterChart
            label="Price against weight"
            onPick={setPicked}
            picked={picked}
            points={PARCELS}
            x={{ title: 'weight (kg)', kind: 'number' }}
            y={{ title: 'price ($)', kind: 'number' }}
          />
        </section>
      </div>
      <section>
        <h3 className="demo-subhead">ResultChart</h3>
        <div className="demo-row">
          <label className="demo-row" htmlFor={typeId}>
            <span className="demo-label">Type</span>
          </label>
          <select
            className="demo-select field field-sm"
            id={typeId}
            onChange={(event) => setType(event.target.value as ResultChartType)}
            value={type}
          >
            {RESULT_CHART_TYPES.map((candidate) => (
              <option key={candidate}>{candidate}</option>
            ))}
          </select>
          <label className="demo-row">
            <input
              checked={stacked}
              className="check"
              disabled={!STACKABLE_CHART_TYPES.has(type)}
              onChange={(event) => setStacked(event.target.checked)}
              type="checkbox"
            />
            <span>Stacked</span>
          </label>
        </div>
        <div className="result-chart-frame">
          <ResultChart
            categories={DAYS}
            height={320}
            series={SALES}
            stacked={stacked}
            title="Sales by day"
            type={type}
            width={640}
            xLabel={type === 'scatter' ? 'day of November' : 'day'}
            xValues={type === 'scatter' ? DAY_NUMBERS : xValues}
            yLabel="orders"
          />
        </div>
      </section>
      <section>
        <h3 className="demo-subhead">With no data</h3>
        <LineChart
          format={(value) => count.format(value)}
          from={FROM}
          label="Requests per ten minutes, none yet"
          series={[]}
          timeText={(at) => clock.format(at)}
          to={TO}
        />
        <div className="charts-pair">
          <PieChart format={(value) => `${value} h`} label="Time per state, none yet" slices={[]} />
          <div className="charts-scatter">
            <ScatterChart
              label="Price against weight, none yet"
              onPick={() => undefined}
              picked={null}
              points={[]}
              x={{ title: 'weight (kg)', kind: 'number' }}
              y={{ title: 'price ($)', kind: 'number' }}
            />
          </div>
        </div>
        <div className="result-chart-frame">
          <ResultChart
            categories={[]}
            height={200}
            series={[]}
            stacked={false}
            title="Sales by day"
            type="column"
            width={640}
            xLabel="day"
            xValues={[]}
            yLabel="orders"
          />
        </div>
      </section>
    </div>
  );
}
