# DataGrid (`@bigpixelrocket/uiok/grid`)

A grid of rows of any count, drawn a screenful at a time under a header that stays put. Rows have one fixed height (22px), so the grid places any row without measuring it, and only the rows near the viewport are in the DOM. One cell is the cursor; the page's Copy copies it. Read only: the caller owns the data, the sort, the column order, and any edit.

## Example

```tsx
import { DataGrid } from '@bigpixelrocket/uiok/grid';

<DataGrid
  cell={(row, column) => {
    const record = rows[row];
    if (record === undefined) return null; // not read yet: drawn empty
    const value = record[column];
    return value === undefined
      ? { text: 'empty', className: 'cell-missing' }
      : { text: String(value) };
  }}
  columns={[{ label: 'name' }, { label: 'size', align: 'right', tip: 'bytes' }]}
  copyText={(row, column) => String(rows[row]?.[column] ?? '')}
  label="Files"
  onNeedRows={(from, to) => load(from, to)}
  onSort={(column, click) => setSort(nextSort(sort, column, click))}
  rowCount={total}
  sorts={sort}
/>;
```

## Props (`DataGridProps`)

| Prop                            | Type                                                   | Meaning                                                                                     |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| `label`                         | `string`                                               | The grid's accessible name                                                                  |
| `columns`                       | `readonly DataGridColumn[]`                            | `label`, `tip` (header hover), `align: 'right'`, `id` (keeps a width across reorders)       |
| `rowCount`                      | `number`                                               | Rows in all, read or not                                                                    |
| `cell`                          | `(row, column) => DataGridCell \| null`                | A cell's look; null while its row is unread                                                 |
| `copyText`                      | `(row, column) => string \| null`                      | What Copy puts on the clipboard for the cursor cell                                         |
| `onNeedRows`                    | `(from, to) => void`                                   | Asks for rows `[from, to)` about to draw                                                    |
| `rowLead`, `leadWidth`          | `(row) => ReactNode`, `number`                         | Controls before a row's cells and their column's width                                      |
| `rowAction`, `actionWidth`      | `(row) => ReactNode`, `number`                         | A control after a row's cells; `max-content` wide without a width                           |
| `sort` / `sorts`                | `DataGridSort \| null` / `readonly DataGridSortMark[]` | One sort column, or several numbered in order                                               |
| `onSort`                        | `(column, { add, remove }) => void`                    | Makes headers sort controls; Shift adds, Option or Control removes                          |
| `onReorder`                     | `(from, to) => void`                                   | Lets a header drag to another column's place                                                |
| `onHeaderDoubleClick`           | `(column) => void`                                     | A header double-click (copy its name); its second click never sorts again                   |
| `markedColumns`, `onMarkColumn` | `ReadonlySet<number>`, `(column) => void`              | Lit columns, and a header click beside its sort control                                     |
| `rowMarked`, `onMarkRow`        | `(row) => boolean`, `(row) => void`                    | Lit rows, and a click on a row or Space on the cursor row                                   |
| `pointer`                       | `boolean`                                              | Lights the row under the pointer                                                            |
| `maxHeight`                     | `number`                                               | Tallest before it scrolls; 420                                                              |
| `editable`, `onEdit`            | `(row, column) => boolean`, `(row, column) => void`    | Inline edit: which cells take it, and the ask                                               |
| `editTrigger`                   | `'click' \| 'double-click'`                            | What starts an edit with the pointer; double-click                                          |
| `editor`                        | `DataGridEditor \| null`                               | `{ row, column, node }`: the caller's editor, drawn over that cell                          |
| `editorContainer`               | `(grid: HTMLElement) => Element \| null`               | Where the editor's fixed layer is drawn; `document.body` by default                         |
| `empty`                         | `ReactNode`                                            | What a grid with no rows says, dim and centred in its well; the well stays blank without it |

### Cells (`DataGridCell`)

`text` is what the cell draws and what its name reads. `className` adds classes, `tip` a hover tooltip and accessible description, `onOpen` turns the text into a link (Return on the cursor cell runs it too), and `content` draws any node in place of the text.

