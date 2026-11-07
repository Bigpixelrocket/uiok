import {
  useEffect,
  useId,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactElement,
  type ReactNode
} from 'react';
import { createPortal, flushSync } from 'react-dom';

import {
  dropPlace,
  gridMove,
  initialWidth,
  movedCell,
  resizedWidth,
  visibleRows,
  windowHolds,
  type GridCell,
  type ScrollDirection
} from './DataGrid.logic.js';
import { describedTooltip } from '../tooltip/Tooltip.logic.js';

/** Every row's height, so the grid can place any row without measuring it. */
const ROW_HEIGHT = 22;
/** The viewport height before it is measured (or where it never is). */
const FALLBACK_VIEWPORT = 400;
/** A character's width in the grid's monospace face, for first column widths. */
const CHAR_WIDTH = 7.8;
/** How far a header moves under the pointer before it is dragged rather than clicked. */
const DRAG_THRESHOLD = 5;
/** How long a link's click waits for a second click that edits its cell instead. */
const LINK_WAIT_MS = 300;

/** A column of the grid. */
export interface DataGridColumn {
  /** The header's words, which also size the column's first width. */
  readonly label: string;
  /** What hovering the header says, beyond the label (a column's type). */
  readonly tip?: string;
  /** Numbers read right-aligned. */
  readonly align?: 'right';
  /** Names the column across reorders, so its width follows it; its index when absent. */
  readonly id?: string;
}

/** The column a grid is sorted by, and which way. */
export interface DataGridSort {
  /** The column's index in `columns`. */
  readonly column: number;
  /** Which way it sorts, as `aria-sort` names it. */
  readonly direction: 'ascending' | 'descending';
}

/** A column's place in a sort of several columns, which its header numbers. */
export interface DataGridSortMark extends DataGridSort {
  /** Its place in the sort, from 1; shown only while several columns sort. */
  readonly position: number;
}

/** What a header click adds to a sort: Shift adds the column, Option or Control takes it out. */
export interface DataGridSortClick {
  /** Shift without Option: add the column to the sort rather than sort by it alone. */
  readonly add: boolean;
  /** Option or Control: take the column out of the sort. */
  readonly remove: boolean;
}

/**
 * What a cell shows: its text, a class for its look, and what hovering it
 * says. `className` and `content` are the hooks for values the grid knows
 * nothing about: a missing value drawn apart from the text, bytes shown by
 * their size, a value edited but not saved yet (`cell-edited`, which the
 * grid's stylesheet washes in the warning colour).
 */
export interface DataGridCell {
  /** The cell's text: what it draws, and what its accessible name reads. */
  readonly text: string;
  /** Classes added to the cell, for a look of the caller's own. */
  readonly className?: string;
  /** What hovering the cell says, also its accessible description. */
  readonly tip?: string;
  /** Makes the cell's text a link that runs this (a linked record, a download); Return runs it too. */
  readonly onOpen?: () => void;
  /**
   * What the cell draws in place of its text (a link, an image, coloured
   * code); `text` stays what the cell's name reads. A cell with `content`
   * draws no link of its own.
   */
  readonly content?: ReactNode;
}

/** The editor a caller draws over one cell while it edits it inline. */
export interface DataGridEditor {
  /** The edited cell's row. */
  readonly row: number;
  /** The edited cell's column. */
  readonly column: number;
  /** The editor itself: a field, its buttons. */
  readonly node: ReactNode;
}

