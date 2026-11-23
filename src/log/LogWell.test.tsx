import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LogWell } from './LogWell.js';

describe('LogWell', () => {
  it('writes each source in its own colour, the same colour on each of its lines', () => {
    const { container } = render(
      <LogWell
        label="Combined log"
        lines={[
          { key: 1, source: 'vite', text: 'ready in 412 ms' },
          { key: 2, source: 'web', text: 'Server running' },
          { key: 3, source: 'vite', text: 'hmr update' },
          { key: 4, source: 'reverb', text: 'Exited with code 1', tone: 'danger' }
        ]}
      />
    );

    expect(screen.getByRole('log', { name: 'Combined log' })).toBeTruthy();
    const sources = [...container.querySelectorAll<HTMLElement>('.log-source')].map((source) =>
      source.style.getPropertyValue('--log-source')
    );
    expect(sources).toEqual([
      'var(--log-source-1)',
      'var(--log-source-2)',
      'var(--log-source-1)',
      'var(--log-source-3)'
    ]);
    expect(
      (container.querySelector('.log-well') as HTMLElement).style.getPropertyValue(
        '--log-source-width'
      )
    ).toBe('6ch');
    expect(container.querySelectorAll('.log-line')[3]?.getAttribute('data-tone')).toBe('danger');
  });

  it('draws the words alone when no line has a source, and says when it is empty', () => {
    const { container, rerender } = render(
      <LogWell
        empty="No output yet."
        label="Output"
        lines={[{ key: 'a', text: 'listening on 5432' }]}
      />
    );

    expect(container.querySelector('.log-source, .log-bar')).toBeNull();
    rerender(<LogWell empty="No output yet." label="Output" lines={[]} />);
    expect(screen.getByText('No output yet.')).toBeTruthy();
  });
});
