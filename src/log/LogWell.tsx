import {
  isValidElement,
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react';
import { flushSync } from 'react-dom';

import { VisuallyHidden } from '../VisuallyHidden.js';
import { ansiSegments } from './Ansi.logic.js';
import {
  joinedRuns,
  lineAt,
  lineTops,
  logSourceColour,
  logSourceIndexes,
  logSourceWidth,
  visibleRun,
  type LineRun
} from './LogWell.logic.js';

/** One line of a log. */
export interface LogLine {
  /** Names the line among the log's; its place in the list where lines only ever append. */
  readonly key: string | number;
  /** What wrote it (a process's name, `queue.2`); none for a line of the log's own. */
  readonly source?: string | null;
  /** The line's words, as written. */
  readonly text: ReactNode;
  /** A line the host marks: a failure (`danger`), a warning, or one of the log's own quiet notes (`dim`). */
  readonly tone?: 'danger' | 'warning' | 'dim';
}

/** Props for {@link LogWell}. */
export interface LogWellProps {
  readonly lines: readonly LogLine[];
  /** The log's accessible name ("Combined log"). */
  readonly label: string;
  /** The sources in the order their colours go, so each keeps its colour; any other takes the next in turn. */
  readonly sources?: readonly string[];
  /**
   * Keeps the newest line in view while the reader is at the foot; a
   * reader scrolled up stays put.
   */
  readonly follow?: boolean;
  /** The words shown while the log has no line. */
  readonly empty?: string;
  /**
   * Reads the SGR escape sequences in each line whose text is a string
   * (`ansiSegments`): its colours, backgrounds, bold, dim, italic, and
   * underline, drawn in the theme's text tones; every other escape
   * sequence is dropped. Off, a string is drawn as written.
   */
  readonly ansi?: boolean;
}

/** A line's text as styled runs, each colour painted by log.css from its data attributes. */
function AnsiText({ text }: { readonly text: string }): ReactNode {
  return ansiSegments(text).map((run, index) =>
    run.fg === undefined &&
    run.bg === undefined &&
    run.bold === undefined &&
    run.dim === undefined &&
    run.italic === undefined &&
    run.underline === undefined ? (
      run.text
    ) : (
      <span
        className="log-ansi"
        data-bg={run.bg}
        data-bold={run.bold || undefined}
        data-dim={run.dim || undefined}
        data-fg={run.fg}
        data-italic={run.italic || undefined}
        data-underline={run.underline || undefined}
        key={index}
      >
        {run.text}
      </span>
    )
  );
}

/** How near the foot, in pixels, still counts as reading the newest line. */
const FOOT_SLACK = 8;

/** Lines drawn past each edge of the view, so a short scroll draws nothing new before the paint. */
const OVERSCAN = 20;

/**
 * How many of the newest lines the hidden live region holds, so a screen
 * reader hears each new line as it comes, the last ones of a large batch.
 */
const LIVE_TAIL = 50;

/** A line's height in pixels until one is measured: one line of the small code face. */
const LINE_ESTIMATE = 18;

/** How many lines' height a well with no laid-out height (a page held out of sight) draws. */
const UNLAID_LINES = 100;

const NO_SOURCES: readonly string[] = [];

/** A line's React key, its type kept so the key 1 and the key "1" stay two lines. */
const lineKey = (key: LogLine['key']): string => `${typeof key}:${key}`;

/** The element a selection's end sits in: the node itself, or a text node's parent. */
const elementOf = (node: Node | null): Element | null =>
  node === null ? null : node.nodeType === 1 ? (node as Element) : node.parentElement;

/** A selection's start before the well, or its end after it: no line's key can be either. */
const HEAD: unique symbol = Symbol('head');
const FOOT: unique symbol = Symbol('foot');

/** Where a selection over the well starts and ends: a line by key, or past the well's head or foot. */
interface SelectedLines {
  readonly start: LogLine['key'] | typeof HEAD;
  readonly end: LogLine['key'] | typeof FOOT;
}

/**
 * The index of the line a selection's `side` boundary at `node` and
 * `offset` takes in, in `well`: its line, or, in the room standing for
 * undrawn lines, that room's first line for a start and its last for an
 * end, since a boundary there covers the whole room. Null where it takes
 * in no line (a start after the last child, the empty words).
 */
const lineIn = (
  well: Element,
  node: Node,
  offset: number,
  side: 'start' | 'end'
): number | null => {
  // A boundary between the well's children takes in the child after it
  // (a start) or before it (an end).
  const at =
    node === well ? (well.childNodes[side === 'start' ? offset : offset - 1] ?? null) : node;
  const row = elementOf(at)?.closest<HTMLElement>('.log-line, .log-gap');

  if (row === null || row === undefined || !well.contains(row)) return null;
  if (row.classList.contains('log-line')) return Number(row.dataset.index);
  return side === 'start' ? Number(row.dataset.from) : Number(row.dataset.to) - 1;
};

/** The run of lines a selection covers (`LogWell`'s), empty with none. */
const selectedRun = (
  lines: readonly LogLine[],
  indexOf: ReadonlyMap<LogLine['key'], number>,
  selected: SelectedLines | null
): LineRun => {
  if (selected === null) return { start: 0, end: 0 };
  const start = selected.start === HEAD ? 0 : indexOf.get(selected.start);
  const end = selected.end === FOOT ? lines.length - 1 : indexOf.get(selected.end);

  if (start === undefined || end === undefined) return { start: 0, end: 0 };
  return { start: Math.min(start, end), end: Math.max(start, end) + 1 };
};

/**
 * The words in `node` as text, never mounting it: strings and numbers, and
 * the children of the elements that hold them (a link's words). What a
 * component draws of its own, beyond its children, has no words here.
 */
const wordsOf = (node: ReactNode): string => {
  if (typeof node === 'string') return node;
  if (typeof node === 'number' || typeof node === 'bigint') return String(node);
  if (Array.isArray(node)) return node.map((child: ReactNode) => wordsOf(child)).join('');
  if (isValidElement<{ readonly children?: ReactNode }>(node)) return wordsOf(node.props.children);
  return '';
};

/** A line as the live region speaks it: its source, then its words as text, an ANSI line's without its escapes. */
const spokenLine = (line: LogLine, ansi: boolean): string => {
  const words =
    ansi && typeof line.text === 'string'
      ? ansiSegments(line.text)
          .map((run) => run.text)
          .join('')
      : wordsOf(line.text);

  return line.source === undefined || line.source === null ? words : `${line.source} ${words}`;
};

/** One line of the well, drawn again only when what it shows changes. */
const LogRow = memo(function LogRow({
  line,
  index,
  colour,
  sourced,
  ansi
}: {
  readonly line: LogLine;
  readonly index: number;
  readonly colour: number | undefined;
  readonly sourced: boolean;
  readonly ansi: boolean;
}): ReactElement {
  return (
    <div className="log-line" data-index={index} data-tone={line.tone}>
      {sourced ? (
        <span
          className="log-source"
          style={
            colour === undefined
              ? undefined
              : ({ '--log-source': logSourceColour(colour) } as CSSProperties)
          }
        >
          {line.source ?? null}
        </span>
      ) : null}
      {sourced ? (
        <span aria-hidden className="log-bar">
          |
        </span>
      ) : null}
      <span className="log-text">
        {ansi && typeof line.text === 'string' ? <AnsiText text={line.text} /> : line.text}
      </span>
    </div>
  );
});

/**
 * A log in a well: each line in the code face, its source first in a
 * column as wide as the longest source and in that source's own colour
 * (`--log-source-*`, legible as text), a bar, then the words; a line the
 * host marks takes its tone. The words can be selected and copied. With
 * `follow`, a new line scrolls into view while the reader is at the foot.
 * It is a `log` region, so a screen reader hears new lines without being
 * moved; it takes the focus so the keys scroll it. With `ansi`, a line's
 * SGR colours and weights are drawn in the theme's text tones, its other
 * escape sequences dropped.
 *
 * It draws only the lines in view and a few past each edge, with blank
 * room standing for the rest, so a log of tens of thousands of lines
 * costs what one screen of it does. Each line drawn is measured, as long
 * lines wrap; a line not yet drawn counts as tall as the first lines
 * measured at this width. Away from the foot, the line at the top of the
 * view stays put by its key as lines above it are measured, the width
 * changes, or the host drops lines before it. While a selection covers
 * any of the well (dragged past it, a select-all of the well or the
 * page), every line it covers is drawn, so a copy takes them all. The
 * well itself is quiet (`aria-live="off"`), as lines it draws come and go
 * with the scroll; a hidden region after it holds the newest lines and
 * speaks each new one.
 */
export function LogWell({
  lines,
  label,
  sources = NO_SOURCES,
  follow = true,
  empty,
  ansi = false
}: LogWellProps): ReactElement {
  const well = useRef<HTMLDivElement>(null);
  const [atFoot, setAtFoot] = useState(true);
  // The well's scroll and its laid-out size, as last read.
  const [view, setView] = useState({ top: 0, height: 0, width: 0 });
  // A selection over the well: where it starts and ends in document order
  // (a line, or past the well's head or foot), every line between kept drawn.
  const [selected, setSelected] = useState<SelectedLines | null>(null);
  // Each line's measured height by key, and the height a line not yet
  // measured counts as: set by the first lines measured at this width and
  // kept, so lines measured later never move the ones around them.
  const heights = useRef(new Map<LogLine['key'], number>());
  const settledEstimate = useRef<number | null>(null);
  // Raised each time a measure changes the heights.
  const [measures, setMeasures] = useState(0);
  // Away from the foot, the line at the top of the view by key and how far
  // into it the view starts, so that line stays put as lines above it are
  // measured, the well's width changes, or the host drops lines before it;
  // and the scroll last read or made, so a scroll not yet heard is kept.
  const anchor = useRef<{ readonly key: LogLine['key']; readonly within: number } | null>(null);
  const lastTop = useRef(0);
  // A selection whose end sits in room standing for lines, or between the
  // well's children: the line it ends on, by key, and whether the end is
  // the selection's anchor. Drawing the lines takes that room away and
  // leaves the end before them, so the end moves to the line's end once
  // it is drawn.
  const pinEnd = useRef<{ readonly key: LogLine['key']; readonly backward: boolean } | null>(null);
  // The width the lines were last measured at, and whether the well is
  // out of layout now.
  const laidWidth = useRef(0);
  const unlaid = useRef(false);
  const latestLines = useRef(lines);

  latestLines.current = lines;

  const names = useMemo(() => lines.map((line) => line.source), [lines]);
  const indexOf = useMemo(
    () => new Map(lines.map((line, index) => [line.key, index] as const)),
    [lines]
  );
  const indexes = useMemo(() => logSourceIndexes(names, sources), [names, sources]);
  const width = useMemo(() => logSourceWidth(names), [names]);
  const estimate = settledEstimate.current ?? LINE_ESTIMATE;
  const tops = useMemo(
    () =>
      lineTops(
        lines.length,
        (index) => {
          const line = lines[index];

          return line === undefined ? undefined : heights.current.get(line.key);
        },
        estimate
      ),
    // `measures` stands for the heights a measure changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lines, estimate, measures]
  );
  const total = tops[lines.length] ?? 0;
  const height = view.height > 0 ? view.height : estimate * UNLAID_LINES;
  const following = follow && atFoot;
  const shown = visibleRun(
    tops,
    following ? Math.max(0, total - height) : view.top,
    height,
    OVERSCAN
  );
  const runs = joinedRuns([shown, selectedRun(lines, indexOf, selected)], lines.length);

  // The runs drawn, as a value, so measuring waits for what it draws to change.
  const drawnRuns = runs.map((run) => `${run.start}-${run.end}`).join();

  // The line at `top` by the heights this render draws, and how far into it `top` is.
  const anchorAt = (
    top: number
  ): { readonly key: LogLine['key']; readonly within: number } | null => {
    const first = lineAt(tops, top);
    const line = lines[first];

    return line === undefined ? null : { key: line.key, within: top - (tops[first] ?? 0) };
  };

  // The drawn lines' heights, after each render that changes what is
  // drawn: a change draws again with the room each line takes.
  useLayoutEffect(() => {
    const element = well.current;

    if (element === null) return;
    // An emptied log forgets its heights: a new run's keys may repeat.
    if (latestLines.current.length === 0) {
      heights.current = new Map();
      settledEstimate.current = null;
      anchor.current = null;
      return;
    }
    const known = heights.current;
    const changed: number[] = [];

    for (const row of element.querySelectorAll<HTMLElement>(':scope > .log-line')) {
      const index = Number(row.dataset.index);
      const line = latestLines.current[index];
      const measured = row.getBoundingClientRect().height;

      if (line === undefined || !(measured > 0)) continue;
      const before = known.get(line.key);

      if (before !== undefined && Math.abs(before - measured) < 0.5) continue;
      known.set(line.key, measured);
      changed.push(measured);
    }
    if (changed.length === 0) return;
    if (settledEstimate.current === null) {
      settledEstimate.current = changed.reduce((sum, value) => sum + value, 0) / changed.length;
    }
    // Lines the host has dropped give their heights back.
    if (known.size > 2 * latestLines.current.length + OVERSCAN) {
      const kept = new Map<LogLine['key'], number>();

      for (const line of latestLines.current) {
        const value = known.get(line.key);

        if (value !== undefined) kept.set(line.key, value);
      }
      heights.current = kept;
    }
    setMeasures(measures + 1);
  }, [lines, drawnRuns, view.width, ansi, measures]);

  // At the foot, the newest line in view, after the lines are measured;
  // elsewhere, the anchor line back at the top of the view by the heights
  // this render drew, unless the reader scrolled since the last read.
  // After every commit, as what any render draws can move the view; it
  // sets the view only when the scroll moved, so it settles in one pass.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const element = well.current;

    if (element === null || unlaid.current) return;
    // A well with no box (hidden before its size was heard) has no scroll
    // of its reader's to read: it is out of layout until its size comes.
    if (element.clientWidth === 0 && element.clientHeight === 0) {
      unlaid.current = true;
      return;
    }
    // A scroll that moved since the last read is the reader's, unless the
    // browser clamped it to a log grown shorter (lines dropped before it, a
    // new width). It is kept, and following it leaves the foot, unless it
    // stays within the slack of the foot the well last stood at.
    const end = Math.max(0, element.scrollHeight - element.clientHeight);
    const clamped = lastTop.current > end + 0.5 && Math.abs(element.scrollTop - end) < 0.5;
    const moved = !clamped && Math.abs(element.scrollTop - lastTop.current) >= 0.5;

    if (moved && !(following && lastTop.current - element.scrollTop <= FOOT_SLACK)) {
      anchor.current = anchorAt(element.scrollTop);
      lastTop.current = element.scrollTop;
      if (following) setAtFoot(false);
      setView((before) =>
        before.top === element.scrollTop ? before : { ...before, top: element.scrollTop }
      );
      return;
    }
    if (following) {
      anchor.current = null;
      element.scrollTop = element.scrollHeight;
      lastTop.current = element.scrollTop;
      return;
    }
    const held = anchor.current;
    const index = held === null ? undefined : indexOf.get(held.key);

    // A line the host dropped leaves the scroll where it is.
    if (held === null || index === undefined) return;
    const top = tops[index] ?? 0;
    const target = top + Math.min(held.within, Math.max(0, (tops[index + 1] ?? top) - top));

    if (Math.abs(element.scrollTop - target) < 0.5) return;
    element.scrollTop = target;
    lastTop.current = element.scrollTop;
    setView((before) =>
      before.top === element.scrollTop ? before : { ...before, top: element.scrollTop }
    );
  });

  // The well's size: a new width wraps lines anew, so what was measured
  // at the old one no longer holds.
  useLayoutEffect(() => {
    const element = well.current;

    if (element === null) return undefined;
    const read = (): void => {
      const width = element.clientWidth;

      // A well held out of layout (a hidden tab, a closed dock) keeps what
      // it measured and where its reader was, for when it shows again; a
      // scroll a hidden well lost is no reader's, so the anchor comes back.
      if (width === 0 && element.clientHeight === 0) {
        unlaid.current = true;
        return;
      }
      // Shown again, the well draws once more though its size is the
      // same: what it drew while hidden is measured and its scroll kept.
      const shown = unlaid.current;

      if (shown) {
        unlaid.current = false;
        lastTop.current = element.scrollTop;
      }
      const rewrapped = width > 0 && laidWidth.current > 0 && width !== laidWidth.current;

      if (rewrapped) {
        heights.current = new Map();
        settledEstimate.current = null;
      }
      if (shown || rewrapped) setMeasures((count) => count + 1);
      if (width > 0) laidWidth.current = width;
      setView((before) => {
        const next = { top: element.scrollTop, height: element.clientHeight, width };

        return before.top === next.top &&
          before.height === next.height &&
          before.width === next.width
          ? before
          : next;
      });
    };

    read();
    // Optional: jsdom has no ResizeObserver.
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(read);

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // A selection over the well, so every line it covers stays drawn and a
  // copy takes them all: dragged past the view or past the well, a select-
  // all of the well, or a page-wide one around it. An empty selection, or
  // one elsewhere, lets go. A copy reads it again and draws the lines at
  // once, before the browser takes the selection's text.
  useEffect(() => {
    const element = well.current;

    if (element === null) return undefined;
    const document = element.ownerDocument;
    const read = (): void => {
      const selection = document.getSelection();
      const range =
        selection === null || selection.isCollapsed || selection.rangeCount === 0
          ? null
          : selection.getRangeAt(0);

      if (range === null || !range.intersectsNode(element)) {
        pinEnd.current = null;
        setSelected(null);
        return;
      }
      const lines = latestLines.current;
      const first = element.contains(range.startContainer)
        ? lineIn(element, range.startContainer, range.startOffset, 'start')
        : 0;
      const last = element.contains(range.endContainer)
        ? lineIn(element, range.endContainer, range.endOffset, 'end')
        : lines.length - 1;
      const startLine = first === null ? undefined : lines[first];
      const endLine = last === null ? undefined : lines[last];

      if (startLine === undefined || endLine === undefined) {
        pinEnd.current = null;
        setSelected(null);
        return;
      }
      const next: SelectedLines = {
        start: element.contains(range.startContainer) ? startLine.key : HEAD,
        end: element.contains(range.endContainer) ? endLine.key : FOOT
      };

      pinEnd.current =
        element.contains(range.endContainer) &&
        elementOf(range.endContainer)?.closest('.log-line') === null
          ? {
              key: endLine.key,
              backward:
                selection?.anchorNode === range.endContainer &&
                selection.anchorOffset === range.endOffset
            }
          : null;

      setSelected((before) =>
        before?.start === next.start && before.end === next.end ? before : next
      );
    };
    const copy = (): void => flushSync(read);

    document.addEventListener('selectionchange', read);
    document.addEventListener('copy', copy, true);
    return () => {
      document.removeEventListener('selectionchange', read);
      document.removeEventListener('copy', copy, true);
    };
  }, []);

  // A selection end left in room now drawn: moved to the end of its line,
  // in the commit that draws it, so a copy takes every line it covered.
  // After every commit: the lines may come with any render.
  useLayoutEffect(() => {
    const pin = pinEnd.current;
    const element = well.current;
    const index = pin === null ? undefined : indexOf.get(pin.key);

    if (pin === null || element === null || index === undefined) return;
    const row = element.querySelector(`:scope > .log-line[data-index="${index}"]`);
    const selection = element.ownerDocument.getSelection();

    if (row === null || selection === null || selection.rangeCount === 0) return;
    pinEnd.current = null;
    const range = selection.getRangeAt(0);
    const start = [range.startContainer, range.startOffset] as const;
    const end = [row, row.childNodes.length] as const;

    if (pin.backward) selection.setBaseAndExtent(...end, ...start);
    else selection.setBaseAndExtent(...start, ...end);
  });

  const drawn: ReactNode[] = [];
  let at = 0;

  for (const run of runs) {
    const gap = (tops[run.start] ?? 0) - (tops[at] ?? 0);

    if (gap > 0) {
      drawn.push(
        <div
          aria-hidden
          className="log-gap"
          data-from={at}
          data-to={run.start}
          key={`gap:${at}`}
          style={{ height: gap }}
        />
      );
    }
    for (let index = run.start; index < run.end; index += 1) {
      const line = lines[index];

      if (line === undefined) continue;
      const source = line.source ?? null;

      drawn.push(
        <LogRow
          ansi={ansi}
          colour={source === null ? undefined : indexes.get(source)}
          index={index}
          key={lineKey(line.key)}
          line={line}
          sourced={width > 0}
        />
      );
    }
    at = run.end;
  }
  // The room after the last run, always there, even empty, under one key:
  // lines a selection draws go in before it, so a selection that ends after
  // the well's last child takes them in rather than ending before them.
  drawn.push(
    <div
      aria-hidden
      className="log-gap"
      data-from={at}
      data-to={lines.length}
      key="gap:end"
      style={{ height: Math.max(0, total - (tops[at] ?? 0)) }}
    />
  );

  return (
    <>
      <div
        aria-label={label}
        // The lines drawn come and go as the reader scrolls; the hidden
        // region after the well is the one that speaks new lines.
        aria-live="off"
        className="log-well selectable"
        onScroll={(event) => {
          const element = event.currentTarget;
          const foot =
            element.scrollHeight - element.scrollTop - element.clientHeight <= FOOT_SLACK;

          anchor.current = follow && foot ? null : anchorAt(element.scrollTop);
          lastTop.current = element.scrollTop;
          setAtFoot(foot);
          setView((before) =>
            before.top === element.scrollTop ? before : { ...before, top: element.scrollTop }
          );
        }}
        ref={well}
        role="log"
        style={{ '--log-source-width': `${width}ch` } as CSSProperties}
        tabIndex={0}
      >
        {lines.length === 0 && empty !== undefined ? <p className="log-empty">{empty}</p> : null}
        {drawn}
      </div>
      <VisuallyHidden aria-live="polite" aria-relevant="additions text" className="log-live">
        {lines.slice(-LIVE_TAIL).map((line) => (
          <span key={lineKey(line.key)}>{`${spokenLine(line, ansi)} `}</span>
        ))}
      </VisuallyHidden>
    </>
  );
}
