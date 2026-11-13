import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readStylesheet } from '../../test/stylesheets.js';
import { ICON_LG, ICON_SM } from './sizes.js';
import { Spinner } from './Spinner.js';

describe('the spinner', () => {
  it('draws a hidden ring at an icon size, with the host’s classes', () => {
    const { container, rerender } = render(<Spinner />);
    const ring = container.querySelector('svg') as SVGElement;
    expect(ring.getAttribute('class')).toContain('spinner');
    expect(ring.getAttribute('aria-hidden')).toBe('true');
    expect(ring.getAttribute('width')).toBe(String(ICON_SM));

    rerender(<Spinner className="run-header-glyph" size={ICON_LG} />);
    const big = container.querySelector('svg') as SVGElement;
    expect(big.getAttribute('class')).toMatch(/\bspinner\b.*\brun-header-glyph\b/);
    expect(big.getAttribute('width')).toBe(String(ICON_LG));
  });

  it('turns, and stands still under reduced motion', () => {
    const sheet = readStylesheet('src/styles.css');
    expect(sheet).toMatch(
      /^\.spinner \{[^}]*animation: uiok-spin var\(--duration-spin\) linear infinite;/m
    );
    expect(sheet).toMatch(
      /@media \(prefers-reduced-motion: reduce\) \{\s*\.spinner \{\s*animation: none;/
    );
  });
});
