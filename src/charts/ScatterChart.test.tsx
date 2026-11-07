import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import { ScatterChart } from './ScatterChart.js';

const POINTS = Array.from({ length: 10 }, (_, at) => ({
  id: at,
  x: at,
  y: at * 2,
  label: `point ${at}`
}));

describe('the scatter chart’s zoom rectangle', () => {
  it('follows a drag over the plot without drawing the points again, then zooms to it', () => {
    const { container } = render(
      <ScatterChart
        label="y against x"
        onPick={() => undefined}
        points={POINTS}
        x={{ title: 'x', kind: 'number' }}
        y={{ title: 'y', kind: 'number' }}
      />
    );
    const plot = screen.getByTestId('scatter-plot');
    // jsdom lays nothing out, so the plot's box sits at the origin and a pointer's client place is its place.
    const first = container.querySelector('.scatter-point');

    expect(container.querySelector('.scatter-selection')).toBeNull();
    fireEvent.pointerDown(plot, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(plot, { clientX: 120, clientY: 90 });

    const selection = container.querySelector('.scatter-selection');

    expect(selection?.getAttribute('width')).toBe('120');
    expect(selection?.getAttribute('height')).toBe('90');
    fireEvent.pointerMove(plot, { clientX: 200, clientY: 150 });
    expect(selection?.getAttribute('width')).toBe('200');
    expect(container.querySelector('.scatter-point')).toBe(first);
    expect(screen.getByText('10 points')).toBeTruthy();

    fireEvent.pointerUp(plot, { clientX: 200, clientY: 150 });
    expect(container.querySelector('.scatter-selection')).toBeNull();
    expect(screen.getByText(/^\d of 10 points$/u)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Reset zoom' }));
    expect(screen.getByText('10 points')).toBeTruthy();
  });

  it('writes its count and zoom control in the labels it is given', () => {
    render(
      <UiokProvider
        labels={{
          charts: {
            points: (count) => `${count} Punkte`,
            pointsShown: (shown, count) => `${shown} von ${count} Punkten`,
            resetZoom: 'Zoom zurücksetzen'
          }
        }}
      >
        <ScatterChart
          label="y gegen x"
          onPick={() => undefined}
          points={POINTS}
          x={{ title: 'x', kind: 'number' }}
          y={{ title: 'y', kind: 'number' }}
        />
      </UiokProvider>
    );
    const plot = screen.getByTestId('scatter-plot');

    expect(screen.getByText('10 Punkte')).toBeTruthy();
    fireEvent.pointerDown(plot, { button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerUp(plot, { clientX: 200, clientY: 150 });
    expect(screen.getByText(/^\d von 10 Punkten$/u)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Zoom zurücksetzen' })).toBeTruthy();
  });
});
