import { describe, expect, it } from 'vitest';

import {
  CHECKPOINT_LINES,
  createSyntaxSession,
  MAX_CATCHUP_BYTES,
  type LineTokenizer
} from './SyntaxSession.logic.js';
import type { TextLayout } from './TextEncoding.logic.js';
import { rowsFrom, type RowStart, type TextChunk } from './TextRows.logic.js';

const UTF8: TextLayout = { encoding: 'utf-8', contentStart: 0 };

/**
 * A tokenizer whose state counts the lines tokenized since it started, and
 * whose one token per line carries the state the line began in as its style,
 * so a row's style says which line of its run its state came from.
 */
function countingTokenizer(): LineTokenizer<number> & { calls: number } {
  const tokenizer = {
    calls: 0,
    initial: 0,
    styles: [],
    tokenizeLine: (text: string, state: number) => {
      tokenizer.calls += 1;
      return {
        tokens: text.length > 0 ? [{ start: 0, end: text.length, style: state }] : [],
        state: state + 1
      };
    }
  };
  return tokenizer;
}

/** A whole file held as one chunk. */
const held = (text: string): TextChunk => ({
  offset: 0,
  bytes: new TextEncoder().encode(text),
  eof: true
});

/** `count` lines of 11 bytes: "line 00000" and a line break. */
const numberedLines = (count: number): string =>
  Array.from({ length: count }, (_, index) => `line ${String(index).padStart(5, '0')}\n`).join('');
const LINE_BYTES = 11;

/** A screen of `count` rows from the start of line `line` of a numbered file. */
const screenAt = (chunk: TextChunk, line: number, count = 40): RowStart[] =>
  rowsFrom(chunk, UTF8, { start: line * LINE_BYTES, kind: 'line' }, count).rows.map(
    ({ start, kind }) => ({ start, kind })
  );

