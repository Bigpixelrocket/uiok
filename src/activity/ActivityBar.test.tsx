import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readStylesheet } from '../../test/stylesheets.js';
import { ActivityBar } from './ActivityBar.js';

const renderBar = (fraction: number | null, moving: boolean): HTMLElement => {
  render(
    <ActivityBar
      className="track"
      fillClassName="fill"
      fraction={fraction}
      label="Copying 2 items"
      moving={moving}
    />
  );

  return screen.getByRole('progressbar', { name: 'Copying 2 items' });
};

describe('ActivityBar', () => {
  it('fills as far as the fraction, clamped, with its value for assistive technology', () => {
    const bar = renderBar(1.4, true);

    expect(bar.className).toBe('track');
    expect(bar.getAttribute('aria-valuenow')).toBe('140');
    expect((bar.firstElementChild as HTMLElement).style.width).toBe('100%');
  });

  it('draws moving stripes for a run that reports no fraction, read as busy', () => {
    const bar = renderBar(null, true);

    expect(bar.className).toBe('track indeterminate moving');
    expect(bar.getAttribute('aria-busy')).toBe('true');
    expect(bar.getAttribute('aria-valuenow')).toBeNull();
    expect(bar.firstElementChild?.className).toBe('fill activity-stripes');
  });

  it('stands its stripes still while the run is not working', () => {
    const bar = renderBar(null, false);

    expect(bar.className).toBe('track indeterminate');
    expect(bar.getAttribute('aria-busy')).toBe('false');
  });
});

describe('the activity stripes', () => {
  const styles = readStylesheet('src/activity/activity.css');

  it('scroll only while the run works, and never under reduced motion', () => {
    // Only a moving bar animates: waiting, paused, and settled stripes stand still.
    expect(styles).toMatch(
      /\.indeterminate\.moving > \.activity-stripes\s*\{[^}]*animation:\s*activity-stripes /
    );
    expect(styles).not.toMatch(/\.indeterminate > \.activity-stripes\s*\{[^}]*animation:/);
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.indeterminate\.moving > \.activity-stripes\s*\{\s*animation:\s*none;/
    );
  });
});
