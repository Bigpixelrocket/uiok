import { describe, expect, it } from 'vitest';

import {
  collectWrappedTerminalLinkLine,
  extractTerminalLinks,
  isTerminalUrl,
  type TerminalBufferLineLike
} from './links.logic.js';

function createBufferLine(text: string, isWrapped = false): TerminalBufferLineLike {
  return {
    isWrapped,
    translateToString: (trimRight = false) => (trimRight ? text.replace(/\s+$/u, '') : text)
  };
}

describe('extractTerminalLinks', () => {
  it('finds http urls and leaves file paths alone', () => {
    const line = 'failed at https://example.com/docs and src/components/Terminal.tsx:42';
    expect(extractTerminalLinks(line)).toEqual([
      { text: 'https://example.com/docs', start: 10, end: 34 }
    ]);
  });

  it('classifies uppercase schemes as URLs at activation time too', () => {
    expect(isTerminalUrl('HTTPS://example.com/docs')).toBe(true);
    expect(isTerminalUrl('Http://example.com')).toBe(true);
    expect(isTerminalUrl('src/components/main.ts')).toBe(false);
    expect(isTerminalUrl('httpsdocs/readme.md')).toBe(false);
    expect(isTerminalUrl('file:///etc/hosts')).toBe(false);
  });

  it('finds URLs regardless of scheme casing', () => {
    expect(extractTerminalLinks('open HTTPS://example.com/docs')).toEqual([
      { text: 'HTTPS://example.com/docs', start: 5, end: 29 }
    ]);
  });

  it('trims trailing punctuation and unbalanced closing brackets', () => {
    expect(extractTerminalLinks('(https://example.com/docs), and more.')).toEqual([
      { text: 'https://example.com/docs', start: 1, end: 25 }
    ]);
    expect(extractTerminalLinks('see https://en.wikipedia.org/wiki/Shell_(computing).')).toEqual([
      { text: 'https://en.wikipedia.org/wiki/Shell_(computing)', start: 4, end: 51 }
    ]);
  });

  it('keeps a trailing colon on URLs', () => {
    expect(extractTerminalLinks('GET https://example.test/items/foo:')).toEqual([
      { text: 'https://example.test/items/foo:', start: 4, end: 35 }
    ]);
  });
});

describe('collectWrappedTerminalLinkLine', () => {
  it('reconstructs a wrapped line from any physical row', () => {
    const firstSegment = 'see https://example.com/a';
    const secondSegment = '/bc?x=1';
    const lines = [
      createBufferLine('prompt> '),
      createBufferLine(firstSegment),
      createBufferLine(secondSegment, true),
      createBufferLine('done')
    ];

    const fromFirstRow = collectWrappedTerminalLinkLine(2, (index) => lines[index]);
    const fromWrappedRow = collectWrappedTerminalLinkLine(3, (index) => lines[index]);

    expect(fromFirstRow).toEqual({
      text: `${firstSegment}${secondSegment}`,
      segments: [
        { bufferLineNumber: 2, text: firstSegment, startIndex: 0, endIndex: firstSegment.length },
        {
          bufferLineNumber: 3,
          text: secondSegment,
          startIndex: firstSegment.length,
          endIndex: firstSegment.length + secondSegment.length
        }
      ]
    });
    expect(fromWrappedRow).toEqual(fromFirstRow);
  });

  it('preserves trailing spaces on continued segments for downstream offsets', () => {
    const firstSegment = 'prefix   ';
    const secondSegment = 'https://example.com/path';
    const lines = [createBufferLine(firstSegment), createBufferLine(secondSegment, true)];

    const wrappedLine = collectWrappedTerminalLinkLine(2, (index) => lines[index]);

    expect(wrappedLine?.text).toBe(`${firstSegment}${secondSegment}`);
    expect(extractTerminalLinks(wrappedLine?.text ?? '')).toEqual([
      {
        text: secondSegment,
        start: firstSegment.length,
        end: firstSegment.length + secondSegment.length
      }
    ]);
  });
});
