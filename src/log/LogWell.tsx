import {
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
 * The newest lines, always drawn wherever the reader is, so the `log`
 * region still hears each new line as it comes.
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

/**
 * The index of the line a selection's end sits in, in `well`: its line,
 * or, in the room standing for undrawn lines, the line at that room's
 * edge away from `from` (the selection's other end), so the selection
 * covers the whole room. A start in that room (`from` of -1) has no line.
 */
const lineIn = (well: Element, node: Node, offset: number, from: number): number | null => {
  // An end between the well's children names the child after it.
  const at =
    node === well ? (well.childNodes[Math.min(offset, well.childNodes.length - 1)] ?? null) : node;
  const box = elementOf(at);
  const row = box?.closest<HTMLElement>('.log-line, .log-gap');

  if (row === null || row === undefined || !well.contains(row)) return null;
  if (row.classList.contains('log-line')) return Number(row.dataset.index);
  if (from < 0) return null;
  const start = Number(row.dataset.from);
  const end = Number(row.dataset.to) - 1;

  return start > from ? end : start;
};

/** The run of lines a selection covers (`LogWell`'s), empty with none. */
const selectedRun = (
  lines: readonly LogLine[],
  selected: {
    readonly anchor: LogLine['key'];
    readonly focus: LogLine['key'] | 'head' | 'foot';
  } | null
): LineRun => {
  if (selected === null) return { start: 0, end: 0 };
  const anchor = lines.findIndex((line) => line.key === selected.anchor);

  if (anchor < 0) return { start: 0, end: 0 };
  const found =
    selected.focus === 'head'
      ? 0
      : selected.focus === 'foot'
        ? lines.length - 1
        : lines.findIndex((line) => line.key === selected.focus);
  const focus = found < 0 ? anchor : found;

  return { start: Math.min(anchor, focus), end: Math.max(anchor, focus) + 1 };
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
 * measured at this width, and the line at the top of the view stays put
 * as lines above it are measured. Two more runs stay drawn: the newest
 * lines, so the region hears each new one wherever the reader is, and,
 * while a selection starts in the well, every line it covers (to the
 * log's first or last line when it runs past the well), so a copy takes
 * every line it covers.
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
  // A selection in the well: the line it starts on and where it ends (a
  // line, or past the well's head or foot), every line between kept drawn.
  const [selected, setSelected] = useState<{
    readonly anchor: LogLine['key'];
    readonly focus: LogLine['key'] | 'head' | 'foot';
  } | null>(null);
  // Each line's measured height by key, and the height a line not yet
  // measured counts as: set by the first lines measured at this width and
  // kept, so lines measured later never move the ones around them.
  const heights = useRef(new Map<LogLine['key'], number>());
  const settledEstimate = useRef<number | null>(null);
  // Raised each time a measure changes the heights.
  const [measures, setMeasures] = useState(0);
  // A scroll to make once the heights a measure changed are drawn, so the
  // line at the top of the view stays put as lines above it are measured.
  const pendingShift = useRef<{ readonly by: number; readonly at: number } | null>(null);
  const latestLines = useRef(lines);

  latestLines.current = lines;

  const names = useMemo(() => lines.map((line) => line.source), [lines]);
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
  const runs = joinedRuns(
    [shown, { start: lines.length - LIVE_TAIL, end: lines.length }, selectedRun(lines, selected)],
    lines.length
  );

  // The runs drawn, as a value, so measuring waits for what it draws to change.
  const drawnRuns = runs.map((run) => `${run.start}-${run.end}`).join();

  // The drawn lines' heights, after each render that changes what is
  // drawn: a change draws again with the room each line takes, and, away
  // from the foot, scrolls by what the lines above the view gained, so
  // the line at its top stays put.
  useLayoutEffect(() => {
    const element = well.current;

    if (element === null) return;
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
    if (known.size > 2 * latestLines.current.length + LIVE_TAIL) {
      const kept = new Map<LogLine['key'], number>();

      for (const line of latestLines.current) {
        const value = known.get(line.key);

        if (value !== undefined) kept.set(line.key, value);
      }
      heights.current = kept;
    }
    if (!following) {
      const top = element.scrollTop;
      const first = lineAt(tops, top);
      const now = settledEstimate.current;
      let moved = 0;

      for (let index = 0; index < first; index += 1) {
        const line = latestLines.current[index];

        moved += (line === undefined ? undefined : heights.current.get(line.key)) ?? now;
      }
      const by = moved - (tops[first] ?? 0);

      if (Math.abs(by) >= 0.5) {
        pendingShift.current = { by, at: measures + 1 };
        setView((before) => ({ ...before, top: before.top + by }));
      }
    }
    setMeasures(measures + 1);
  }, [lines, drawnRuns, view.width, ansi, following, measures, tops]);

  // At the foot, the newest line in view, after the lines are measured;
  // elsewhere, the scroll a measure asked for, once its heights are drawn.
  useLayoutEffect(() => {
    const element = well.current;

    if (element === null) return;
    if (following) {
      pendingShift.current = null;
      element.scrollTop = element.scrollHeight;
      return;
    }
    const shift = pendingShift.current;

    if (shift !== null && shift.at === measures) {
      pendingShift.current = null;
      element.scrollTop += shift.by;
    }
  });

  // The well's size: a new width wraps lines anew, so what was measured
  // at the old one no longer holds.
  useLayoutEffect(() => {
    const element = well.current;

    if (element === null) return undefined;
    const read = (): void => {
      setView((before) => {
        const next = {
          top: element.scrollTop,
          height: element.clientHeight,
          width: element.clientWidth
        };

        if (before.width !== next.width && before.width > 0) {
          heights.current = new Map();
          settledEstimate.current = null;
        }
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

  // A selection that starts in the well, so every line it covers stays
  // drawn and a copy takes them all, as a dragged selection runs past the
  // view or past the well; an empty selection, or one elsewhere, lets go.
  useEffect(() => {
    const element = well.current;

    if (element === null) return undefined;
    const document = element.ownerDocument;
    const read = (): void => {
      const selection = document.getSelection();
      const start = selection?.anchorNode ?? null;
      const end = selection?.focusNode ?? null;

      if (
        selection === null ||
        selection.isCollapsed ||
        start === null ||
        end === null ||
        !element.contains(start)
      ) {
        setSelected(null);
        return;
      }
      const lines = latestLines.current;
      const anchorIndex = lineIn(element, start, selection.anchorOffset, -1);

      // A start in the room between lines keeps the line it had.
      if (anchorIndex === null) return;
      const anchor = lines[anchorIndex];

      if (anchor === undefined) return;
      const focusIndex = element.contains(end)
        ? lineIn(element, end, selection.focusOffset, anchorIndex)
        : null;
      const focus =
        focusIndex !== null
          ? (lines[focusIndex]?.key ?? anchor.key)
          : element.compareDocumentPosition(end) & Node.DOCUMENT_POSITION_FOLLOWING
            ? 'foot'
            : 'head';

      setSelected((before) =>
        before?.anchor === anchor.key && before.focus === focus
          ? before
          : { anchor: anchor.key, focus }
      );
    };

    document.addEventListener('selectionchange', read);
    return () => document.removeEventListener('selectionchange', read);
  }, []);

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
  const after = total - (tops[at] ?? 0);

  if (after > 0) {
    drawn.push(
      <div
        aria-hidden
        className="log-gap"
        data-from={at}
        data-to={lines.length}
        key={`gap:${at}`}
        style={{ height: after }}
      />
    );
  }

  return (
    <div
      aria-label={label}
      className="log-well selectable"
      onScroll={(event) => {
        const element = event.currentTarget;

        setAtFoot(element.scrollHeight - element.scrollTop - element.clientHeight <= FOOT_SLACK);
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
  );
}
