import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { LineChart, type LineChartProps, type LineSeries } from './LineChart.js';
import { seriesColour } from './seriesColour.js';

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

  it('draws the same plot as before when given none of the newer props', () => {
    const { container } = render(chart());
    const plot = container.querySelector('.line-svg > g:not(.line-measure)');

    // The value axis's room is the 52px floor and its domain 0 to 5.5, a tenth over the top value.
    expect(plot?.getAttribute('transform')).toBe('translate(52 8)');
    expect(
      [...container.querySelectorAll('.line-tick:not(.line-measure) > text')]
        .map((text) => text.textContent)
        .filter((text) => text?.endsWith(' q'))
    ).toEqual(['0 q', '2 q', '4 q']);
    // A 258 by 146 plot: 5 sits at 146 - 5 / 5.5 × 146.
    expect(container.querySelector('path.line-series')?.getAttribute('d')).toBe(
      'M 0.0 119.5 l 0.01 0 L 129.0 13.3 L 258.0 66.4'
    );
    expect(
      [...container.querySelectorAll('path.line-series')].map((path) => path.getAttribute('stroke'))
    ).toEqual([seriesColour(0), seriesColour(1)]);
    expect(container.querySelector('clipPath, defs, [clip-path], .line-reference')).toBeNull();
    expect(container.querySelector('.line-legend')?.textContent).toBe('readswrites');
  });
});