/** Props for {@link DataGrid}. */
export interface DataGridProps {
  /** The grid's accessible name ("Orders"). */
  readonly label: string;
  /** The columns, in the order they draw. */
  readonly columns: readonly DataGridColumn[];
  /** How many rows the grid holds, read or not. */
  readonly rowCount: number;
  /** A cell's look, or null while its row has not been read. */
  readonly cell: (row: number, column: number) => DataGridCell | null;
  /** The text Copy puts on the clipboard for a cell; null copies nothing. */
  readonly copyText: (row: number, column: number) => string | null;
  /** Asks for rows `[from, to)` the grid is about to draw. */
  readonly onNeedRows?: (from: number, to: number) => void;
  /** Controls at a row's start, before its cells (a checkbox, Copy, Delete). */
  readonly rowLead?: (row: number) => ReactNode;
  /** The width of the lead's column, the same on every row, in pixels. */
  readonly leadWidth?: number;
  /** A control at a row's end, after its cells (Stop on a list of running jobs). */
  readonly rowAction?: (row: number) => ReactNode;
  /** The width of the row's end column, in pixels; as wide as it asks when absent. */
  readonly actionWidth?: number;
  /** The column the rows are sorted by, which its header marks. */
  readonly sort?: DataGridSort | null;
  /** The columns the rows are sorted by, in order, each header numbered while there are several. */
  readonly sorts?: readonly DataGridSortMark[];
  /** Makes each header a control that asks to sort by its column; the caller orders the rows. */
  readonly onSort?: (column: number, click: DataGridSortClick) => void;
  /** Lets a header be dragged to another column's place; the caller reorders `columns`. */
  readonly onReorder?: (from: number, to: number) => void;
  /**
   * A double-click on a header, its name included (copy its name). Its
   * first click sorts as any click does; the second click of the pair
   * never sorts again, so the sort is not turned back.
   */
  readonly onHeaderDoubleClick?: (column: number) => void;
  /** The columns marked, which draw lit. */
  readonly markedColumns?: ReadonlySet<number>;
  /** A click on a header beside its sort control marks or unmarks its column. */
  readonly onMarkColumn?: (column: number) => void;
  /** Whether a row is marked, which draws it lit. */
  readonly rowMarked?: (row: number) => boolean;
  /** A click on a row's cells, or Space on the cursor's row, marks or unmarks it. */
  readonly onMarkRow?: (row: number) => void;
  /** Lights the row under the pointer. */
  readonly pointer?: boolean;
  /** The tallest the grid grows before it scrolls, in pixels; 420 unless given. */
  readonly maxHeight?: number;
  /** Whether a cell takes an inline edit; none does without it. */
  readonly editable?: (row: number, column: number) => boolean;
  /** What starts an edit with the pointer; a double-click unless given. */
  readonly editTrigger?: 'click' | 'double-click';
  /** Asks to edit a cell, which the caller answers by drawing `editor` over it. */
  readonly onEdit?: (row: number, column: number) => void;
  /** The editor drawn over the cell being edited. */
  readonly editor?: DataGridEditor | null;
  /**
   * The element the editor's layer is drawn into, given the grid's own
   * element: an ancestor whose styles the editor needs (`(grid) =>
   * grid.closest('.app-root')`). `document.body` unless given or when it
   * returns null.
   */
  readonly editorContainer?: (grid: HTMLElement) => Element | null;
}

/**
 * A grid of rows of any count, drawn a screenful at a time under a header
 * that stays put while they scroll, each column as wide as its first rows
 * ask and resizable by its header's edge. One cell is the cursor, which a
 * click or the arrows move (⌘ and an arrow go to an edge, Page Up and Page
 * Down by a screen), and the page's Copy (⌘C, or an Edit menu's Copy) puts
 * its `copyText` on the clipboard; Return runs the cursor cell's link. Read
 * only: a cell's look and text come from `cell`, and a row not read yet
 * draws empty while `onNeedRows` asks for it.
 *
 * What a caller adds, each only where it passes its handler: headers that
 * sort (Shift adds a column to the sort, Option or Control takes it out),
 * that drag to a new place, that copy their name on a double-click, and
 * that mark their column on a click; controls at each row's start and end;
 * rows that mark on a click or Space; the row under the pointer lit; and
 * inline edit: a click or a double-click on an editable cell (`editTrigger`),
 * or Return on the cursor cell when it holds no link, asks to edit it
 * (`onEdit`), and the caller's editor draws over that cell (`editor`). With
 * a double-click starting an edit, a link cell's single click waits a
 * moment, so a double-click edits it rather than following it.
 */
