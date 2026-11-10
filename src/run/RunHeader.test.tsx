import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readStylesheet } from '../../test/stylesheets.js';
import { RunHeader } from './RunHeader.js';

describe('RunHeader', () => {
  it('announces the sentence without the ticking figure, and the bar only when given', () => {
    const { rerender } = render(<RunHeader figure="0:16" headline="Running" state="running" />);

    expect(screen.getByRole('status').textContent).toBe('Running');
    expect(screen.getByText('0:16')).toBeTruthy();
    expect(screen.queryByRole('progressbar')).toBeNull();

    rerender(
      <RunHeader
        bar={{ fraction: 0.386, label: 'Whole transfer' }}
        facts={['67.9 MB of 175 MB', '167 of 412 files']}
        figure="39%"
        headline="About 3 seconds left"
        state="running"
      />
    );

    const bar = screen.getByRole('progressbar', { name: 'Whole transfer' });
    expect(bar.getAttribute('aria-valuenow')).toBe('39');
    expect(screen.getByText('167 of 412 files')).toBeTruthy();
  });

  it('draws stripes for a run without a fraction, moving only while it runs', () => {
    const { rerender } = render(
      <RunHeader
        bar={{ fraction: null, label: 'Compressing 3 items' }}
        figure="0:42"
        headline="Running"
        state="running"
      />
    );
    const bar = (): HTMLElement => screen.getByRole('progressbar', { name: 'Compressing 3 items' });

    expect(bar().className).toBe('run-header-bar indeterminate moving');
    expect(bar().getAttribute('aria-valuenow')).toBeNull();

    rerender(
      <RunHeader
        bar={{ fraction: null, label: 'Compressing 3 items' }}
        figure="0:42"
        headline="Paused"
        state="paused"
      />
    );

    expect(bar().className).toBe('run-header-bar indeterminate');
  });

  it('turns the sentence into an alert with its reason once the run failed', () => {
    const { rerender } = render(<RunHeader headline="Running" state="running" />);
    const status = screen.getByRole('status');

    rerender(
      <RunHeader
        headline="Could not install the package"
        reason="The connection was reset."
        state="failed"
      />
    );

    expect(screen.queryByRole('status')).toBeNull();
    // A new element, not the status region with its role flipped, so it is announced.
    expect(screen.getByRole('alert')).not.toBe(status);
    expect(screen.getByRole('alert').textContent).toBe(
      'Could not install the packageThe connection was reset.'
    );
  });

  it('announces the given words instead of a sentence that ticks', () => {
    const { rerender } = render(
      <RunHeader
        announcement="Running"
        figure="39%"
        headline="About 3 seconds left"
        state="running"
      />
    );

    expect(screen.getByRole('status').textContent).toBe('Running');
    // Still on screen and readable, outside the live region.
    expect(screen.getByText('About 3 seconds left').closest('[role="status"]')).toBeNull();

    rerender(
      <RunHeader
        announcement="Running"
        figure="40%"
        headline="About 2 seconds left"
        state="running"
      />
    );

    expect(screen.getByRole('status').textContent).toBe('Running');
  });
});

describe('the progress header look', () => {
  const styles = readStylesheet('src/run/run.css');

  it('dims the stripes of a paused run in the progress header', () => {
    expect(styles).toMatch(
      /\.run-header:is\(\[data-state='paused'\][^)]*\)\s*\.indeterminate\s*> \.activity-stripes\s*\{[^}]*--stripe-ink:\s*var\(--text-dim\);/
    );
  });

  it('turns the running glyph, and stands it still under reduced motion', () => {
    expect(styles).toMatch(
      /\.run-header\[data-state='running'\] \.run-header-glyph\s*\{[^}]*animation:\s*uiok-spin /
    );
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.run-header\[data-state='running'\] \.run-header-glyph\s*\{\s*animation:\s*none;/
    );
  });
});
