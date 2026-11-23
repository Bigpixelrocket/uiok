import { render, screen } from '@testing-library/react';
import { Database } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { ProductMark, type ProductMarkShape } from './ProductMark.js';

const PHP: ProductMarkShape = {
  title: 'PHP',
  path: 'M0 0h24v24H0z',
  colour: '#777bb4'
};

describe('ProductMark', () => {
  it('draws the mark in the colour it is handed, decorative, its name as its tooltip', () => {
    const { container } = render(<ProductMark mark={PHP} />);
    const mark = container.querySelector('.product-mark') as HTMLElement;

    expect(mark.getAttribute('aria-hidden')).toBe('true');
    expect(mark.style.getPropertyValue('--product-mark-colour')).toBe('#777bb4');
    expect(mark.dataset.tooltip).toBe('PHP');
    expect(mark.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(mark.querySelector('path')?.getAttribute('d')).toBe(PHP.path);
  });

  it('mixes the brand colour toward the text by the theme token', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(<ProductMark mark={PHP} />);
    const svg = container.querySelector('.product-mark > svg') as SVGElement;

    expect(declaredValues(svg, '--product-mark-fill').join(' ')).toMatch(
      /var\(--product-mark-colour,\s*currentColor\) var\(--product-mark-mix\)/
    );
    expect(declaredValues(svg, 'fill')).toContain('var(--product-mark-fill)');
  });

  it('outlines a hairline mark and shows the part of the artwork asked for', () => {
    const { container } = render(
      <ProductMark mark={{ ...PHP, stroke: 0.6, viewBox: '0 0 12 12' }} />
    );
    const mark = container.querySelector('.product-mark') as HTMLElement;

    expect(mark.style.getPropertyValue('--product-mark-stroke')).toBe('0.6');
    expect(mark.querySelector('path')?.getAttribute('class')).toBe('product-mark-outline');
    expect(mark.querySelector('svg')?.getAttribute('viewBox')).toBe('0 0 12 12');
  });

  it('draws the fallback glyph without a mark, and names itself when it stands alone', () => {
    render(<ProductMark fallback={Database} label="Database" />);
    const mark = screen.getByRole('img', { name: 'Database' });

    expect(mark.className).toBe('product-mark glyph');
    expect(mark.querySelector('svg')).not.toBe(null);
  });

  it("takes a row icon column's tone, and the quiet icon tone elsewhere", () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(
      <div className="listing-root">
        <div className="pane-listing">
          <div className="row cursor">
            <span className="row-icon">
              <ProductMark fallback={Database} />
            </span>
          </div>
          <div className="row cursor">
            <span className="tree-glyph">
              <ProductMark fallback={Database} />
            </span>
          </div>
        </div>
        <ProductMark fallback={Database} />
      </div>
    );
    const [inRow, inTree, alone] = [
      ...container.querySelectorAll('.product-mark')
    ] as HTMLElement[];

    expect(getComputedStyle(inRow as HTMLElement).color).toBe('var(--text-on-surface)');
    expect(getComputedStyle(inTree as HTMLElement).color).toBe('var(--text-on-surface)');
    expect(getComputedStyle(alone as HTMLElement).color).toBe('var(--text-dim)');
  });
});