describe('the syntax session', () => {
  it('tokenizes only the lines in view, carrying the state from the start of the file', () => {
    const chunk = held(numberedLines(1000));
    const tokenizer = countingTokenizer();
    const session = createSyntaxSession(tokenizer, 4096);
    session.setChunk(chunk, UTF8);

    const first = session.highlight(screenAt(chunk, 0));
    expect(tokenizer.calls).toBe(40);
    expect(first.map((row) => row.tokens?.[0]?.style)).toEqual(
      Array.from({ length: 40 }, (_, index) => index)
    );
    expect(first.every((row) => row.exact)).toBe(true);

    // The next screen picks up where the last one left its state.
    const next = session.highlight(screenAt(chunk, 40));
    expect(tokenizer.calls).toBe(80);
    expect(next[0]?.tokens?.[0]?.style).toBe(40);
  });

  it('scrolls back over tokenized lines without catching up from anywhere', () => {
    const chunk = held(numberedLines(1000));
    const tokenizer = countingTokenizer();
    const session = createSyntaxSession(tokenizer, 4096);
    session.setChunk(chunk, UTF8);
    for (let line = 0; line < 400; line += 40) session.highlight(screenAt(chunk, line));
    tokenizer.calls = 0;

    const back = session.highlight(screenAt(chunk, 120));

    expect(tokenizer.calls).toBe(40);
    expect(back[0]?.tokens?.[0]?.style).toBe(120);
    expect(back[0]?.exact).toBe(true);
  });

  it('starts a jump past every known state afresh, without reading back to the first line', () => {
    const lines = Math.ceil((2 * MAX_CATCHUP_BYTES) / LINE_BYTES);
    const chunk = held(numberedLines(lines));
    const tokenizer = countingTokenizer();
    const session = createSyntaxSession(tokenizer, 4096);
    session.setChunk(chunk, UTF8);

    const landed = session.highlight(screenAt(chunk, lines - 100));

    expect(tokenizer.calls).toBe(40);
    expect(landed[0]?.tokens?.[0]?.style).toBe(0);
    expect(landed.every((row) => !row.exact)).toBe(true);
  });

  it('resumes a jump from the nearest checkpoint, which outlives the recent line states', () => {
    const lines = 30_000 + 100;
    const chunk = held(numberedLines(lines));
    const tokenizer = countingTokenizer();
    const session = createSyntaxSession(tokenizer, 4096);
    session.setChunk(chunk, UTF8);

    // Two jumps, each within catching-up reach of the last, tokenize every
    // line to 30,000, leaving a checkpoint every CHECKPOINT_LINES lines and
    // only the most recent line states.
    session.highlight(screenAt(chunk, 20_000));
    session.highlight(screenAt(chunk, 30_000));
    tokenizer.calls = 0;

    const target = 3 * CHECKPOINT_LINES + 500;
    const landed = session.highlight(screenAt(chunk, target));

    expect(tokenizer.calls).toBe(500 + 40);
    expect(landed[0]?.tokens?.[0]?.style).toBe(target);
    expect(landed[0]?.exact).toBe(true);
  });

  it('replaces an approximate state once a run from the file start reaches its line', () => {
    const lines = Math.ceil((2 * MAX_CATCHUP_BYTES) / LINE_BYTES);
    const chunk = held(numberedLines(lines));
    const tokenizer = countingTokenizer();
    const session = createSyntaxSession(tokenizer, 4096);
    session.setChunk(chunk, UTF8);
    const target = lines - 100;

    expect(session.highlight(screenAt(chunk, target))[0]?.exact).toBe(false);

    // Scroll down from the top, a screen at a time, until the target.
    for (let line = 0; line < target; line += 40) session.highlight(screenAt(chunk, line));
    const again = session.highlight(screenAt(chunk, target));

    expect(again[0]?.exact).toBe(true);
    expect(again[0]?.tokens?.[0]?.style).toBe(target);
  });

  it('shows a line past the length limit plain and carries the state over it, still exact', () => {
    const chunk = held(`a\n${'x'.repeat(5000)}\nb\n`);
    const tokenizer = countingTokenizer();
    const session = createSyntaxSession(tokenizer, 4096);
    session.setChunk(chunk, UTF8);
    const rows = rowsFrom(chunk, UTF8, { start: 0, kind: 'line' }, 20).rows.map(
      ({ start, kind }) => ({ start, kind })
    );

    const highlighted = session.highlight(rows);

    // The long line runs over four rows.
    expect(highlighted.map((row) => row.plain)).toEqual([
      null,
      'long',
      'long',
      'long',
      'long',
      null
    ]);
    expect(highlighted.at(-1)?.tokens?.[0]?.style).toBe(1);
    // Every run from the start reaches that state, so the page never asks
    // for the line again in hope of a better one.
    expect(highlighted.at(-1)?.exact).toBe(true);
  });

  it("splits a long line's tokens across its rows", () => {
    const line = `${'a'.repeat(1500)}${'b'.repeat(1500)}`;
    const chunk = held(`${line}\n`);
    const session = createSyntaxSession<number>(
      {
        initial: 0,
        styles: [],
        tokenizeLine: (text, state) => ({
          tokens: [
            { start: 0, end: 1500, style: 1 },
            { start: 1500, end: text.length, style: 2 }
          ],
          state
        })
      },
      4096
    );
    session.setChunk(chunk, UTF8);
    const rows = rowsFrom(chunk, UTF8, { start: 0, kind: 'line' }, 5).rows;

    const highlighted = session.highlight(rows.map(({ start, kind }) => ({ start, kind })));

    expect(rows.map((row) => row.textEnd - row.start)).toEqual([1024, 1024, 952]);
    expect(highlighted.map((row) => row.tokens)).toEqual([
      [{ start: 0, end: 1024, style: 1 }],
      [
        { start: 0, end: 476, style: 1 },
        { start: 476, end: 1024, style: 2 }
      ],
      [{ start: 0, end: 952, style: 2 }]
    ]);
  });

  it("starts a screen inside a line from that line's start", () => {
    const chunk = held(`${'a'.repeat(2500)}\nb\n`);
    const tokenizer = countingTokenizer();
    const session = createSyntaxSession(tokenizer, 4096);
    session.setChunk(chunk, UTF8);

    const highlighted = session.highlight([
      { start: 2048, kind: 'continuation' },
      { start: 2501, kind: 'line' }
    ]);

    expect(highlighted.map((row) => row.tokens?.[0])).toEqual([
      { start: 0, end: 452, style: 0 },
      { start: 0, end: 1, style: 1 }
    ]);
  });
});
