/**
 * Highlighting a screen of rows without the whole file. A TextMate grammar
 * tokenizes a line from the state the line before it left, so a row in the
 * middle of a file needs the state at its line's start. The session keeps
 * that state, keyed by the line's starting byte, for every line it has
 * tokenized recently, plus a checkpoint every `CHECKPOINT_LINES` lines that
 * it never drops. A screen's first line resumes, in this order:
 *
 * 1. from its own state, when the file's start leads to it ("exact");
 * 2. by tokenizing forward from the nearest exact state or checkpoint at
 *    most `MAX_CATCHUP_BYTES` back, within the bytes held;
 * 3. from its own state, when only an approximate one is known;
 * 4. by tokenizing forward from the nearest approximate state in reach;
 * 5. from the grammar's initial state, as if the file began there.
 *
 * A jump lands on an arbitrary byte, so step 5 is the usual first answer
 * there: the landed line starts fresh and is marked approximate, and the
 * file is never tokenized from its first line to reach a jump. Scrolling on
 * from any line carries its state forward line by line, so scrolling back
 * over tokenized lines costs nothing, and a later pass that reaches them
 * from an exact state replaces the approximate ones.
 *
 * A line longer than `maxLineBytes` is not tokenized: its rows show plain,
 * and the state before it carries on to the line after it unchanged. That
 * is the state every run from the file's start reaches, so it stays exact
 * when it was, and the lines after a long one are not tokenized again for
 * want of a better state. Nothing here touches the DOM or Shiki; the
 * tokenizer is passed in, so the worker binds Shiki and tests bind a fake.
 */

import type { TextLayout } from './TextEncoding.logic.js';
import { textDecoder } from './TextEncoding.logic.js';
import {
  lineStartBefore,
  rowAt,
  type RowBounds,
  type RowStart,
  type TextChunk
} from './TextRows.logic.js';

/** Lines between two checkpoints along a run of tokenized lines. */
export const CHECKPOINT_LINES = 2000;

/** How far back a screen may tokenize forward from a known state before it starts fresh. */
export const MAX_CATCHUP_BYTES = 256 * 1024;

/** Recent line states kept besides the checkpoints; the oldest go first. */
const MAX_LINE_STATES = 20_000;

/** How a token is drawn: a CSS color (null keeps the text's own) and its font style. */
export interface SyntaxStyle {
  readonly color: string | null;
  readonly italic: boolean;
  readonly bold: boolean;
  readonly strikethrough: boolean;
}

/** Characters [start, end) of a line or row, drawn in style `style` of the tokenizer's styles. */
export interface SyntaxToken {
  readonly start: number;
  readonly end: number;
  readonly style: number;
}

/** A grammar bound to a theme: tokenizes one line from the state the line before it left. */
export interface LineTokenizer<State> {
  readonly initial: State;
  readonly styles: readonly SyntaxStyle[];
  readonly tokenizeLine: (
    text: string,
    state: State
  ) => { readonly tokens: readonly SyntaxToken[]; readonly state: State };
}

/** Why a row shows plain: its line is past the length limit, or the held bytes do not reach its line's ends. */
type PlainReason = 'long' | 'unknown';

/** One row's highlighting, in the row's own characters. */
export interface RowHighlight {
  readonly start: number;
  /** The row's tokens; null when it shows plain. */
  readonly tokens: readonly SyntaxToken[] | null;
  readonly plain: PlainReason | null;
  /** Whether its line was tokenized from the state the file's start leads to. */
  readonly exact: boolean;
}

/** A session over one file: the bytes it may read, and the rows to highlight. */
export interface SyntaxSession {
  /** The bytes the view holds now; states found from earlier chunks stay. */
  readonly setChunk: (chunk: TextChunk, layout: TextLayout) => void;
  /** Highlights the rows of one screen, in order. */
  readonly highlight: (rows: readonly RowStart[]) => readonly RowHighlight[];
}

/** A grammar state at a line's start, whether the file's start leads to it, and lines since the last checkpoint. */
interface LineState<State> {
  readonly state: State;
  readonly exact: boolean;
  readonly since: number;
}

/**
 * A whole line in the held bytes: its rows (none for a line past the length
 * limit, which is never drawn highlighted), and where the next line starts
 * (null at the end of the file).
 */
interface HeldLine {
  readonly start: number;
  readonly rows: readonly RowBounds[];
  readonly long: boolean;
  readonly next: number | null;
}

/** Clips line tokens to characters [from, to) and shifts them to start at 0. */
function clipTokens(tokens: readonly SyntaxToken[], from: number, to: number): SyntaxToken[] {
  const clipped: SyntaxToken[] = [];

  for (const token of tokens) {
    const start = Math.max(token.start, from);
    const end = Math.min(token.end, to);
    if (end > start) clipped.push({ start: start - from, end: end - from, style: token.style });
  }

  return clipped;
}

