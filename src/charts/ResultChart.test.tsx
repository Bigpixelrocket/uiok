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

    expect(readout(container)).toBe(' ');
    fireEvent.pointerOver(
      container.querySelector('.result-chart-mark[data-series="1"][data-at="2"]') as Element
    );
    expect(readout(container)).toBe('costs, Wed: 4');
    fireEvent.pointerOver(
      container.querySelector('.result-chart-mark[data-series="0"][data-at="1"]') as Element
    );
    expect(readout(container)).toBe('sales, Tue: 5');
    fireEvent.pointerOver(container.querySelector('.result-chart-baseline') as Element);
    expect(readout(container)).toBe('sales, Tue: 5');
    fireEvent.pointerLeave(svg);
    expect(readout(container)).toBe(' ');
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
    const swatch = [...container.querySelectorAll('.result-chart-legend')]
      .find((label) => label.textContent === 'positive')
      ?.parentElement?.querySelector('rect');

    expect(slices).toHaveLength(1);
    expect(slices[0]?.getAttribute('data-at')).toBe('1');
    expect(swatch).toBeTruthy();
    expect(slices[0]?.getAttribute('fill')).toBe(swatch?.getAttribute('fill'));
    fireEvent.pointerOver(slices[0] as Element);
    expect(readout(container)).toBe('positive: 5');
  });
});
