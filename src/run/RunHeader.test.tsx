import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
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

    expect(bar().className).toBe('activity-bar run-header-bar indeterminate moving');
    expect(bar().getAttribute('aria-valuenow')).toBeNull();

    rerender(
      <RunHeader
        bar={{ fraction: null, label: 'Compressing 3 items' }}
        figure="0:42"
        headline="Paused"
        state="paused"
      />
    );

    expect(bar().className).toBe('activity-bar run-header-bar indeterminate');
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

it('gives a headline cut short in a narrow view its whole sentence as a tooltip', () => {
  render(<RunHeader headline="Copying 240 files to the backup disk" state="running" />);

  expect(screen.getByText('Copying 240 files to the backup disk').dataset.tooltip).toBe(
    'Copying 240 files to the backup disk'
  );
});

describe('the progress header look', () => {
  it('fills a halted bar with the quiet idle mark, a failed one in the danger mark', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const fill = (state: string): string | undefined => {
      document.body.innerHTML = `<div class="run-header" data-state="${state}">
        <div class="activity-bar run-header-bar"><div class="activity-fill run-header-fill"></div></div>
      </div>`;

      return declaredValues(document.querySelector('.run-header-fill') as Element, 'background').at(
        -1
      );
    };

    expect(['running', 'paused', 'stopped', 'failed', 'done'].map(fill)).toEqual([
      'var(--accent)',
      'var(--progress-idle)',
      'var(--progress-idle)',
      'var(--danger)',
      'var(--success)'
    ]);
    document.body.innerHTML = '';
  });

  it('draws the shared spinner while running and a still glyph otherwise', () => {
    const { container, rerender } = render(<RunHeader headline="Running" state="running" />);
    expect(container.querySelector('svg.spinner.run-header-glyph')).not.toBeNull();

    rerender(<RunHeader headline="Paused" state="paused" />);
    expect(container.querySelector('svg.run-header-glyph')).not.toBeNull();
    expect(container.querySelector('.spinner')).toBeNull();
  });
});
