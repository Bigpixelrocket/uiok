import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type WheelEvent
} from 'react';

import { Button } from '../button/Button.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import { useLabels } from '../labels/UiokProvider.js';
import { parseJumpOffset } from './HexJump.logic.js';
import {
  BYTES_PER_ROW,
  cellAt,
  COLUMN_GAP,
  formatOffset,
  hexColumn,
  lineChars,
  offsetDigits,
  textColumn,
  type HexColumn
} from './HexRows.logic.js';
import {
  extendSelection,
  selectedCells,
  selectedRange,
  SELECTION_STEPS,
  type HexSelection
} from './HexSelection.logic.js';
import { hexScrollRange, rowOfByte, type HexRow } from './HexViewport.logic.js';
import { endQuietFocus, focusQuietly } from './QuietFocus.js';
import ScaledScrollbar from './ScaledScrollbar.js';
import { screenRows as clampScreenRows } from './TextViewport.logic.js';
import { useElementHeight } from './useElementHeight.js';
import { useEscapeToClear } from './useEscapeToClear.js';
import { useHexDocument } from './useHexDocument.js';
import { deliverCopy, useCopyTickets } from './ViewerClipboard.js';
import { isViewerEvent } from './ViewerScope.js';
import type { ViewerViewProps } from './ViewerViews.js';

/** One row's height in pixels; the stylesheet's row height and line height match it. */
const ROW_PX = 18;

/** Rows before the layout is measured (or where it never is). */
const FALLBACK_ROWS = 40;

/** How often a drag held past the top or bottom edge scrolls one row. */
const DRAG_SCROLL_MS = 50;

/** A column's characters, split where the selection starts and ends so the selected part can be marked. */
function Cells({
  text,
  span,
  className,
  primary
}: {
  readonly text: string;
  readonly span: { readonly from: number; readonly to: number } | null;
  readonly className: string;
  readonly primary: boolean;
}): ReactElement {
  if (span === null) return <span className={className}>{text}</span>;

  return (
    <span className={className}>
      {text.slice(0, span.from)}
      <span className={primary ? 'hex-selected hex-selected-primary' : 'hex-selected'}>
        {text.slice(span.from, span.to)}
      </span>
      {text.slice(span.to)}
    </span>
  );
}

/** One row: offset, hex column, text column, with the selected bytes marked in both. */
function Row({
  row,
  digits,
  selection
}: {
  readonly row: HexRow;
  readonly digits: number;
  readonly selection: HexSelection | null;
}): ReactElement {
  const cells = selection ? selectedCells(selection, row.offset, row.bytes.length) : null;
  // A byte is two digits and the separator after it; the last selected byte's separator is not selected.
  const hexSpan = cells && { from: cells.from * 3, to: cells.to * 3 - 1 };

  return (
    <div className="hex-row" data-offset={row.offset}>
      <span className="hex-line">
        <span className="hex-offset">{formatOffset(row.offset, digits)}</span>
        {COLUMN_GAP}
        <Cells
          className="hex-bytes"
          primary={selection?.column === 'hex'}
          span={hexSpan}
          text={hexColumn(row.bytes)}
        />
        {COLUMN_GAP}
        <Cells
          className="hex-text"
          primary={selection?.column === 'text'}
          span={cells}
          text={textColumn(row.bytes)}
        />
      </span>
    </div>
  );
}

/**
 * The hex view: 16 bytes a row, as hex and as text, any row one bounded read
 * away. A scaled scrollbar maps the thumb to a byte; ⌘L jumps to an offset;
 * a byte range selected with the mouse (or Shift with the arrows) copies as
 * hex or as text, up to one bounded read.
 */