export function DataGrid({
  label,
  columns,
  rowCount,
  cell,
  copyText,
  onNeedRows,
  rowLead,
  leadWidth = 0,
  rowAction,
  actionWidth,
  sort,
  sorts,
  onSort,
  onReorder,
  onHeaderDoubleClick,
  markedColumns,
  onMarkColumn,
  rowMarked,
  onMarkRow,
  pointer = false,
  maxHeight = 420,
  editable,
  editTrigger = 'double-click',
  onEdit,
  editor = null,
  editorContainer
}: DataGridProps): ReactElement {
  const id = useId();
  const viewport = useRef<HTMLDivElement>(null);
  const header = useRef<HTMLDivElement>(null);
  /** Where the grid stood when it last scrolled; kept while it is out of layout (a hidden pane). */
  const scrollTop = useRef(0);
  /** Which way it last scrolled, which the rows drawn lean toward. */
  const direction = useRef<ScrollDirection>(0);
  const [viewportHeight, setViewportHeight] = useState(FALLBACK_VIEWPORT);
  /** The rows the last commit drew, and the facts the scroll listener judges them by. */
  const committed = useRef<{
    readonly from: number;
    readonly to: number;
    readonly viewportHeight: number;
    readonly rowCount: number;
  } | null>(null);
  const [, redraw] = useReducer((version: number) => version + 1, 0);
  const [cursor, setCursor] = useState<GridCell | null>(null);
  const [dragging, setDragging] = useState<{ from: number; to: number } | null>(null);
  /** A drag just ended, so the click it ends with sorts nothing. */
  const dragged = useRef(false);
  /** Where the cell being edited sits in the window, which its editor is drawn over. */
  const [editorBox, setEditorBox] = useState<{ left: number; top: number; width: number } | null>(
    null
  );
  /** A link's click waiting to see whether a double-click edits its cell instead. */
  const pendingLink = useRef<number | null>(null);
  const canEdit = (row: number, column: number): boolean =>
    onEdit !== undefined && (editable?.(row, column) ?? false);

  useEffect(
    () => () => {
      if (pendingLink.current !== null) window.clearTimeout(pendingLink.current);
    },
    []
  );
  const keyOf = (column: DataGridColumn, index: number): string => column.id ?? String(index);
  const [widths, setWidths] = useState<ReadonlyMap<string, number>>(
    () =>
      new Map(
        columns.map((column, index) => [
          keyOf(column, index),
          initialWidth(
            column.label,
            Array.from(
              { length: Math.min(rowCount, 20) },
              (_, row) => cell(row, index)?.text ?? ''
            ),
            CHAR_WIDTH
          )
        ])
      )
  );
  const widthOf = (column: DataGridColumn, index: number): number =>
    widths.get(keyOf(column, index)) ?? initialWidth(column.label, [], CHAR_WIDTH);
  // The rows drawn last while they still cover where the grid stands, a fresh window otherwise.
  const held = committed.current;
  const { from, to } =
    held !== null &&
    windowHolds(held, scrollTop.current, viewportHeight, ROW_HEIGHT, rowCount, direction.current)
      ? held
      : visibleRows(
          scrollTop.current,
          viewportHeight,
          ROW_HEIGHT,
          rowCount,
          undefined,
          direction.current
        );
  const template = [
    rowLead === undefined ? null : `${leadWidth}px`,
    ...columns.map((column, index) => `${widthOf(column, index)}px`),
    rowAction === undefined ? null : actionWidth === undefined ? 'max-content' : `${actionWidth}px`
  ]
    .filter((part) => part !== null)
    .join(' ');
  const page = Math.max(1, Math.floor(viewportHeight / ROW_HEIGHT) - 1);
  const marks: readonly DataGridSortMark[] =
    sorts ?? (sort === null || sort === undefined ? [] : [{ ...sort, position: 1 }]);

  useLayoutEffect(() => {
    const element = viewport.current;

    if (element === null || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      if (element.clientHeight > 0) setViewportHeight(element.clientHeight);
    });

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    committed.current = { from, to, viewportHeight, rowCount };
  });

  // A listener of its own rather than React's `onScroll`, whose dispatch
  // commits on every scroll event; a scroll draws again only once the rows
  // drawn no longer keep the overscan ahead of the viewport (`windowHolds`).
  // A turn finds only the quarter behind on its new side, so its rows are
  // drawn before the frame it scrolled in paints.
  useLayoutEffect(() => {
    const element = viewport.current;

    if (element === null) return;

    const follow = (): void => {
      let turned = false;

      if (element.clientHeight > 0 && element.scrollTop !== scrollTop.current) {
        const next = element.scrollTop > scrollTop.current ? 1 : -1;

        turned = direction.current === -next;
        direction.current = next;
        scrollTop.current = element.scrollTop;
      }

      const drawn = committed.current;

      if (
        drawn === null ||
        !windowHolds(
          drawn,
          scrollTop.current,
          drawn.viewportHeight,
          ROW_HEIGHT,
          drawn.rowCount,
          direction.current
        )
      ) {
        if (turned) flushSync(redraw);
        else redraw();
      }
    };

    element.addEventListener('scroll', follow, { passive: true });
    return () => element.removeEventListener('scroll', follow);
  }, []);

  useEffect(() => {
    onNeedRows?.(from, to);
  }, [from, to, onNeedRows]);

  // Copy answers the page's own copy event (⌘C, or an Edit menu's Copy).
  useEffect(() => {
    const onCopy = (event: ClipboardEvent): void => {
      const element = viewport.current;

      if (cursor === null || element === null || !element.contains(document.activeElement)) return;

      const text = copyText(cursor.row, cursor.column);

      if (text === null || event.clipboardData === null) return;
      event.preventDefault();
      event.clipboardData.setData('text/plain', text);
    };

    window.addEventListener('copy', onCopy);
    return () => window.removeEventListener('copy', onCopy);
  }, [cursor, copyText]);

  const editorRow = editor?.row ?? null;
  const editorColumn = editor?.column ?? null;

  // The editor is drawn over its cell in a layer of its own, so the grid's
  // scrolling box never cuts it; it follows the cell as the grid or the page
  // scrolls. With no editor open, rows drawn again set nothing.
  useLayoutEffect(() => {
    if (editorRow === null || editorColumn === null) return;

    const place = (): void => {
      const target = document.getElementById(`${id}-${editorRow}-${editorColumn}`);
      const box = target?.getBoundingClientRect();

      setEditorBox(box === undefined ? null : { left: box.left, top: box.top, width: box.width });
    };

    place();
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);
    return () => {
      window.removeEventListener('scroll', place, true);
      window.removeEventListener('resize', place);
      setEditorBox(null);
    };
  }, [id, editorRow, editorColumn, from, to]);

  /** Scrolls a row into the viewport, below the header. */
  const reveal = (row: number): void => {
    const element = viewport.current;

    if (element === null) return;

    const top = row * ROW_HEIGHT;
    const shown = element.clientHeight - ROW_HEIGHT;

    if (top < element.scrollTop) element.scrollTop = top;
    else if (top + ROW_HEIGHT > element.scrollTop + shown) {
      element.scrollTop = top + ROW_HEIGHT - shown;
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.ctrlKey || event.altKey || event.shiftKey) return;

    if (event.key === 'Enter' && cursor !== null) {
      const open = cell(cursor.row, cursor.column)?.onOpen;

      if (open !== undefined) {
        event.preventDefault();
        open();
      } else if (canEdit(cursor.row, cursor.column)) {
        event.preventDefault();
        onEdit?.(cursor.row, cursor.column);
      }
      return;
    }
    if (event.key === ' ' && cursor !== null && onMarkRow !== undefined && !event.metaKey) {
      event.preventDefault();
      onMarkRow(cursor.row);
      return;
    }

    const move = gridMove(event.key, event.metaKey);
    const next = move === null ? null : movedCell(cursor, move, rowCount, columns.length, page);

    if (next === null) return;
    event.preventDefault();
    setCursor(next);
    reveal(next.row);
  };

  const onResizeStart = (event: ReactPointerEvent<HTMLSpanElement>, column: number): void => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();

    const target = event.currentTarget;
    const startX = event.clientX;
    const key = keyOf(columns[column] ?? { label: '' }, column);
    const startWidth = widthOf(columns[column] ?? { label: '' }, column);

    target.setPointerCapture(event.pointerId);

    const onMove = (move: PointerEvent): void => {
      setWidths((held) => new Map(held).set(key, resizedWidth(startWidth, move.clientX - startX)));
    };
    const onUp = (): void => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('lostpointercapture', onUp);
    };

    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('lostpointercapture', onUp);
  };

  /** The columns' left and right edges in the header, for where a dragged header lands. */
  const headingEdges = (): { left: number; right: number }[] =>
    [...(header.current?.querySelectorAll<HTMLElement>('[role="columnheader"]') ?? [])].map(
      (element) => {
        const box = element.getBoundingClientRect();

        return { left: box.left, right: box.right };
      }
    );

  const onHeadingPointerDown = (event: ReactPointerEvent<HTMLDivElement>, column: number): void => {
    if (onReorder === undefined || event.button !== 0 || columns.length < 2) return;

    const target = event.currentTarget;
    const startX = event.clientX;
    let moving = false;

    const onMove = (move: PointerEvent): void => {
      if (!moving && Math.abs(move.clientX - startX) < DRAG_THRESHOLD) return;
      if (!moving) {
        moving = true;
        target.setPointerCapture(event.pointerId);
      }
      setDragging({ from: column, to: dropPlace(move.clientX, headingEdges(), column) });
    };
    const onUp = (up: PointerEvent): void => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      if (!moving) return;
      dragged.current = true;
      setDragging(null);

      const place = dropPlace(up.clientX, headingEdges(), column);

      if (place !== column) onReorder(column, place);
    };
    const onCancel = (): void => {
      target.removeEventListener('pointermove', onMove);
      target.removeEventListener('pointerup', onUp);
      target.removeEventListener('pointercancel', onCancel);
      setDragging(null);
    };

    target.addEventListener('pointermove', onMove);
    target.addEventListener('pointerup', onUp);
    target.addEventListener('pointercancel', onCancel);
  };

  /** Swallows the click a drag ends with. */
  const draggedClick = (event: ReactMouseEvent): boolean => {
    if (!dragged.current) return false;
    dragged.current = false;
    event.stopPropagation();
    return true;
  };

  const cellId = (row: number, column: number): string => `${id}-${row}-${column}`;
  const rows: ReactElement[] = [];

  for (let row = from; row < to; row += 1) {
    const marked = rowMarked?.(row) ?? false;

    rows.push(
      <div
        aria-rowindex={row + 2}
        aria-selected={onMarkRow === undefined ? undefined : marked}
        className={marked ? 'data-grid-row marked' : 'data-grid-row'}
        key={row}
        role="row"
        style={{ gridTemplateColumns: template, transform: `translateY(${row * ROW_HEIGHT}px)` }}
      >
        {rowLead !== undefined && <div className="data-grid-lead">{rowLead(row)}</div>}
        {columns.map((column, index) => {
          const shown = cell(row, index);
          const current = cursor?.row === row && cursor.column === index;
          const editing = editor !== null && editor.row === row && editor.column === index;
          const edits = canEdit(row, index);

          return (
            <div
              aria-colindex={index + 1}
              aria-selected={current}
              className={[
                'data-grid-cell',
                column.align === 'right' ? 'align-right' : '',
                current ? 'cursor' : '',
                markedColumns?.has(index) === true ? 'marked' : '',
                editing ? 'editing' : '',
                shown?.className ?? ''
              ]
                .filter(Boolean)
                .join(' ')}
              id={cellId(row, index)}
              key={keyOf(column, index)}
              onClick={() => {
                if (edits && editTrigger === 'click' && !editing) onEdit?.(row, index);
                else onMarkRow?.(row);
              }}
              onDoubleClick={() => {
                if (!edits || editTrigger !== 'double-click' || editing) return;
                if (pendingLink.current !== null) window.clearTimeout(pendingLink.current);
                pendingLink.current = null;
                onEdit?.(row, index);
              }}
              onPointerDown={() => setCursor({ row, column: index })}
              role="gridcell"
              {...describedTooltip(shown?.tip ?? null)}
            >
              {shown?.content !== undefined ? (
                shown.content
              ) : shown?.onOpen === undefined ? (
                (shown?.text ?? '')
              ) : (
                <button
                  className="data-grid-link"
                  onClick={(event) => {
                    event.stopPropagation();

                    const open = shown.onOpen;

                    if (edits && editTrigger === 'double-click') {
                      if (event.detail > 1) return;
                      // A second click within the system's double-click time edits instead.
                      pendingLink.current = window.setTimeout(() => {
                        pendingLink.current = null;
                        open?.();
                      }, LINK_WAIT_MS);
                      return;
                    }
                    open?.();
                  }}
                  onMouseDown={(event) => {
                    // A press leaves focus on the grid, so its keys keep working.
                    event.preventDefault();
                    viewport.current?.focus({ preventScroll: true });
                  }}
                  tabIndex={-1}
                  type="button"
                >
                  {shown.text}
                </button>
              )}
              {editing &&
                editorBox !== null &&
                createPortal(
                  <div
                    className="data-grid-editor"
                    onClick={(event) => event.stopPropagation()}
                    onDoubleClick={(event) => event.stopPropagation()}
                    onPointerDown={(event) => event.stopPropagation()}
                    style={{
                      left: editorBox.left - 1,
                      top: editorBox.top - 1,
                      minWidth: editorBox.width + 2,
                      // It keeps inside the window, however far right its cell lies.
                      maxWidth: Math.max(160, window.innerWidth - editorBox.left - 8)
                    }}
                  >
                    {editor.node}
                  </div>,
                  // Where the caller says, so its styles reach the editor.
                  (viewport.current === null ? null : editorContainer?.(viewport.current)) ??
                    document.body
                )}
            </div>
          );
        })}
        {rowAction !== undefined && <div className="data-grid-action">{rowAction(row)}</div>}
      </div>
    );
  }

  return (
    <div
      aria-activedescendant={cursor === null ? undefined : cellId(cursor.row, cursor.column)}
      aria-colcount={columns.length}
      aria-label={label}
      aria-multiselectable={onMarkRow === undefined ? undefined : true}
      aria-rowcount={rowCount + 1}
      className={pointer ? 'data-grid pointer' : 'data-grid'}
      onKeyDown={onKeyDown}
      ref={viewport}
      role="grid"
      style={{ maxHeight: maxHeight }}
      tabIndex={0}
    >
      <div
        aria-rowindex={1}
        className="data-grid-header"
        ref={header}
        role="row"
        style={{ gridTemplateColumns: template }}
      >
        {rowLead !== undefined && <div className="data-grid-lead" />}
        {columns.map((column, index) => {
          const mark = marks.find((entry) => entry.column === index);

          return (
            <div
              aria-colindex={index + 1}
              aria-sort={mark?.direction}
              className={[
                'data-grid-heading',
                column.align === 'right' ? 'align-right' : '',
                markedColumns?.has(index) === true ? 'marked' : '',
                dragging?.from === index ? 'dragging' : '',
                dragging !== null && dragging.to === index && dragging.from !== index
                  ? dragging.to < dragging.from
                    ? 'drop-before'
                    : 'drop-after'
                  : '',
                onReorder === undefined ? '' : 'draggable'
              ]
                .filter(Boolean)
                .join(' ')}
              key={keyOf(column, index)}
              onClick={(event) => {
                if (draggedClick(event)) return;
                onMarkColumn?.(index);
              }}
              onDoubleClick={() => onHeaderDoubleClick?.(index)}
              onPointerDown={(event) => onHeadingPointerDown(event, index)}
              role="columnheader"
              {...describedTooltip(column.tip ?? null)}
            >
              {onSort === undefined ? (
                <span className="data-grid-label">{column.label}</span>
              ) : (
                <button
                  className="data-grid-label data-grid-sort"
                  onClick={(event) => {
                    event.stopPropagation();
                    // A double-click's second click (`detail` 2) leaves the sort its first made.
                    if (draggedClick(event) || event.detail > 1) return;
                    onSort(index, {
                      add: event.shiftKey && !event.altKey,
                      remove: event.altKey || event.ctrlKey
                    });
                  }}
                  type="button"
                >
                  {column.label}
                  {mark !== undefined && (
                    <span aria-hidden className="data-grid-arrow">
                      {mark.direction === 'ascending' ? '▲' : '▼'}
                      {marks.length > 1 && <small>{mark.position}</small>}
                    </span>
                  )}
                </button>
              )}
              <span
                aria-hidden
                className="data-grid-resize"
                onPointerDown={(event) => onResizeStart(event, index)}
              />
            </div>
          );
        })}
        {rowAction !== undefined && <div className="data-grid-action" />}
      </div>
      <div className="data-grid-body" role="rowgroup" style={{ height: rowCount * ROW_HEIGHT }}>
        {rows}
      </div>
    </div>
  );
}