`className` and `content` are the hooks for values the grid knows nothing about. A data store's missing value, binary data shown by its size, or a value edited but not saved yet are the caller's classes. The grid's stylesheet styles three of them: `cell-null` (a missing value, dim italic), `cell-binary` (bytes shown by their kind and size), and `cell-edited` (a warning wash); any other class is the caller's to style.

### Logic

`visibleRows` and `windowHolds` decide which rows draw and when a scroll draws them again; `gridMove` and `movedCell` the cursor's moves; `initialWidth`, `resizedWidth`, and `MINIMUM_COLUMN_WIDTH` the column widths; `dropPlace` where a dragged header lands.

## Keyboard

The grid is one Tab stop; the cursor cell is its `aria-activedescendant`.

| Key                  | Does                                                         |
| -------------------- | ------------------------------------------------------------ |
| Arrows               | Move the cursor a cell, stopping at the edges                |
| ⌘ and an arrow       | Go to the first or last row, or the row's first or last cell |
| Home, End            | The row's first or last cell                                 |
| Page Up, Page Down   | A screen of rows                                             |
| Return               | Runs the cursor cell's link, or asks to edit it              |
| Space                | Marks the cursor's row (with `onMarkRow`)                    |
| ⌘C (the page's Copy) | Copies `copyText` of the cursor cell                         |

With a double-click edit trigger, a link cell's single click waits 300ms so a double-click edits it instead of following it.

## Styling

`.data-grid` (`.pointer`): the frame, which draws the border, corners, and ground and clips to them; `.data-grid-scroll` inside it: the well that scrolls, holds the keyboard (`role="grid"`; its focus ring is drawn on the frame), and carries `.scroll-fade-x` while its columns overflow it by at least the fade's 12px, which fades a side that hides columns without erasing the frame (a sliver of overflow scrolls without a fade). `.data-grid-header`, `.data-grid-heading` (`.align-right`, `.marked`, `.draggable`, `.dragging`, `.drop-before`, `.drop-after`), `.data-grid-label`, `.data-grid-sort` (a box of the row's height, so the header keeps one height sorted or not), `.data-grid-sort-name` (the label inside it, cut with an ellipsis), `.data-grid-arrow`, `.data-grid-resize`, `.data-grid-body` (`.empty`: a two-row well under the header when there are no rows), `.data-grid-empty` (the `empty` content in that well), `.data-grid-row` (zebra rows `--row-zebra`; under the pointer in a `.pointer` grid `--row-hover`; `.marked`: `--marked-bg`, kept under the pointer, and a `--marked-bar` on the leading edge), `.data-grid-cell` (`.align-right`, `.cursor`, `.marked`, `.editing`, `.cell-null` in `--row-meta-text`, `--text-on-surface` on a hovered, marked, cursor, or edited ground, `.cell-binary` in `--cell-binary-text`, `.cell-edited`: the `--warning-wash-strong` tint and a `--warning` corner). A cell whose state replaces its row's (the cursor cell of a marked row, an edited cell) paints its tint over the bare `--ground`, never over the row's tint, and the last cell leaves the right edge to the frame, `.data-grid-lead`, `.data-grid-action`, `.data-grid-link`, `.data-grid-editor`. The editor's layer sits above a dialog (`--z-dialog-popover`) and over its cell; a layer wider than the cell that would cross the frame's right edge moves left to end 8px inside it; a field, its direct child or inside the caller's wrapper, takes the cell's width (what buttons beside it leave), the row's height, the cell's monospace text on the cell's baseline, and an accent edge. A layer that holds more than a bare field (a field with Save and Cancel) stands on a `--surface` panel with a `--border-strong` edge and the popover's shadow, so the cell beneath never shows through a quiet button; the panel's padding and edge sit outside the layer, so its field still lies on the cell. The sort mark is the listing's chevron (`ChevronUp`, `ChevronDown`), before the label on a right-aligned column.

## Labels read

None. Column labels and cell text are the caller's.
