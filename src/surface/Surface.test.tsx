import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { GroupSwatch } from './GroupSwatch.js';
import { Tag } from './Tag.js';

describe('GroupSwatch', () => {
  it('draws a hidden swatch in its group’s hue, or names it when it stands alone', () => {
    const { container, rerender } = render(<GroupSwatch group="purple" />);
    const swatch = container.firstElementChild as HTMLElement;

    expect(swatch.className).toBe('group-swatch');
    expect(swatch.dataset.group).toBe('purple');
    expect(swatch.getAttribute('aria-hidden')).toBe('true');

    rerender(<GroupSwatch group={null} hollow label="No group" />);
    const named = screen.getByRole('img', { name: 'No group' });

    expect(named.className).toBe('group-swatch hollow');
    expect(named.hasAttribute('data-group')).toBe(false);
    expect(named.dataset.tooltip).toBe('No group');
  });

  it('fills an 8px square with the hue, faint with no group, and outlines it when hollow', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML =
      '<span class="group-swatch" data-group="teal"></span><span class="group-swatch hollow"></span>';
    const [filled, hollow] = [...document.querySelectorAll('.group-swatch')] as HTMLElement[];

    expect(declaredValues(filled as Element, 'width')).toEqual(['var(--space-4)']);
    expect(declaredValues(filled as Element, '--group-swatch-hue')).toEqual(['var(--group-teal)']);
    expect(declaredValues(filled as Element, 'background')).toEqual([
      'var(--group-swatch-hue, var(--text-faint))'
    ]);
    expect(declaredValues(hollow as Element, 'background').at(-1)).toBe('transparent');
    expect(declaredValues(hollow as Element, 'box-shadow').at(-1)).toContain('var(--line-strong)');
    document.body.innerHTML = '';
  });
});

describe('Tag', () => {
  it('draws its words in a tone, neutral by default, in their case unless caps', () => {
    const { rerender } = render(<Tag>default</Tag>);
    const tag = screen.getByText('default');

    expect(tag.className).toBe('tag');
    expect(tag.dataset.tone).toBe('neutral');
    expect(tag.hasAttribute('aria-description')).toBe(false);

    rerender(
      <Tag caps tip="Writes reach real users" tone="danger">
        Production
      </Tag>
    );
    const toned = screen.getByText('Production');

    expect(toned.className).toBe('tag caps');
    expect(toned.dataset.tone).toBe('danger');
    expect(toned.getAttribute('aria-description')).toBe('Writes reach real users');
    expect(toned.dataset.tooltip).toBe('Writes reach real users');
  });

  it('washes each tone and sets its words in the tone’s text role', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const tones = ['neutral', 'accent', 'ready', 'warning', 'danger'];
    document.body.innerHTML = tones
      .map((tone) => `<span class="tag" data-tone="${tone}">x</span>`)
      .join('');
    const looks = [...document.querySelectorAll('.tag')].map((tag) => [
      declaredValues(tag, '--tag-wash').at(-1),
      declaredValues(tag, '--tag-text').at(-1)
    ]);

    expect(looks).toEqual([
      ['var(--fill)', 'var(--text-on-surface)'],
      ['var(--accent-wash)', 'var(--accent-text)'],
      ['var(--success-wash)', 'var(--success-text)'],
      ['var(--warning-wash)', 'var(--warning-text)'],
      ['var(--danger-wash)', 'var(--danger-text)']
    ]);
    const tag = document.querySelector('.tag') as Element;
    expect(declaredValues(tag, 'text-transform')).toEqual([]);
    document.body.innerHTML = '';
  });
});

describe('notice and overline additions', () => {
  it('sets a notice’s code in the code face at its size, and lets an overline keep its case', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    document.body.innerHTML =
      '<div class="notice"><p class="notice-text">Failed: <code>ER_LOCK</code></p></div>' +
      '<h3 class="overline keep-case">public</h3>';

    const code = document.querySelector('code') as Element;
    expect(declaredValues(code, 'font-family').at(-1)).toBe('var(--font-mono)');
    expect(declaredValues(code, 'font-size').at(-1)).toBe('inherit');

    const overline = document.querySelector('.overline') as Element;
    expect(declaredValues(overline, 'text-transform').at(-1)).toBe('none');
    document.body.innerHTML = '';
  });
});
