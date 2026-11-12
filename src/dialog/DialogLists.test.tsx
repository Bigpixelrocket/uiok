import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { DialogFacts, DialogNames } from './DialogLists.js';

describe('DialogNames', () => {
  it('draws a name that fits exactly as written, its head and tail meeting with no blank', () => {
    applyStylesheets(readStylesheet('src/namecut/namecut.css'));

    const names = ['~/n1000/.controller 85977', '~/Documents/Q3 budget review.xlsx', '~/a b/c'];

    render(<DialogNames names={names} />);

    const lines = screen
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.name-cut-line'));

    // The drawn parts join into the path itself: no character added between them.
    expect(lines.map((line) => line?.textContent)).toEqual(names);

    // A middle cut that leaves a head of two characters ("~/") must not widen
    // it to the floor a cut head keeps for its ellipsis: the floor is capped
    // at the head's own width, so an uncut head ends where its text ends.
    const head = lines[0]?.querySelector('.name-cut-head');

    expect(head?.textContent).toBe('~/');
    expect(declaredValues(head as Element, 'min-width').at(-1)).toBe(
      'calc-size(max-content, min(size, 1ch + 1em))'
    );
  });

  it('keeps a short name whole, in one part', () => {
    render(<DialogNames names={['~/a b/c']} />);

    const line = screen.getByRole('listitem').querySelector('.name-cut-line');

    expect(line?.children).toHaveLength(1);
    expect(line?.textContent).toBe('~/a b/c');
  });
});

describe('DialogFacts', () => {
  it('keeps "+N more" whole after a value cut with its full text in a tooltip', () => {
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
    expect(getComputedStyle(names as Element).textOverflow).toBe('ellipsis');
    expect(getComputedStyle(names as Element).minWidth).toBe('0px');

    // The count of the rest never shrinks, so it stays in view.
    expect(more?.textContent).toBe('+3 more');
    expect(getComputedStyle(more as Element).flexShrink).toBe('0');
    expect(getComputedStyle(first?.querySelector('.dialog-fact-value') as Element).display).toBe(
      'flex'
    );

    // A row with nothing left out keeps one cut value with its tooltip.
    const value = second?.querySelector('.dialog-fact-value');

    expect(value?.querySelector('.dialog-fact-more')).toBeNull();
    expect(value?.getAttribute('data-tooltip')).toBe('nightly-backup, sitemap');
  });

  it('shows "+N more" alone when the row names none', () => {
    render(<DialogFacts facts={[{ label: 'Files', count: 9, more: 9 }]} />);

    expect(screen.getByRole('definition').textContent).toBe('9+9 more');
  });
});
