import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type WheelEvent
} from 'react';

import { tooltip } from '../tooltip/Tooltip.logic.js';
import { useLabels } from '../labels/UiokProvider.js';

import { encodingLabel } from './TextEncoding.logic.js';
import { endQuietFocus, focusQuietly } from './QuietFocus.js';
import ScaledScrollbar from './ScaledScrollbar.js';
import { highlightPlan, type HighlightPlan } from './SyntaxLanguage.logic.js';
import type { SyntaxStyle, SyntaxToken } from './SyntaxSession.logic.js';
import {
  isCollapsed,
  rowParts,
  selectedSpan,
  wordAt,
  type TextPoint,
  type TextSelection
} from './TextSelection.logic.js';
import { screenRows as clampScreenRows, type ViewTarget } from './TextViewport.logic.js';
import { useElementHeight } from './useElementHeight.js';
import { useEscapeToClear } from './useEscapeToClear.js';
import { useSyntaxHighlight } from './useSyntaxHighlight.js';
import { useTextDocument, type ScreenRow, type TextScreen } from './useTextDocument.js';
import { deliverCopy, useCopyTickets } from './ViewerClipboard.js';
import { isViewerEventTarget } from './ViewerScope.js';
import type { ViewerViewProps } from './ViewerViews.js';

/** One row's height in pixels; the stylesheet's row height and line height match it. */
const ROW_PX = 18;

/** Rows before the layout is measured (or where it never is). */
const FALLBACK_ROWS = 40;

/** How often a drag held past the top or bottom edge scrolls one row. */
const DRAG_SCROLL_MS = 50;

/** No highlighting until the first line is read: a script's `#!` line can still name a language. */
const NOT_YET: HighlightPlan = { kind: 'none' };

/** A token style as the page draws it. */
const cssFor = ({ color, italic, bold, strikethrough }: SyntaxStyle): CSSProperties => ({
  color: color ?? undefined,
  fontStyle: italic ? 'italic' : undefined,
  fontWeight: bold ? 'bold' : undefined,
  textDecoration: strikethrough ? 'line-through' : undefined
});

/**
 * Where a landed move puts the screen: its top row from the start, from its
 * end (a step up into a tall wrapped row), or with the point `offsetPx` into
 * the row starting at byte `row` at `atY` pixels from the top of the box (a
 * wrapped page, which moves by the visual lines in view).
 */
type Landing =
  'start' | 'end' | { readonly row: number; readonly offsetPx: number; readonly atY: number };

/** One row: the gutter, then the text in its token styles with the selected part marked. */
function Row({
  row,
  gutter,
  selection,
  tokens,
  styles
}: {
  readonly row: ScreenRow;
  readonly gutter: string;
  readonly selection: TextSelection | null;
  readonly tokens: readonly SyntaxToken[] | null;
  readonly styles: readonly CSSProperties[];
}): ReactElement {
  const span = selection ? selectedSpan(selection, row.start, row.text.length) : null;

  return (
    <div className="text-row" data-kind={row.kind} data-row={row.start}>
      <span aria-hidden="true" className="text-gutter">
        {gutter}
      </span>
      <span className="text-content">
        {rowParts(row.text.length, tokens, span).map((part) => (
          <span
            className={part.selected ? 'text-selected' : undefined}
            data-char={part.from}
            key={part.from}
            style={part.style === null ? undefined : styles[part.style]}
          >
            {row.text.slice(part.from, part.to)}
          </span>
        ))}
      </span>
    </div>
  );
}

/**
 * The text view: the file's text a screen at a time, scrolled by byte
 * position like `less`, with a scaled scrollbar whose thumb maps to a byte,
 * line numbers once the background index reaches the screen (byte offsets
 * until then), a wrap toggle, a selection kept in file terms so it survives
 * scrolling and copies in one bounded read, and syntax highlighting for a
 * file in a known language, tokenized a screen at a time in a worker. A
 * highlighted row selects, copies, wraps, and splits exactly as a plain one.
 */
