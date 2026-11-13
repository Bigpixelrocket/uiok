import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { DialogFacts, DialogItems } from './DialogLists.js';

describe('DialogItems', () => {
  it('draws names as the framed item list, exactly as written', () => {
    const names = ['~/n1000/.controller 85977', '~/Documents/Q3 budget review.xlsx', '~/a b/c'];

    render(<DialogItems items={names.map((name) => ({ name }))} />);

    const shown = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.dialog-item-name')?.textContent);

    expect(shown).toEqual(names);
    expect(screen.getByRole('list').classList.contains('dialog-items')).toBe(true);
  });
});

describe('DialogFacts', () => {
  it('keeps "+N more" whole after a value that wraps before it is cut, its text a tooltip', () => {
    applyStylesheets(readStylesheet('src/dialog/dialog.css'));

    render(
      <DialogFacts
        facts={[
          {
            label: 'Transactions',
            count: 5,
            value: 'Local MySQL (shop), Production (shop_live)',
            more: 3
          },
          { label: 'Schedules', count: 2, value: 'nightly-backup, sitemap' }
        ]}
      />
    );

    const [first, second] = screen.getAllByRole('definition');
    const names = first?.querySelector('.dialog-fact-names');
    const more = first?.querySelector('.dialog-fact-more');

    // The names are the box that cuts, so they carry the tooltip.
    expect(names?.getAttribute('data-tooltip')).toBe('Local MySQL (shop), Production (shop_live)');
    expect(names?.hasAttribute('data-tooltip-cut')).toBe(true);
    // An identifying value wraps, up to three lines, before it is ever cut.
    expect(getComputedStyle(names as Element).whiteSpace).not.toBe('nowrap');
    expect(declaredValues(names as Element, 'overflow-wrap').at(-1)).toBe('anywhere');
    expect(declaredValues(names as Element, '-webkit-line-clamp').at(-1)).toBe('3');
    expect(getComputedStyle(names as Element).minWidth).toBe('0px');

    // The count of the rest never shrinks, so it stays in view.
    expect(more?.textContent).toBe('+3 more');
    expect(getComputedStyle(more as Element).flexShrink).toBe('0');
    expect(getComputedStyle(first?.querySelector('.dialog-fact-value') as Element).display).toBe(
      'flex'
    );

    // A row with nothing left out wraps its value the same way, with its tooltip.
    const value = second?.querySelector('.dialog-fact-value');

    expect(value?.querySelector('.dialog-fact-more')).toBeNull();
    expect(value?.getAttribute('data-tooltip')).toBe('nightly-backup, sitemap');
    expect(declaredValues(value as Element, '-webkit-line-clamp').at(-1)).toBe('3');
  });

  it('shows "+N more" alone when the row names none', () => {
    render(<DialogFacts facts={[{ label: 'Files', count: 9, more: 9 }]} />);

    expect(screen.getByRole('definition').textContent).toBe('9+9 more');
  });
});
