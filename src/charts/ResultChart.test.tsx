import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ResultChart } from './ResultChart.js';
import type { ChartSeries, ResultChartType } from './ResultChart.logic.js';

const SERIES: ChartSeries[] = [
  { name: 'sales', values: [3, 5, null] },
  { name: 'costs', values: [1, 2, 4] }
];

const chart = (type: ResultChartType): HTMLElement =>
  render(
    <ResultChart
      categories={['Mon', 'Tue', 'Wed']}
      height={300}
      series={SERIES}
      stacked={false}
      title=""
      type={type}
      width={500}
      xLabel="day"
      xValues={[1, 2, 3]}
      yLabel="amount"
    />
  ).container;

const readout = (container: HTMLElement): string =>
  container.querySelector('.result-chart-readout')?.textContent ?? '';

describe('the result chart’s read-out', () => {
  it('names the value under the pointer from the mark it came onto, and keeps it over the axes', () => {
    const container = chart('line');
    const svg = container.querySelector('svg') as SVGSVGElement;

    expect(readout(container)).toBe('');
    expect(container.querySelector('.result-chart-float')).toBeNull();
    fireEvent.pointerOver(
      container.querySelector('.result-chart-mark[data-series="1"][data-at="2"]') as Element
    );
    expect(readout(container)).toBe('costs, Wed: 4');
    // The floating read-out beside the mark says the same, with the series' swatch.
    expect(container.querySelector('.result-chart-float')?.textContent).toBe('Wedcosts: 4');
    fireEvent.pointerOver(
      container.querySelector('.result-chart-mark[data-series="0"][data-at="1"]') as Element
    );
    expect(readout(container)).toBe('sales, Tue: 5');
    fireEvent.pointerOver(container.querySelector('.result-chart-baseline') as Element);
    expect(readout(container)).toBe('sales, Tue: 5');
    fireEvent.pointerLeave(svg);
    expect(readout(container)).toBe('');
    expect(container.querySelector('.result-chart-float')).toBeNull();
  });

  it('marks every bar and slice with its value, read out as each chart names it', () => {
    const bars = chart('column');

    // Sales has no value on Wednesday, so it draws no bar there.
    expect(bars.querySelectorAll('.result-chart-mark')).toHaveLength(5);
    fireEvent.pointerOver(bars.querySelector('rect[data-series="0"][data-at="0"]') as Element);
    expect(readout(bars)).toBe('sales, Mon: 3');

    const pie = chart('pie');

    fireEvent.pointerOver(pie.querySelector('path[data-at="1"]') as Element);
    expect(readout(pie)).toBe('Tue: 5');
  });

  it('draws and reads a pie slice as its own category when an earlier one has nothing', () => {
    const { container } = render(
      <ResultChart
        categories={['zero', 'positive']}
        height={300}
        series={[{ name: 'amount', values: [0, 5] }]}
        stacked={false}
        title=""
        type="pie"
        width={500}
        xLabel=""
        xValues={[]}
        yLabel=""
      />
    );
    const slices = container.querySelectorAll('path.result-chart-mark');
    // A legend entry is a 10px swatch in the series colour, then its name.
    const swatch = [...container.querySelectorAll('.result-chart-legend text')].find(
      (name) => name.textContent === 'positive'
    )?.previousElementSibling;

    expect(slices).toHaveLength(1);
    expect(slices[0]?.getAttribute('data-at')).toBe('1');
    expect(swatch).toBeTruthy();
    expect(slices[0]?.getAttribute('fill')).toBe(swatch?.getAttribute('fill'));
    fireEvent.pointerOver(slices[0] as Element);
    expect(readout(container)).toBe('positive: 5');
  });

  it('breaks an area’s fill where a value is missing, as its line breaks', () => {
    const { container } = render(
      <ResultChart
        categories={['Mon', 'Tue', 'Wed', 'Thu']}
        height={300}
        series={[{ name: 'wholesale', values: [3, 4, null, 5] }]}
        stacked={false}
        title=""
        type="area"
        width={500}
        xLabel=""
        xValues={[]}
        yLabel=""
      />
    );

    expect(container.querySelectorAll('path.result-chart-area')).toHaveLength(2);
  });

  it('says it has no value in its plot instead of drawing empty axes', () => {
    const { container } = render(
      <ResultChart
        categories={[]}
        height={300}
        series={[]}
        stacked={false}
        title="Sales"
        type="column"
        width={500}
        xLabel="day"
        xValues={[]}
        yLabel="orders"
      />
    );

    expect(container.querySelector('.chart-empty-text')?.textContent).toBe('no value');
    expect(container.querySelectorAll('.result-chart-grid')).toHaveLength(0);
  });
});

describe('the result chart’s pictures', () => {
  it('keeps an unstacked area from tinting through the areas in front', () => {
    const unstacked = chart('area');
    const fills = [...unstacked.querySelectorAll('.result-chart-area')];

    // "sales" (behind) is cut where "costs" (in front) fills; "costs" is whole.
    expect(fills.map((fill) => fill.getAttribute('mask') !== null)).toEqual([true, false]);
    expect(unstacked.querySelectorAll('mask .result-chart-mask-cut')).toHaveLength(1);
  });

  it('numbers a pie past eight slices on the slices and in the legend', () => {
    const names = Array.from({ length: 9 }, (_, at) => `k${at}`);
    const { container } = render(
      <ResultChart
        categories={names}
        height={300}
        series={[{ name: 'n', values: names.map(() => 1) }]}
        stacked={false}
        title=""
        type="pie"
        width={500}
        xLabel=""
        xValues={names.map(() => null)}
        yLabel=""
      />
    );

    expect(
      [...container.querySelectorAll('.result-chart-slice-tag text')].map((tag) => tag.textContent)
    ).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9']);
    expect(container.querySelector('.result-chart-legend text')?.textContent).toBe('1 k0');
  });

  it('tags only the pie slices its legend lists, and counts the rest after it', () => {
    const tagsAndLegend = (names: string[], width: number, height: number) => {
      const { container } = render(
        <ResultChart
          categories={names}
          height={height}
          series={[{ name: 'n', values: names.map((_, at) => 3 + ((at * 7) % 13)) }]}
          stacked={false}
          title="Orders"
          type="pie"
          width={width}
          xLabel=""
          xValues={names.map(() => null)}
          yLabel=""
        />
      );
      const tags = [...container.querySelectorAll('.result-chart-slice-tag text')].map((tag) =>
        Number(tag.textContent)
      );
      const listed = container.querySelectorAll('.result-chart-legend-swatch').length;
      const more = container.querySelector('.result-chart-legend-more')?.textContent;

      return { tags, listed, more };
    };

    for (const [names, width, height] of [
      [Array.from({ length: 30 }, (_, at) => `Day ${at + 1}`), 460, 260],
      [Array.from({ length: 25 }, (_, at) => `Product with a long name ${at + 1}`), 720, 400],
      [Array.from({ length: 25 }, (_, at) => String(at + 1)), 720, 400]
    ] as const) {
      const { tags, listed, more } = tagsAndLegend([...names], width, height);

      expect(listed).toBeLessThan(names.length);
      expect(more).toBe(`+${names.length - listed}`);
      expect(tags.length).toBeGreaterThan(0);
      expect(Math.max(...tags)).toBeLessThanOrEqual(listed);
    }
  });
});