function TextView({ reader, info }: Pick<ViewerViewProps, 'reader' | 'info'>): ReactElement {
  const labels = useLabels().viewer;
  const takeCopyTicket = useCopyTickets();
  const [wrap, setWrap] = useState(false);
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const clearSelection = useCallback(() => setSelection(null), []);
  useEscapeToClear(selection !== null, clearSelection);
  const [rowsRef, rowsHeight] = useElementHeight();
  // Rows drawn include one the bottom edge may cut; the end of the file and
  // a page count only the rows that fit whole.
  const screenRows = clampScreenRows(
    rowsHeight === null ? FALLBACK_ROWS : Math.ceil(rowsHeight / ROW_PX)
  );
  const fullRows = clampScreenRows(
    rowsHeight === null ? FALLBACK_ROWS : Math.floor(rowsHeight / ROW_PX)
  );
  const view = useMemo(() => ({ screenRows, fullRows, wrap }), [screenRows, fullRows, wrap]);
  const textDocument = useTextDocument(reader, info, view);
  const { layout, firstLine, screen, go, scroll: scrollRows } = textDocument;
  const plan = useMemo(
    () =>
      firstLine === null
        ? NOT_YET
        : highlightPlan(info.name, info.sizeBytes, firstLine, info.content.kind),
    [firstLine, info.name, info.sizeBytes, info.content.kind]
  );
  const syntax = useSyntaxHighlight(plan, info.generation, layout, screen);
  const tokenStyles = useMemo(() => syntax.styles.map(cssFor), [syntax.styles]);

  const rowsElement = useRef<HTMLDivElement | null>(null);
  const wheelRemainder = useRef(0);
  const drag = useRef<{ y: number; timer: ReturnType<typeof setInterval> | null } | null>(null);
  const shown = useRef<readonly ScreenRow[]>([]);

  const contentStart = layout?.contentStart ?? 0;
  const top = screen?.top.start ?? contentStart;
  const end = screen?.end ?? info.sizeBytes;

  const page = Math.max(1, fullRows - 1);

  // A wrapped row can be taller than the box. The box scrolls within the
  // top row until its end shows before the view moves on a row. A new top
  // row shows from its start, or from its end when a step up brought it in,
  // so stepping either way passes every part of it. A move longer than a
  // page lands only on the screen where it ends.
  const landing = useRef<Landing>('start');
  // Wrapped pages pressed while one is still landing, signed by direction;
  // each goes on from where the one before it lands.
  const queuedPages = useRef(0);
  // The screen a wrapped page left from. The page is still landing while
  // that screen shows and no read has failed; a new screen that kept the
  // same top row (the file shrank) ends it as surely as one that moved.
  const pagedFrom = useRef<TextScreen | null>(null);
  const pageLanding = (): boolean =>
    typeof landing.current === 'object' &&
    pagedFrom.current === screen &&
    textDocument.failure === null;
  const settled = screen?.settled ?? true;
  // The landing below runs only when the top row or settling changes, and
  // reads the screen it lands on from here; this runs first.
  const landingScreen = useRef(screen);
  useLayoutEffect(() => {
    landingScreen.current = screen;
  });
  useLayoutEffect(() => {
    const box = rowsElement.current;
    if (box === null) return;

    const rowElements = [...box.querySelectorAll<HTMLElement>('.text-row')];
    const first = rowElements[0];
    const land = landing.current;

    if (!settled || land === 'start' || first === undefined) {
      box.scrollTop = 0;
      if (settled) landing.current = 'start';
      return;
    }

    landing.current = 'start';
    if (land === 'end') {
      box.scrollTop = Math.max(0, first.offsetHeight - box.clientHeight);
      return;
    }

    // The scroll position must lie within the top row: past it, the row
    // that holds it becomes the top row, landing on the same point.
    const target = rowElements.find((element) => element.dataset['row'] === String(land.row));
    const y = (target?.offsetTop ?? 0) + land.offsetPx - land.atY;
    const holder = rowElements.find((element) => element.offsetTop + element.offsetHeight > y);

    if (target === undefined || y <= 0 || holder === undefined) {
      box.scrollTop = 0;
    } else if (holder === first) {
      box.scrollTop = y;
    } else {
      landing.current = {
        row: Number(holder.dataset['row']),
        offsetPx: y - holder.offsetTop,
        atY: 0
      };
      pagedFrom.current = landingScreen.current;
      go({ anchor: Number(holder.dataset['row']), rows: 0 });
    }
  }, [go, screen?.top.start, settled, wrap]);

  /** Scrolls `deltaPx` within a wrapped top row taller than the box; false when there is none left that way. */
  const scrollWithinRow = (deltaPx: number): boolean => {
    const box = rowsElement.current;
    if (!wrap || box === null || deltaPx === 0) return false;

    if (deltaPx < 0) {
      if (box.scrollTop <= 0) return false;
      box.scrollTop = Math.max(0, box.scrollTop + deltaPx);
      return true;
    }

    const first = box.querySelector<HTMLElement>('.text-row');
    const hidden = (first?.offsetHeight ?? 0) - box.clientHeight - box.scrollTop;
    if (hidden <= 0) return false;

    box.scrollTop += Math.min(hidden, deltaPx);
    return true;
  };

  /** Moves `rows` rows; a top row a move up brings in shows from its end. */
  const moveRows = (rows: number): void => {
    queuedPages.current = 0;
    landing.current = wrap && rows < 0 ? 'end' : 'start';
    scrollRows(rows);
  };

  /** Moves a row, or a line within a tall wrapped top row first. */
  const step = (rows: number): void => {
    if (!scrollWithinRow(rows * ROW_PX)) moveRows(rows);
  };

  /**
   * Moves a screen less one line. Unwrapped, that is a page of rows; wrapped,
   * a row can hold many lines, so the view moves by the lines in view
   * instead: the line a screen less one below the top comes to the top, or
   * the line at the top goes to the bottom. A wrapped page measures the
   * screen it starts from, so one pressed while another is still landing
   * waits for it.
   */
  const pageBy = (direction: 1 | -1): void => {
    const box = rowsElement.current;
    if (!wrap || box === null || screen === null) {
      moveRows(direction * page);
      return;
    }
    if (pageLanding()) {
      queuedPages.current += direction;
      return;
    }
    if (typeof landing.current === 'object') {
      // The page that was landing never will (its read failed, or the
      // screen came back without moving): this one starts afresh.
      landing.current = 'start';
      queuedPages.current = 0;
    }

    const distance = Math.max(ROW_PX, box.clientHeight - ROW_PX);
    const rowElements = [...box.querySelectorAll<HTMLElement>('.text-row')];

    if (direction > 0) {
      const y = box.scrollTop + distance;
      const holder = rowElements.find((element) => element.offsetTop + element.offsetHeight > y);
      // Nothing below the screen: the end of the file is in view.
      if (holder === undefined) return;

      if (holder === rowElements[0]) {
        box.scrollTop = y;
        return;
      }
      landing.current = {
        row: Number(holder.dataset['row']),
        offsetPx: y - holder.offsetTop,
        atY: 0
      };
      pagedFrom.current = screen;
      go({ anchor: Number(holder.dataset['row']), rows: 0 });
      return;
    }

    if (box.scrollTop >= distance || screen.top.start <= contentStart) {
      box.scrollTop = Math.max(0, box.scrollTop - distance);
      return;
    }
    // Bring in a page of rows above, each a line at least, then put the
    // line at the top now at the bottom.
    landing.current = { row: screen.top.start, offsetPx: box.scrollTop, atY: distance };
    pagedFrom.current = screen;
    go({ anchor: screen.top.start, rows: -page });
  };

  // Once a wrapped page has landed, the pages pressed meanwhile follow it.
  useLayoutEffect(() => {
    while (queuedPages.current !== 0 && !pageLanding() && settled) {
      const direction = queuedPages.current > 0 ? 1 : -1;
      queuedPages.current -= direction;
      pageBy(direction);
    }
  });

  /** Goes to `target` and shows its top row from the start, even when that row is already on top. */
  const jump = useCallback(
    (target: ViewTarget): void => {
      queuedPages.current = 0;
      landing.current = 'start';
      if (rowsElement.current) rowsElement.current.scrollTop = 0;
      go(target);
    },
    [go]
  );

  // Pointer handlers outlive a render (a drag scrolls on a timer), so they
  // read the rows on screen, the wrap mode, and the scroll step through refs.
  const stepRef = useRef(step);
  const wrapRef = useRef(wrap);
  useLayoutEffect(() => {
    shown.current = screen?.rows ?? [];
    stepRef.current = step;
    wrapRef.current = wrap;
  });

  const toStart = useCallback(() => jump({ anchor: contentStart, rows: 0 }), [contentStart, jump]);
  const toEnd = useCallback(() => jump({ anchor: end, rows: -page }), [jump, end, page]);

  // Copy answers the Edit menu, whose Copy item copies natively in the page.
  useEffect(() => {
    const onCopy = (event: ClipboardEvent): void => {
      if (selection === null || isCollapsed(selection)) return;
      if (!isViewerEventTarget(event.target)) return;

      event.preventDefault();
      deliverCopy(
        textDocument.copy(selection),
        event.clipboardData,
        setMessage,
        labels,
        takeCopyTicket()
      );
    };

    window.addEventListener('copy', onCopy);
    return () => window.removeEventListener('copy', onCopy);
  }, [textDocument, selection, labels, takeCopyTicket]);

  const selectAll = useCallback(() => {
    setSelection({
      anchor: { row: contentStart, kind: 'line', char: 0 },
      focus: { row: end, kind: 'line', char: 0 }
    });
    setMessage(null);
  }, [contentStart, end]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const command = event.metaKey && !event.ctrlKey && !event.altKey;
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
    let handled = true;

    if (command && event.key === 'a') selectAll();
    else if (command && event.key === 'ArrowUp') toStart();
    else if (command && event.key === 'ArrowDown') toEnd();
    else if (!plain) handled = false;
    else if (event.key === 'ArrowDown') step(1);
    else if (event.key === 'ArrowUp') step(-1);
    else if (event.key === 'PageDown') pageBy(1);
    else if (event.key === 'PageUp') pageBy(-1);
    else if (event.key === 'Home') toStart();
    else if (event.key === 'End') toEnd();
    else handled = false;

    if (handled) event.preventDefault();
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>): void => {
    const unit = event.deltaMode === 1 ? ROW_PX : event.deltaMode === 2 ? page * ROW_PX : 1;
    if (scrollWithinRow(event.deltaY * unit)) return;

    wheelRemainder.current += event.deltaY * unit;
    const rows = Math.trunc(wheelRemainder.current / ROW_PX);

    wheelRemainder.current -= rows * ROW_PX;
    if (rows !== 0) moveRows(rows);
  };

  /**
   * The text point under a pointer. A pointer outside the rows box points at
   * the text along the nearest edge, so a drag never selects rows the box
   * hides (a wrapped row runs past the bottom); past the left edge that is
   * the start of the line under it (the start of the row, unless the row
   * wraps), past the right its end.
   */
  const pointAt = useCallback((pointerX: number, pointerY: number): TextPoint | null => {
    const box = rowsElement.current;
    const rows = shown.current;
    const last = rows.at(-1);
    if (box === null || last === undefined) return null;

    const bounds = box.getBoundingClientRect();
    let clientX = Math.max(bounds.left, Math.min(pointerX, bounds.right - 1));
    const clientY = Math.max(bounds.top, Math.min(pointerY, bounds.bottom - 1));
    let caret = document.caretPositionFromPoint?.(clientX, clientY) ?? null;
    let node = caret?.offsetNode ?? null;
    let element = node instanceof Element ? node : (node?.parentElement ?? null);
    const rowElement =
      element?.closest<HTMLElement>('.text-row') ??
      document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('.text-row') ??
      null;
    const row = rows.find((candidate) => String(candidate.start) === rowElement?.dataset['row']);

    if (row === undefined) return { row: last.start, kind: last.kind, char: last.text.length };

    // Left of a wrapped row's text, the point is the start of the line the
    // pointer is level with, found on the text's left edge.
    const textLeft = Math.max(
      rowElement?.querySelector('.text-content')?.getBoundingClientRect().left ?? clientX,
      rowElement?.querySelector('.text-gutter')?.getBoundingClientRect().right ?? clientX
    );
    if (wrapRef.current && clientX < textLeft) {
      clientX = Math.ceil(textLeft);
      caret = document.caretPositionFromPoint?.(clientX, clientY) ?? null;
      node = caret?.offsetNode ?? null;
      element = node instanceof Element ? node : (node?.parentElement ?? null);
    }

    const part = element?.closest<HTMLElement>('[data-char]');
    if (
      caret !== null &&
      part !== null &&
      part !== undefined &&
      node?.nodeType === Node.TEXT_NODE
    ) {
      return { row: row.start, kind: row.kind, char: Number(part.dataset['char']) + caret.offset };
    }

    const content = rowElement?.querySelector('.text-content')?.getBoundingClientRect();
    const before = content === undefined || clientX < content.left;

    return { row: row.start, kind: row.kind, char: before ? 0 : row.text.length };
  }, []);

  // The window opens on its text, so the keys scroll it without a click first.
  // That focus is the window's own, so it draws no ring (QuietFocus.ts).
  useEffect(() => {
    focusQuietly(rowsElement.current);
  }, []);

  const endDrag = useCallback(() => {
    if (drag.current?.timer) clearInterval(drag.current.timer);
    drag.current = null;
  }, []);

  useEffect(() => endDrag, [endDrag]);

  const onMouseDown = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (event.button !== 0) return;

    // The page's own selection would cover only the rows in the DOM, so the
    // view keeps its own and the native one never starts.
    event.preventDefault();
    rowsElement.current?.focus();
    const point = pointAt(event.clientX, event.clientY);
    if (point === null) return;

    setMessage(null);

    // A double click selects the word under the pointer, within its row.
    if (event.detail === 2) {
      const text = shown.current.find((row) => row.start === point.row)?.text ?? '';
      const word = wordAt(text, point.char);
      setSelection({
        anchor: { ...point, char: word.from },
        focus: { ...point, char: word.to }
      });
      return;
    }

    setSelection((current) =>
      event.shiftKey && current !== null
        ? { anchor: current.anchor, focus: point }
        : { anchor: point, focus: point }
    );

    const box = rowsElement.current?.getBoundingClientRect();
    const state = {
      x: event.clientX,
      y: event.clientY,
      timer: null as ReturnType<typeof setInterval> | null
    };
    drag.current = state;

    const extend = (clientX: number, clientY: number): void => {
      const focus = pointAt(clientX, clientY);
      if (focus) setSelection((current) => (current ? { anchor: current.anchor, focus } : null));
    };
    const onMove = (move: MouseEvent): void => {
      state.x = move.clientX;
      state.y = move.clientY;
      extend(move.clientX, move.clientY);

      const outside = box !== undefined && (move.clientY < box.top || move.clientY >= box.bottom);
      if (outside && state.timer === null) {
        state.timer = setInterval(() => {
          const above = box !== undefined && state.y < box.top;
          stepRef.current(above ? -1 : 1);
          extend(state.x, state.y);
        }, DRAG_SCROLL_MS);
      } else if (!outside && state.timer !== null) {
        clearInterval(state.timer);
        state.timer = null;
      }
    };
    const onUp = (): void => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      endDrag();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const rows = screen?.rows ?? [];
  const visibleBytes = rows.length > 0 ? (rows.at(-1)?.end ?? top) - top : 0;

  if (textDocument.failure !== null && screen === null) {
    return (
      <p className="viewer-failure" role="alert">
        {textDocument.failure}
      </p>
    );
  }

  // Wide enough for the largest byte offset as the gutter prints it, separators included.
  const gutterDigits = labels.number(Math.max(1, info.sizeBytes)).length;
  const position =
    screen === null
      ? ''
      : screen.topLine !== null
        ? labels.text.line(screen.topLine)
        : labels.text.counting(top);

  return (
    <div className="text-view">
      <div className="text-view-body viewer-rows-frame">
        <div
          aria-label={labels.text.rows(info.name)}
          aria-readonly="true"
          onBlur={endQuietFocus}
          className={wrap ? 'text-rows text-rows-wrap' : 'text-rows scroll-fade-x'}
          onKeyDown={onKeyDown}
          onMouseDown={onMouseDown}
          onWheel={onWheel}
          ref={(element) => {
            rowsElement.current = element;
            rowsRef(element);
          }}
          role="textbox"
          style={{ ['--text-gutter-width' as string]: `${gutterDigits + 1}ch` }}
          tabIndex={0}
        >
          {textDocument.empty ? <p className="text-empty">{labels.empty}</p> : null}
          {rows.map((row) => (
            <Row
              styles={tokenStyles}
              tokens={syntax.tokensFor(row.start)}
              gutter={
                screen?.topLine !== null
                  ? row.line === null
                    ? ''
                    : labels.number(row.line)
                  : labels.number(row.start)
              }
              key={row.start}
              row={row}
              selection={selection}
            />
          ))}
        </div>
        <ScaledScrollbar
          onDrag={(position) => jump({ anchor: contentStart + position, rows: 0 })}
          onPage={pageBy}
          position={top - contentStart}
          total={Math.max(0, end - contentStart)}
          visible={visibleBytes}
        />
      </div>
      <footer className="viewer-status text-status">
        <span className="text-position">{position}</span>
        <span aria-live="polite" className="text-message">
          {message ?? textDocument.failure ?? ''}
        </span>
        {syntax.status ? (
          <span className="text-syntax" {...tooltip(syntax.status)}>
            {syntax.status}
          </span>
        ) : null}
        {layout ? <span className="text-encoding">{encodingLabel(layout, labels)}</span> : null}
        <label className="text-wrap">
          <input
            checked={wrap}
            onChange={(event) => setWrap(event.target.checked)}
            type="checkbox"
          />
          {labels.text.wrap}
        </label>
      </footer>
    </div>
  );
}

export default TextView;