describe('the line chart’s references, fixed range, gutter, and colours', () => {
  const props: LineChartProps = {
    format: (value) => `${value} °C`,
    from: 0,
    label: 'Load',
    series: SERIES,
    timeText: (at) => `t${at}`,
    to: 1000
  };

  it('draws each reference dashed in its tone and lists it with its value after the series', () => {
    const { container } = render(
      <LineChart
        {...props}
        references={[
          { value: 90, label: 'Warning', tone: 'warning' },
          { value: 98, label: 'Critical', tone: 'danger' },
          { value: 50, label: 'Target' },
          { value: Number.NaN, label: 'Broken', tone: 'danger' }
        ]}
      />
    );
    const lines = [...container.querySelectorAll('line.line-reference')];

    expect(lines.map((line) => line.getAttribute('class'))).toEqual([
      'line-reference line-reference-warning',
      'line-reference line-reference-danger',
      'line-reference line-reference-neutral'
    ]);
    // Under the series: every reference comes before the first series line.
    const first = container.querySelector('path.line-series')!;
    for (const line of lines) {
      expect(line.compareDocumentPosition(first) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    }
    // The auto axis grows to show the highest reference, so the 98 line sits inside the plot.
    expect(Number(lines[1]?.getAttribute('y1'))).toBeGreaterThan(0);

    const items = [...container.querySelectorAll('.line-legend li')];

    expect(items.map((item) => item.textContent)).toEqual([
      'reads',
      'writes',
      'Warning: 90 °C',
      'Critical: 98 °C',
      'Target: 50 °C'
    ]);
    expect(items[2]?.querySelector('.line-swatch')?.getAttribute('class')).toBe(
      'line-swatch line-swatch-dashed line-reference-warning'
    );
    // Series keep their positions' colours.
    expect(
      [...container.querySelectorAll('path.line-series')].map((path) => path.getAttribute('stroke'))
    ).toEqual([seriesColour(0), seriesColour(1)]);
  });

  it('leaves references out of the read-out and the hover dots', () => {
    const { container } = render(
      <LineChart {...props} references={[{ value: 90, label: 'Warning', tone: 'warning' }]} />
    );

    fireEvent.pointerMove(screen.getByTestId('line-plot'), { clientX: 10_000 });
    expect(screen.getByRole('status').textContent).toBe('Time: t1000reads: 3 °Cwrites: 2 °C');
    // The lone "writes" dot at rest and one hover dot per series.
    expect(container.querySelectorAll('circle.line-dot')).toHaveLength(3);
  });

  it('shows the empty state for references with no series value to draw', () => {
    const { container } = render(
      <LineChart {...props} references={[{ value: 90, label: 'Warning' }]} series={[]} />
    );

    expect(container.querySelector('.chart-empty')?.textContent).toBe('no value');
  });

  it('pins the value axis to its fixed ends and cuts values beyond them at the plot', () => {
    const { container } = render(
      <LineChart
        {...props}
        references={[
          { value: 120, label: 'Over', tone: 'danger' },
          { value: 100.5, label: 'Just over', tone: 'warning' },
          { value: 100, label: 'Top' }
        ]}
        series={[
          {
            label: 'cpu',
            points: [
              { at: 0, value: 40 },
              { at: 500, value: 140 },
              { at: 1000, value: 100 }
            ]
          }
        ]}
        valueMax={100}
        valueMin={0}
      />
    );
    const ticks = [...container.querySelectorAll('.line-tick:not(.line-measure) > text')]
      .map((text) => text.textContent ?? '')
      .filter((text) => text.endsWith('°C'))
      .map((text) => Number.parseFloat(text));

    expect(Math.min(...ticks)).toBe(0);
    expect(Math.max(...ticks)).toBe(100);

    const clip = container.querySelector('clipPath');
    const id = clip?.getAttribute('id') ?? '';

    expect(id).toMatch(/^line-clip-[\w-]+$/);
    // The clip spares half a line's stroke past every edge of the plot, so a line on a
    // fixed end or at the time axis's start or end keeps its whole stroke.
    const [, plotHeight, plotWidth] =
      /^M0 0V([\d.]+)H([\d.]+)$/.exec(
        container.querySelector('path.line-axes')?.getAttribute('d') ?? ''
      ) ?? [];
    const rect = clip?.querySelector('rect');

    expect(['x', 'y', 'width', 'height'].map((name) => Number(rect?.getAttribute(name)))).toEqual([
      -0.75,
      -0.75,
      Number(plotWidth) + 1.5,
      Number(plotHeight) + 1.5
    ]);
    expect(container.querySelector('path.line-series')?.getAttribute('clip-path')).toBe(
      `url(#${id})`
    );
    // Only the reference on the fixed end is drawn, whole and unclipped; every one stays in the legend.
    const lines = [...container.querySelectorAll('line.line-reference')];

    expect(lines.map((line) => [line.getAttribute('y1'), line.hasAttribute('clip-path')])).toEqual([
      ['0', false]
    ]);
    expect(
      [...container.querySelectorAll('.line-legend li')].map((item) => item.textContent)
    ).toEqual(['cpu', 'Over: 120 °C', 'Just over: 100.5 °C', 'Top: 100 °C']);
    // The 100 value sits on the plot's top edge; the 140 one is above it, cut by the clip.
    const path = container.querySelector('path.line-series')?.getAttribute('d') ?? '';
    const ys = [...path.matchAll(/[ML] [\d.]+ (-?[\d.]+)/g)].map((match) => Number(match[1]));

    expect(ys[2]).toBe(0);
    expect(ys[1]).toBeLessThan(0);

    fireEvent.pointerMove(screen.getByTestId('line-plot'), { clientX: 129 });
    // The read-out still says the true value; the dot beyond the fixed end is not drawn.
    expect(screen.getByRole('status').textContent).toContain('cpu: 140 °C');
    expect(container.querySelector('circle.line-dot')).toBeNull();

    // The dot on the fixed end is drawn whole, unclipped.
    fireEvent.pointerMove(screen.getByTestId('line-plot'), { clientX: 10_000 });
    const dot = container.querySelector('circle.line-dot');

    expect(dot?.getAttribute('cy')).toBe('0');
    expect(dot?.hasAttribute('clip-path')).toBe(false);
  });

  it('draws no hover dot for a moment outside the time axis on a fixed range', () => {
    const { container } = render(
      <LineChart
        {...props}
        series={[
          {
            label: 'cpu',
            points: [
              { at: -100, value: 50 },
              { at: 500, value: 60 }
            ]
          }
        ]}
        valueMax={100}
        valueMin={0}
      />
    );

    // The pointer at the plot's left edge is nearest the reading before the time axis starts.
    fireEvent.pointerMove(screen.getByTestId('line-plot'), { clientX: 0 });
    expect(screen.getByRole('status').textContent).toContain('cpu: 50 °C');
    // Only the 60's dot at rest (a lone value in the time axis), none in the gutter.
    const dots = () =>
      [...container.querySelectorAll('circle.line-dot')].map((dot) => dot.getAttribute('cx'));

    expect(dots()).toHaveLength(1);

    fireEvent.pointerMove(screen.getByTestId('line-plot'), { clientX: 129 });
    expect(dots()).toEqual([dots()[0], dots()[0]]);
  });

  it('cuts a value just past a fixed end and leaves its dot out', () => {
    const { container } = render(
      <LineChart
        {...props}
        series={[
          {
            label: 'cpu',
            points: [
              { at: 0, value: 101 },
              { at: 500, value: null },
              { at: 1000, value: 100 }
            ]
          }
        ]}
        valueMax={100}
        valueMin={0}
      />
    );
    const top = Number(container.querySelector('clipPath rect')?.getAttribute('y'));
    const ys = [
      ...(container.querySelector('path.line-series')?.getAttribute('d') ?? '').matchAll(
        /M [\d.]+ (-?[\d.]+)/g
      )
    ].map((match) => Number(match[1]));

    // 101 on a 146px plot sits 1.5px over its top, past the clip's edge, so none of it shows.
    expect(ys).toEqual([-1.5, 0]);
    // Its stroke reaches 0.75px either side of it, so not past the clip's top.
    expect(ys[0]! + 0.75).toBeLessThanOrEqual(top);
    // Of the two lone values, only the one on the fixed end gets its dot.
    expect(
      [...container.querySelectorAll('circle.line-dot')].map((dot) => dot.getAttribute('cy'))
    ).toEqual(['0']);
  });

  it('scales to the values when the fixed range is out of order or not finite', () => {
    const auto = render(<LineChart {...props} />).container;
    const ticksOf = (container: HTMLElement) =>
      [...container.querySelectorAll('.line-tick > text')].map((text) => text.textContent);
    const expected = ticksOf(auto);

    auto.remove();
    for (const [valueMin, valueMax] of [
      [10, 0],
      [5, 5],
      [Number.NaN, Number.NaN]
    ] as const) {
      const { container } = render(
        <LineChart {...props} valueMax={valueMax} valueMin={valueMin} />
      );

      expect(ticksOf(container)).toEqual(expected);
      expect(container.querySelector('clipPath')).toBeNull();
      container.remove();
    }
  });

  it('keeps the gutter it is given whatever its labels measure, and ignores one that is not positive', () => {
    const gutter = (valueAxisWidth: number) =>
      render(
        <LineChart {...props} format={() => 'a very long label'} valueAxisWidth={valueAxisWidth} />
      ).container;

    const fixed = gutter(64);
    expect(fixed.querySelector('.line-svg > g:not(.line-measure)')?.getAttribute('transform')).toBe(
      'translate(64 8)'
    );
    fixed.remove();

    // Unset in effect: the estimate of 17 glyphs at 8px and the 8px gap.
    expect(
      gutter(0).querySelector('.line-svg > g:not(.line-measure)')?.getAttribute('transform')
    ).toBe('translate(144 8)');
  });

  it('paints a series in its own colour and leaves the others on their positions’ tokens', () => {
    const { container } = render(
      <LineChart {...props} series={[SERIES[0]!, { ...SERIES[1]!, colour: 'var(--text)' }]} />
    );

    expect(
      [...container.querySelectorAll('path.line-series')].map((path) => path.getAttribute('stroke'))
    ).toEqual([seriesColour(0), 'var(--text)']);
    // The lone "writes" dot at rest, then both swatches in the legend.
    expect(container.querySelector('circle.line-dot')?.getAttribute('fill')).toBe('var(--text)');
    expect(
      [...container.querySelectorAll('.line-legend .line-swatch')].map(
        (swatch) => (swatch as HTMLElement).style.background
      )
    ).toEqual([seriesColour(0), 'var(--text)']);

    fireEvent.pointerMove(screen.getByTestId('line-plot'), { clientX: 10_000 });
    expect(
      [...screen.getByRole('status').querySelectorAll('.line-swatch')].map(
        (swatch) => (swatch as HTMLElement).style.background
      )
    ).toEqual([seriesColour(0), 'var(--text)']);
  });
});
