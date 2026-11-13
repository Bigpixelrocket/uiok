import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { highlightSegments } from './highlightSegments.js';
import { MarkedText } from './MarkedText.js';

describe('highlightSegments', () => {
  it('splits a text into matched and unmatched runs', () => {
    expect(highlightSegments('navigator.css', [0, 2, 10])).toEqual([
      { text: 'n', hit: true },
      { text: 'a', hit: false },
      { text: 'v', hit: true },
      { text: 'igator.', hit: false },
      { text: 'c', hit: true },
      { text: 'ss', hit: false }
    ]);
    expect(highlightSegments('ab', [0, 1])).toEqual([{ text: 'ab', hit: true }]);
  });

  it('keeps a text with no hit whole, and an empty one empty', () => {
    expect(highlightSegments('notes.txt', [])).toEqual([{ text: 'notes.txt', hit: false }]);
    expect(highlightSegments('', [])).toEqual([]);
  });

  it('keeps a character outside the basic plane whole when both its code units hit', () => {
    expect(highlightSegments('a😀b', [1, 2])).toEqual([
      { text: 'a', hit: false },
      { text: '😀', hit: true },
      { text: 'b', hit: false }
    ]);
  });
});

describe('MarkedText', () => {
  it('marks the hit runs in place, reading as the whole text', () => {
    const { container } = render(<MarkedText positions={[0, 1, 5]} text="index.ts" />);

    expect(container.textContent).toBe('index.ts');
    expect([...container.querySelectorAll('.name-hit')].map((hit) => hit.textContent)).toEqual([
      'in',
      '.'
    ]);
  });

  it('marks a hit with its wash and underline anywhere, keeping the colour the name has', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = render(<MarkedText positions={[0]} text="a" />);
    const hit = container.querySelector('.name-hit') as HTMLElement;

    expect(declaredValues(hit, 'background')).toEqual(['var(--match-bg)']);
    // An atomic box, so a name's ellipsis replaces a cut mark whole.
    expect(declaredValues(hit, 'display')).toEqual(['inline-block']);
    expect(declaredValues(hit, 'color')).toEqual([]);
  });
});
