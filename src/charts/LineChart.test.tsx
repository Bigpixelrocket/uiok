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
  it('says it has no value when nothing in its time axis has one', () => {
    const empty = (series: LineSeries[]) =>
      render(
        <LineChart
          format={String}
          from={0}
          label="Queries"
          series={series}
          timeText={String}
          to={1000}
        />
      ).container;
    const cases: LineSeries[][] = [
      [],
      [{ label: 'reads', points: [{ at: 500, value: null }] }],
      [{ label: 'reads', points: [{ at: 2000, value: 4 }] }]
    ];

    for (const series of cases) {
      const container = empty(series);

      expect(container.querySelector('.chart-empty')?.textContent).toBe('no value');
      expect(container.querySelector('.line-svg')).toBeNull();
      container.remove();
    }
    expect(empty(SERIES).querySelector('.chart-empty')).toBeNull();
  });

  it('measures its labels when values arrive in a plot that had none', () => {
    // Every label measures 72px, far wider than the 16px estimated for 'ab'.
    const measure = vi.fn(() => 72);
    Object.defineProperty(SVGElement.prototype, 'getComputedTextLength', {
      configurable: true,
      value: measure
    });

    try {
      const plot = (value: number | null) => (
        <LineChart
          format={() => 'ab'}
          from={0}
          label="Queries"
          series={[{ label: 'reads', points: [{ at: 500, value }] }]}
          timeText={() => 'ab'}
          to={1000}
        />
      );
      const { container, rerender } = render(plot(null));

      // The same ticks either way, so only the plot's mounting can ask for a measure.
      rerender(plot(0));
      expect(measure).toHaveBeenCalled();
      // The value axis makes room for a measured label: 72px and its 8px gap.
      expect(
        container.querySelector('.line-svg > g:not(.line-measure)')?.getAttribute('transform')
      ).toBe('translate(80 8)');
    } finally {
      delete (SVGElement.prototype as Partial<{ getComputedTextLength: unknown }>)
        .getComputedTextLength;
    }
  });

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

  it('marks a value with no neighbour with a dot at rest, and none on a line', () => {
    const { container } = render(chart());
    const dots = [...container.querySelectorAll('circle.line-dot')];

    // Only "writes" at 1000 stands alone (its neighbour is a gap).
    expect(dots).toHaveLength(1);
    expect(dots[0]?.getAttribute('r')).toBe('3');
  });
});