function HexView({ reader, info }: Pick<ViewerViewProps, 'reader' | 'info'>): ReactElement {
  const labels = useLabels().viewer;
  const takeCopyTicket = useCopyTickets();
  const [selection, setSelection] = useState<HexSelection | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const clearSelection = useCallback(() => setSelection(null), []);
  useEscapeToClear(selection !== null, clearSelection);
  const [jump, setJump] = useState<string | null>(null);
  const [rowsRef, rowsHeight] = useElementHeight();
  const screenRows = clampScreenRows(
    rowsHeight === null ? FALLBACK_ROWS : Math.ceil(rowsHeight / ROW_PX)
  );
  const fullRows = clampScreenRows(
    rowsHeight === null ? FALLBACK_ROWS : Math.floor(rowsHeight / ROW_PX)
  );
  const view = useMemo(() => ({ screenRows, fullRows }), [screenRows, fullRows]);
  const hexDocument = useHexDocument(reader, info, view);
  const { screen, go, scroll } = hexDocument;

  const rowsElement = useRef<HTMLDivElement | null>(null);
  const jumpField = useRef<HTMLInputElement | null>(null);
  const wheelRemainder = useRef(0);
  const drag = useRef<{ timer: ReturnType<typeof setInterval> | null } | null>(null);

  const digits = offsetDigits(info.sizeBytes);
  const top = screen?.top ?? 0;
  const end = screen?.end ?? info.sizeBytes;
  const page = Math.max(1, fullRows - 1);

  // Pointer handlers outlive a render (a drag scrolls on a timer), so they
  // read the screen through a ref.
  const shown = useRef(screen);
  useLayoutEffect(() => {
    shown.current = screen;
  });

  /**
   * Brings byte `offset` into view: scrolled the least, as a selection's
   * moving end follows the keys, or with its row on top, as a jump lands.
   */
  const reveal = useCallback(
    (offset: number, placement: 'nearest' | 'top'): void => {
      const row = rowOfByte(offset);
      if (row < top || (placement === 'top' && row >= top + fullRows)) go(row);
      else if (row >= top + fullRows) go(row - fullRows + 1);
    },
    [fullRows, go, top]
  );

  // Copy answers the Edit menu, whose Copy item copies natively in the page;
  // the jump field keeps its own copy.
  useEffect(() => {
    const onCopy = (event: ClipboardEvent): void => {
      // A copy the page makes itself (the jump field, a field beside the
      // viewer, nothing selected here) is the newest: a copy of ours still
      // reading must not land on the clipboard after it.
      if (
        selection === null ||
        document.activeElement === jumpField.current ||
        !isViewerEvent(event)
      ) {
        takeCopyTicket();
        return;
      }

      event.preventDefault();
      deliverCopy(
        hexDocument.copy(selection, selection.column),
        event.clipboardData,
        setMessage,
        labels,
        takeCopyTicket()
      );
    };

    window.addEventListener('copy', onCopy);
    return () => window.removeEventListener('copy', onCopy);
  }, [hexDocument, labels, selection, takeCopyTicket]);

  const copyAs = (column: HexColumn): void => {
    if (selection !== null)
      deliverCopy(hexDocument.copy(selection, column), null, setMessage, labels, takeCopyTicket());
  };

  const openJump = (): void => {
    setJump('');
    setMessage(null);
  };

  const closeJump = (): void => {
    setJump(null);
    rowsElement.current?.focus();
  };

  const submitJump = (): void => {
    const result = parseJumpOffset(jump ?? '', end, labels);

    if ('error' in result) {
      setMessage(result.error);
      return;
    }

    setSelection({ anchor: result.offset, focus: result.offset, column: 'hex' });
    setMessage(null);
    reveal(result.offset, 'top');
    closeJump();
  };

  const jumpOpen = jump !== null;
  useEffect(() => {
    if (jumpOpen) jumpField.current?.focus();
  }, [jumpOpen]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const command = event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
    const shift = event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey;
    const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
    const step = SELECTION_STEPS[event.key as keyof typeof SELECTION_STEPS];
    let handled = true;

    if (command && event.key === 'a') {
      if (end > 0) setSelection({ anchor: 0, focus: end - 1, column: 'hex' });
      setMessage(null);
    } else if (command && event.key === 'l') openJump();
    else if (command && event.key === 'ArrowUp') go(0);
    else if (command && event.key === 'ArrowDown') go(Infinity);
    else if (shift && step !== undefined) {
      const next = extendSelection(selection, step, top * BYTES_PER_ROW, end);
      setSelection(next);
      if (next) reveal(next.focus, 'nearest');
    } else if (!plain) handled = false;
    else if (event.key === 'ArrowDown') scroll(1);
    else if (event.key === 'ArrowUp') scroll(-1);
    else if (event.key === 'PageDown') scroll(page);
    else if (event.key === 'PageUp') scroll(-page);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(Infinity);
    else handled = false;

    if (handled) event.preventDefault();
  };

  const onWheel = (event: WheelEvent<HTMLDivElement>): void => {
    const unit = event.deltaMode === 1 ? ROW_PX : event.deltaMode === 2 ? page * ROW_PX : 1;

    wheelRemainder.current += event.deltaY * unit;
    const rows = Math.trunc(wheelRemainder.current / ROW_PX);

    wheelRemainder.current -= rows * ROW_PX;
    if (rows !== 0) scroll(rows);
  };

  /**
   * The byte under a pointer and the column it is in. A pointer outside the
   * rows points at the nearest row along that edge; within a row, the
   * character under it decides the byte (`cellAt`), from the row's
   * monospaced line.
   */
  const byteAt = useCallback(
    (clientX: number, clientY: number): { offset: number; column: HexColumn } | null => {
      const box = rowsElement.current;
      const rows = shown.current?.rows ?? [];
      if (box === null || rows.length === 0) return null;

      const bounds = box.getBoundingClientRect();
      const index = Math.max(
        0,
        Math.min(rows.length - 1, Math.floor((clientY - bounds.top) / ROW_PX))
      );
      const row = rows[index];
      const line = box.querySelectorAll<HTMLElement>('.hex-line')[index];
      if (row === undefined || line === undefined) return null;

      const lineBounds = line.getBoundingClientRect();
      const charPx = lineBounds.width / lineChars(digits);
      const char = charPx > 0 ? Math.floor((clientX - lineBounds.left) / charPx) : 0;
      const cell = cellAt(char, digits);

      return {
        offset: row.offset + Math.min(cell.index, row.bytes.length - 1),
        column: cell.column
      };
    },
    [digits]
  );

  // The window opens on its bytes, so the keys scroll them without a click first.
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
    const hit = byteAt(event.clientX, event.clientY);
    if (hit === null) return;

    setMessage(null);
    setSelection((current) =>
      event.shiftKey && current !== null
        ? { ...current, focus: hit.offset }
        : { anchor: hit.offset, focus: hit.offset, column: hit.column }
    );

    const box = rowsElement.current?.getBoundingClientRect();
    const state = {
      x: event.clientX,
      y: event.clientY,
      timer: null as ReturnType<typeof setInterval> | null
    };
    drag.current = state;

    const extend = (): void => {
      const focus = byteAt(state.x, state.y);
      if (focus) setSelection((current) => (current ? { ...current, focus: focus.offset } : null));
    };
    const onMove = (move: MouseEvent): void => {
      state.x = move.clientX;
      state.y = move.clientY;
      extend();

      const outside = box !== undefined && (move.clientY < box.top || move.clientY >= box.bottom);
      if (outside && state.timer === null) {
        state.timer = setInterval(() => {
          const above = box !== undefined && state.y < box.top;
          scroll(above ? -1 : 1);
          extend();
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

  if (hexDocument.failure !== null && screen === null) {
    return (
      <p className="viewer-failure" role="alert">
        {hexDocument.failure}
      </p>
    );
  }

  const rows = screen?.rows ?? [];
  const range = hexScrollRange(end, fullRows);
  const selected = selection && selectedRange(selection);
  const position =
    selected === null
      ? labels.hex.top(formatOffset(top * BYTES_PER_ROW, digits))
      : labels.hex.selection(
          formatOffset(selected.start, digits),
          formatOffset(selected.end - 1, digits),
          selected.end - selected.start
        );

  return (
    <div className="hex-view">
      <div className="hex-view-body viewer-rows-frame">
        <div
          aria-label={labels.hex.rows(info.name)}
          aria-readonly="true"
          onBlur={endQuietFocus}
          className="hex-rows scroll-fade-x"
          onKeyDown={onKeyDown}
          onMouseDown={onMouseDown}
          onWheel={onWheel}
          ref={(element) => {
            rowsElement.current = element;
            rowsRef(element);
          }}
          role="textbox"
          tabIndex={0}
        >
          {screen !== null && rows.length === 0 ? (
            <p className="hex-empty">{labels.empty}</p>
          ) : null}
          {rows.map((row) => (
            <Row digits={digits} key={row.offset} row={row} selection={selection} />
          ))}
        </div>
        <ScaledScrollbar
          onDrag={(byte) => go(rowOfByte(byte))}
          onPage={(direction) => scroll(direction * page)}
          position={top * BYTES_PER_ROW}
          total={range.total}
          visible={range.visible}
        />
      </div>
      <p aria-live="polite" className="hex-message">
        {message ?? hexDocument.failure ?? ''}
      </p>
      <footer className="viewer-status hex-status">
        <span className="hex-position">{position}</span>
        {selection !== null ? (
          <>
            <Button onClick={() => copyAs('hex')} size="small">
              {labels.hex.copyHex}
            </Button>
            <Button onClick={() => copyAs('text')} size="small">
              {labels.hex.copyText}
            </Button>
          </>
        ) : null}
        {jump === null ? (
          <Button onClick={openJump} size="small" {...tooltip(labels.hex.jump, '⌘L')}>
            {labels.hex.jump}
          </Button>
        ) : (
          <input
            aria-label={labels.hex.jumpLabel}
            className="hex-jump field field-sm"
            onBlur={() => setJump(null)}
            onChange={(event) => setJump(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                submitJump();
              } else if (event.key === 'Escape') {
                event.preventDefault();
                setMessage(null);
                closeJump();
              }
            }}
            placeholder={labels.hex.jumpPlaceholder}
            ref={jumpField}
            spellCheck={false}
            value={jump}
          />
        )}
      </footer>
    </div>
  );
}

export default HexView;
