import { describe, expect, it } from 'vitest';

import { MAX_ROW_BYTES } from './TextRows.logic.js';
import {
  copyRange,
  isCollapsed,
  MAX_COPY_BYTES,
  orderedSelection,
  rowParts,
  selectedSpan,
  selectedText,
  wordAt,
  type CopyRow,
  type TextSelection
} from './TextSelection.logic.js';

const point = (row: number, char: number, kind: 'line' | 'continuation' = 'line') => ({
  row,
  kind,
  char
});

describe('the selection', () => {
  it('orders its ends by their place in the file, whichever way it was dragged', () => {
    const backwards: TextSelection = { anchor: point(10, 2), focus: point(0, 5) };
    expect(orderedSelection(backwards)).toEqual([point(0, 5), point(10, 2)]);
    expect(isCollapsed({ anchor: point(3, 1), focus: point(3, 1) })).toBe(true);
  });

  it('marks the part of each row it covers', () => {
    const selection: TextSelection = { anchor: point(10, 2), focus: point(30, 4) };

    expect(selectedSpan(selection, 0, 8)).toBeNull();
    expect(selectedSpan(selection, 10, 8)).toEqual({ from: 2, to: 8 });
    expect(selectedSpan(selection, 20, 8)).toEqual({ from: 0, to: 8 });
    expect(selectedSpan(selection, 30, 8)).toEqual({ from: 0, to: 4 });
    expect(selectedSpan({ anchor: point(10, 8), focus: point(30, 0) }, 10, 8)).toBeNull();
  });

  it('joins the rows of one line directly and keeps each line break as the file spells it', () => {
    const rows: CopyRow[] = [
      { start: 0, end: 6, kind: 'line', text: 'first', lineBreak: '\n' },
      { start: 6, end: 17, kind: 'line', text: 'long line, ', lineBreak: '' },
      { start: 17, end: 28, kind: 'continuation', text: 'continued', lineBreak: '\r\n' },
      { start: 28, end: 32, kind: 'line', text: 'last', lineBreak: '' }
    ];

    expect(selectedText({ anchor: point(0, 2), focus: point(28, 2) }, rows)).toBe(
      'rst\nlong line, continued\r\nla'
    );
    expect(selectedText({ anchor: point(6, 5), focus: point(17, 4, 'continuation') }, rows)).toBe(
      'line, cont'
    );
    // A selection that stops at the end of a row's text leaves its break out.
    expect(selectedText({ anchor: point(0, 0), focus: point(0, 5) }, rows)).toBe('first');
  });

  it('copies everything to the end of the file when the selection runs there', () => {
    const rows: CopyRow[] = [
      { start: 0, end: 2, kind: 'line', text: 'a', lineBreak: '\n' },
      { start: 2, end: 4, kind: 'line', text: 'b', lineBreak: '\n' }
    ];
    expect(selectedText({ anchor: point(0, 0), focus: point(4, 0) }, rows)).toBe('a\nb\n');
    expect(
      selectedText({ anchor: point(0, 0), focus: point(1, 0) }, [
        { start: 0, end: 1, kind: 'line', text: '', lineBreak: '\n' }
      ])
    ).toBe('\n');
  });
});

describe('copyRange', () => {
  it('reads from the first row through the end of the last', () => {
    expect(copyRange({ anchor: point(100, 3), focus: point(500, 1) }, 10_000)).toEqual({
      offset: 100,
      length: 400 + MAX_ROW_BYTES
    });
    expect(copyRange({ anchor: point(0, 0), focus: point(900, 0) }, 900)).toEqual({
      offset: 0,
      length: 900
    });
  });

  it('refuses a selection larger than one bounded read', () => {
    const size = 1.2e9;
    expect(copyRange({ anchor: point(0, 0), focus: point(size, 0) }, size)).toBeNull();
    expect(
      copyRange({ anchor: point(0, 0), focus: point(MAX_COPY_BYTES, 0) }, MAX_COPY_BYTES)
    ).not.toBeNull();
  });
});

describe('a double click', () => {
  const text = 'const $user_name = fetch(id);   // ok';

  it('selects the word, run of spaces, or single character under the pointer', () => {
    expect(wordAt(text, 8)).toEqual({ from: 7, to: 16 });
    expect(text.slice(7, 16)).toBe('user_name');
    expect(wordAt(text, 6)).toEqual({ from: 6, to: 7 });
    expect(wordAt(text, 30)).toEqual({ from: 29, to: 32 });
    expect(wordAt(text, 28)).toEqual({ from: 28, to: 29 });
  });

  it('takes the word a caret right after it points at, and the last word past the end', () => {
    // The caret after "fetch" and after "id" lands before the bracket.
    expect(wordAt(text, 24)).toEqual({ from: 19, to: 24 });
    expect(wordAt(text, 27)).toEqual({ from: 25, to: 27 });
    expect(wordAt(text, text.length)).toEqual({ from: 35, to: 37 });
    expect(wordAt('', 0)).toEqual({ from: 0, to: 0 });
  });

  it('selects both halves of an emoji, whichever half the pointer is over', () => {
    const line = 'ok 🚀 go';
    expect(wordAt(line, 3)).toEqual({ from: 3, to: 5 });
    expect(wordAt(line, 4)).toEqual({ from: 3, to: 5 });
    expect(line.slice(3, 5)).toBe('🚀');
  });
});

describe('a row cut into parts', () => {
  const tokens = [
    { start: 0, end: 5, style: 1 },
    { start: 6, end: 10, style: 2 }
  ];

  it("cuts at token edges, leaving the gaps in the text's own style", () => {
    expect(rowParts(12, tokens, null)).toEqual([
      { from: 0, to: 5, selected: false, style: 1 },
      { from: 5, to: 6, selected: false, style: null },
      { from: 6, to: 10, selected: false, style: 2 },
      { from: 10, to: 12, selected: false, style: null }
    ]);
  });

  it('cuts a token where the selection starts and ends, keeping its style', () => {
    expect(rowParts(12, tokens, { from: 3, to: 8 })).toEqual([
      { from: 0, to: 3, selected: false, style: 1 },
      { from: 3, to: 5, selected: true, style: 1 },
      { from: 5, to: 6, selected: true, style: null },
      { from: 6, to: 8, selected: true, style: 2 },
      { from: 8, to: 10, selected: false, style: 2 },
      { from: 10, to: 12, selected: false, style: null }
    ]);
  });

  it('draws a plain row as one part', () => {
    expect(rowParts(4, null, null)).toEqual([{ from: 0, to: 4, selected: false, style: null }]);
  });
});