/** A session that tokenizes with `tokenizer`, leaving lines over `maxLineBytes` plain. */
export function createSyntaxSession<State>(
  tokenizer: LineTokenizer<State>,
  maxLineBytes: number
): SyntaxSession {
  const states = new Map<number, LineState<State>>();
  const checkpoints = new Map<number, LineState<State>>();
  let chunk: TextChunk | null = null;
  let layout: TextLayout | null = null;
  let decoder: TextDecoder | null = null;

  const decode = (from: number, to: number): string =>
    chunk === null || decoder === null
      ? ''
      : decoder.decode(chunk.bytes.subarray(from - chunk.offset, to - chunk.offset));

  /** Keeps `entry` for the line at `start`, never replacing an exact state with an approximate one. */
  const remember = (start: number, entry: LineState<State>): void => {
    const known = states.get(start);
    if (known?.exact && !entry.exact) return;

    states.delete(start);
    states.set(start, entry);
    if (states.size > MAX_LINE_STATES) {
      const oldest = states.keys().next().value;
      if (oldest !== undefined) states.delete(oldest);
    }

    if (entry.since === 0 && !checkpoints.get(start)?.exact) checkpoints.set(start, entry);
  };

  /**
   * The line starting at `start`, or 'unknown' where the held bytes end
   * before it does. A long line whose end the bytes do not reach is still
   * long, with no next line.
   */
  const lineAt = (start: number): HeldLine | 'unknown' => {
    if (chunk === null || layout === null || start < chunk.offset) return 'unknown';

    const rows: RowBounds[] = [];
    let row: RowStart = { start, kind: 'line' };
    let long = false;

    for (;;) {
      const bounds = rowAt(chunk, layout, row);
      if (bounds === null) return long ? { start, rows: [], long, next: null } : 'unknown';

      long ||= bounds.textEnd - start > maxLineBytes;
      if (!long) rows.push(bounds);
      if (bounds.next === null || bounds.next.kind === 'line') {
        return { start, rows: long ? [] : rows, long, next: bounds.next?.start ?? null };
      }
      row = bounds.next;
    }
  };

  /**
   * Tokenizes `line` from `entry`, remembers the state its next line starts
   * in, and returns the tokens. A long line is skipped: its state carries
   * over unchanged.
   */
  const tokenize = (line: HeldLine, entry: LineState<State>) => {
    const texts = line.rows.map((row) => decode(row.start, row.textEnd));
    const result = line.long
      ? { tokens: [], state: entry.state }
      : tokenizer.tokenizeLine(texts.join(''), entry.state);
    const since = entry.since + 1 >= CHECKPOINT_LINES ? 0 : entry.since + 1;
    const after: LineState<State> = {
      state: result.state,
      exact: entry.exact,
      since
    };

    if (line.next !== null) remember(line.next, after);

    return { texts, tokens: result.tokens, after };
  };

  /** The state at `target` reached by tokenizing forward from `from`; null when a line on the way is not whole. */
  const walk = (from: number, entry: LineState<State>, target: number): LineState<State> | null => {
    let start = from;
    let state = entry;

    while (start < target) {
      const line = lineAt(start);
      if (line === 'unknown' || line.next === null) return null;

      state = tokenize(line, state).after;
      start = line.next;
    }

    return start === target ? state : null;
  };

  /** The nearest known line start before `target` in reach, exact ones only when `exact`. */
  const nearest = (target: number, exact: boolean): [number, LineState<State>] | null => {
    if (chunk === null || layout === null) return null;

    const floor = Math.max(chunk.offset, target - MAX_CATCHUP_BYTES);
    let best: [number, LineState<State>] | null =
      layout.contentStart >= floor && layout.contentStart < target
        ? [layout.contentStart, { state: tokenizer.initial, exact: true, since: 0 }]
        : null;

    for (const known of [checkpoints, states]) {
      for (const [start, entry] of known) {
        if (start < target && start >= floor && (entry.exact || !exact)) {
          if (best === null || start > best[0]) best = [start, entry];
        }
      }
    }

    return best;
  };

  /** The state the line at `start` begins in, by the order in this module's description. */
  const resume = (start: number): LineState<State> => {
    if (layout !== null && start <= layout.contentStart) {
      return { state: tokenizer.initial, exact: true, since: 0 };
    }

    const known = states.get(start) ?? checkpoints.get(start);
    if (known?.exact) return known;

    for (const exact of [true, false]) {
      if (!exact && known) return known;

      const from = nearest(start, exact);
      const reached = from === null ? null : walk(from[0], from[1], start);
      if (reached !== null) return reached;
    }

    return { state: tokenizer.initial, exact: false, since: 0 };
  };

  const highlight = (rows: readonly RowStart[]): readonly RowHighlight[] => {
    if (chunk === null || layout === null) return [];

    const results = new Map<number, RowHighlight>();
    const plain = (row: RowStart, reason: PlainReason): void => {
      results.set(row.start, { start: row.start, tokens: null, plain: reason, exact: false });
    };
    let carried: { readonly next: number; readonly entry: LineState<State> } | null = null;

    for (const row of rows) {
      if (results.has(row.start)) continue;

      const start =
        row.kind === 'line' ? row.start : lineStartBefore(chunk, layout, row.start, maxLineBytes);

      if (start === null) {
        const reachable = Math.max(layout.contentStart, row.start - maxLineBytes) >= chunk.offset;
        plain(row, reachable ? 'long' : 'unknown');
        continue;
      }

      const line = lineAt(start);
      if (line === 'unknown') {
        plain(row, 'unknown');
        carried = null;
        continue;
      }

      const entry = carried?.next === start ? carried.entry : resume(start);
      const { texts, tokens, after } = tokenize(line, entry);
      carried = line.next === null ? null : { next: line.next, entry: after };

      if (line.long) {
        plain(row, 'long');
        continue;
      }

      let offset = 0;
      line.rows.forEach((bounds, index) => {
        const length = texts[index]?.length ?? 0;
        results.set(bounds.start, {
          start: bounds.start,
          tokens: clipTokens(tokens, offset, offset + length),
          plain: null,
          exact: entry.exact
        });
        offset += length;
      });
    }

    return rows.flatMap((row) => results.get(row.start) ?? []);
  };

  return {
    setChunk: (next, nextLayout) => {
      if (layout === null || nextLayout.encoding !== layout.encoding) {
        decoder = textDecoder(nextLayout.encoding);
      }
      chunk = next;
      layout = nextLayout;
    },
    highlight
  };
}
