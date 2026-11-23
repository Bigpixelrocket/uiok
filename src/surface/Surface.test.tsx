import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { PaneMessage } from '../listing/PaneMessage.js';
import { Spinner } from '../icon/Spinner.js';
import { Card } from './Card.js';
import { GroupSwatch } from './GroupSwatch.js';
import { Notice } from './Notice.js';
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

describe('Notice', () => {
  it('leads with its tone’s glyph and puts its actions after the words', () => {
    const { container } = render(
      <Notice actions={<button type="button">Retry</button>} role="alert" tone="danger">
        Could not save.
      </Notice>
    );
    const notice = screen.getByRole('alert');

    expect(notice.className).toBe('notice notice-danger');
    expect(notice.firstElementChild?.tagName.toLowerCase()).toBe('svg');
    expect(notice.firstElementChild?.classList.contains('lucide-circle-alert')).toBe(true);
    expect(container.querySelector('.notice-text')?.textContent).toBe('Could not save.');
    expect(container.querySelector('.notice-actions')?.textContent).toBe('Retry');
  });

  it('is a plain note by default, takes a glyph of its own or none, and cuts a band', () => {
    const { container, rerender } = render(<Notice>Applies to new windows.</Notice>);

    expect(screen.getByRole('status').className).toBe('notice');
    rerender(<Notice glyph={<Spinner />}>Checking…</Notice>);
    expect(container.querySelector('.notice-glyph')).not.toBeNull();
    rerender(
      <Notice band cutText="settings.json has a mistake." glyph={null} role={null} tone="warning">
        settings.json has a mistake.
      </Notice>
    );
    const band = container.firstElementChild as HTMLElement;
    expect(band.className).toBe('notice notice-warning notice-card');
    expect(band.hasAttribute('role')).toBe(false);
    expect(band.querySelector('svg')).toBeNull();
    expect((band.querySelector('.notice-text') as HTMLElement).dataset.tooltipCut).toBe('');
  });
});

describe('Card', () => {
  it('is a plain card, or a named region given a label', () => {
    const { container, rerender } = render(<Card>One subject</Card>);

    expect(container.firstElementChild?.className).toBe('card');
    rerender(<Card label="Updates">One subject</Card>);
    expect(screen.getByRole('region', { name: 'Updates' }).className).toBe('card');
  });
});

describe('PaneMessage', () => {
  it('says a line about a listing in its tone, live when asked', () => {
    const { container, rerender } = render(<PaneMessage>A hint.</PaneMessage>);

    // Outside every listing scope it carries the scope itself.
    expect(container.firstElementChild?.className).toBe('listing-root');
    expect(container.querySelector('p')?.className).toBe('pane-message');
    rerender(
      <PaneMessage live tone="danger">
        Refused.
      </PaneMessage>
    );
    expect(screen.getByRole('status').className).toBe('pane-message danger');
  });
});
