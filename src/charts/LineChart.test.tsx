import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { LineChart, type LineSeries } from './LineChart.js';

const SERIES: LineSeries[] = [
  {
    label: 'reads',
    points: [
      { at: 0, value: 1 },
      { at: 500, value: 5 },
      { at: 1000, value: 3 }
    ]
  },
  {
    label: 'writes',
    points: [
      { at: 0, value: null },
      { at: 1000, value: 2 }
    ]
  }
];

const chart = (onSelect?: (from: number, to: number) => void) => (
  <LineChart
    format={(value) => `${value} q`}
    from={0}
    label="Queries"
    onSelect={onSelect}
    series={SERIES}
    timeText={(at) => `t${at}`}
    to={1000}
  />
);

describe('the line chart', () => {
  it('reads out every series at the moment nearest the pointer, a missing value as dashes', () => {
    render(chart());

    const plot = screen.getByTestId('line-plot');

    expect(screen.queryByRole('status')).toBeNull();
    // jsdom lays nothing out, so the plot's box sits at the origin and a pointer's client place is its place.
    fireEvent.pointerMove(plot, { clientX: 0 });
    expect(screen.getByRole('status').textContent).toBe('Time: t0reads: 1 qwrites: ---');
    fireEvent.pointerMove(plot, { clientX: 10_000 });
    expect(screen.getByRole('status').textContent).toBe('Time: t1000reads: 3 qwrites: 2 q');
    fireEvent.pointerLeave(plot);
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('hands over the time range a drag picks, earlier end first, and nothing for a click', () => {
    const onSelect = vi.fn();

    render(chart(onSelect));

    const plot = screen.getByTestId('line-plot');

    fireEvent.pointerDown(plot, { button: 0, clientX: 10_000 });
    fireEvent.pointerMove(plot, { clientX: 0 });
    fireEvent.pointerUp(plot, { clientX: 0 });
    expect(onSelect).toHaveBeenCalledWith(0, 1000);

    onSelect.mockClear();
    fireEvent.pointerDown(plot, { button: 0, clientX: 40 });
    fireEvent.pointerUp(plot, { clientX: 40 });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('writes its read-out in the labels it is given', () => {
    render(
      <UiokProvider
        labels={{
          charts: {
            time: (time) => `Zeit ${time}`,
            seriesValue: (series, value) => `${series} = ${value}`
          }
        }}
      >
        {chart()}
      </UiokProvider>
    );
    fireEvent.pointerMove(screen.getByTestId('line-plot'), { clientX: 0 });
    expect(screen.getByRole('status').textContent).toBe('Zeit t0reads = 1 qwrites = ---');
  });
});
