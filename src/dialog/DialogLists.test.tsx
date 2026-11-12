import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { DialogNames } from './DialogLists.js';

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
