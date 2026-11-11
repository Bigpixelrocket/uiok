/**
 * Each chart over sample series: a day of requests (drag across it to pick a
 * range), time per state, price against weight (drag to zoom), and a week of
 * sales drawn as any result chart type; then edge cases (a pie of more slices
 * than series colours, a lone point between two gaps, a scatter over a
 * time-of-day axis and a category axis, and one over dates) and each chart
 * with nothing to draw.
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

import { DemoState, DemoStates } from '../DemoStates';
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

/** An hourly series with a lone reading between two gaps, drawn as a dot. */
const LONE_POINT = [
  {
    label: 'GET',
    points: Array.from({ length: 25 }, (_, hour) => ({
      at: FROM + hour * HOUR,
      value: hour >= 10 && hour <= 14 && hour !== 12 ? null : 20 + ((hour * 9) % 14)
    }))
  }
];

/** Twelve kinds of hours: past the eight series colours, slices are hatched and numbered. */
const KINDS = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
  'Holiday',
  'Overtime',
  'Night',
  'Weekend',
  'On call'
];

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
/** Thirty days of a month, more slices than a pie's legend can list in a short drawing. */
const MONTH_DAYS = Array.from({ length: 30 }, (_, index) => `Day ${index + 1}`);
/** Each day's number in its month, the scatter type's number axis. */
const DAY_NUMBERS = DAYS.map((_, index) => 2 + index);
const SALES = [
  { name: 'online', values: [42, 51, 47, 63, 71, 88, 64] },
  { name: 'in store', values: [30, 28, 35, 33, 41, 57, 49] },
  { name: 'wholesale', values: [12, 18, null, 22, 19, 9, 6] }
];

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Deploys by time of day (from midnight) against the weekday they ran on. */
const DEPLOYS = (() => {
  const random = seeded(23);
  return Array.from({ length: 40 }, (_, id) => {
    const day = Math.floor(random() * WEEKDAYS.length);
    const x = Math.round((8 + random() * 10) * 60) * 60_000;
    const hours = Math.floor(x / HOUR);
    const minutes = String(Math.round((x % HOUR) / 60_000)).padStart(2, '0');
    return { id, x, y: day, label: `deploy ${id + 1}: ${WEEKDAYS[day]} ${hours}:${minutes}` };
  });
})();

/** Build times over a month of dates. */
const BUILDS = (() => {
  const random = seeded(29);
  return Array.from({ length: 30 }, (_, id) => {
    const x = Date.UTC(2026, 9, 1 + id);
    const y = Math.round(40 + random() * 50);
    return { id, x, y, label: `build of 2026-10-${String(id + 1).padStart(2, '0')}: ${y} s` };
  });
})();

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
      <DemoStates minCell="320px" title="Edge cases">
        <DemoState label="Twelve slices">
          <div className="result-chart-frame">
            <ResultChart
              categories={KINDS}
              height={260}
              series={[{ name: 'hours', values: KINDS.map((_, index) => 4 + ((index * 7) % 11)) }]}
              stacked={false}
              title="Hours by kind"
              type="pie"
              width={460}
              xLabel="kind"
              xValues={[]}
              yLabel="hours"
            />
          </div>
        </DemoState>
        <DemoState label="A lone point between two gaps">
          <LineChart
            format={(value) => count.format(value)}
            from={FROM}
            label="Requests per hour"
            series={LONE_POINT}
            timeText={(at) => clock.format(at)}
            to={TO}
          />
        </DemoState>
        <DemoState label="Time-of-day and category axes">
          <div className="charts-scatter">
            <ScatterChart
              label="Deploys by time of day and weekday"
              onPick={() => undefined}
              picked={null}
              points={DEPLOYS}
              x={{ title: 'time of day (UTC)', kind: 'time', timeOfDay: true }}
              y={{ title: 'weekday', kind: 'category', categories: WEEKDAYS }}
            />
          </div>
        </DemoState>
        <DemoState label="A date axis">
          <div className="charts-scatter">
            <ScatterChart
              label="Build time by date"
              onPick={() => undefined}
              picked={null}
              points={BUILDS}
              x={{ title: 'date', kind: 'time' }}
              y={{ title: 'build (s)', kind: 'number' }}
            />
          </div>
        </DemoState>
        <DemoState label="Thirty slices, the legend counting those it leaves out">
          <div className="result-chart-frame">
            <ResultChart
              categories={MONTH_DAYS}
              height={260}
              series={[
                { name: 'orders', values: MONTH_DAYS.map((_, index) => 3 + ((index * 7) % 13)) }
              ]}
              stacked={false}
              title="Orders by day"
              type="pie"
              width={460}
              xLabel="day"
              xValues={[]}
              yLabel="orders"
            />
          </div>
        </DemoState>
      </DemoStates>
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
