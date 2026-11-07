import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PieChart } from './PieChart.js';

describe('the pie chart', () => {
  it('names each slice with its value and share, in the chart tokens, and lights a slice with its row', () => {
    const { container } = render(
      <PieChart
        format={(value) => `${value} s`}
        label="Time per state"
        slices={[
          { label: 'sending', value: 3 },
          { label: 'idle', value: 0 },
          { label: 'locked', value: 1 }
        ]}
      />
    );
    const slices = container.querySelectorAll('.pie-slice');
    const rows = screen.getAllByRole('listitem');

    expect(screen.getByRole('figure', { name: 'Time per state' })).toBeTruthy();
    expect(rows.map((row) => row.textContent)).toEqual(['sending3 s (75.0%)', 'locked1 s (25.0%)']);
    expect([...slices].map((slice) => slice.getAttribute('fill'))).toEqual([
      'var(--chart-1)',
      'var(--chart-2)'
    ]);

    fireEvent.pointerEnter(rows[1] as Element);
    expect(slices[1]?.getAttribute('class')).toBe('pie-slice lit');
    fireEvent.pointerLeave(rows[1] as Element);
    expect(slices[1]?.getAttribute('class')).toBe('pie-slice');
  });
});
