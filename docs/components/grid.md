# DataGrid (`uiok/grid`)

A grid of rows of any count, drawn a screenful at a time under a header that stays put. Rows have one fixed height (22px), so the grid places any row without measuring it, and only the rows near the viewport are in the DOM. One cell is the cursor; the page's Copy copies it. Read only: the caller owns the data, the sort, the column order, and any edit.

## Example

```tsx
import { DataGrid } from 'uiok/grid';

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

| Prop                            | Type                                                   | Meaning                                                                               |
| ------------------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `label`                         | `string`                                               | The grid's accessible name                                                            |
| `columns`                       | `readonly DataGridColumn[]`                            | `label`, `tip` (header hover), `align: 'right'`, `id` (keeps a width across reorders) |
| `rowCount`                      | `number`                                               | Rows in all, read or not                                                              |
| `cell`                          | `(row, column) => DataGridCell \| null`                | A cell's look; null while its row is unread                                           |
| `copyText`                      | `(row, column) => string \| null`                      | What Copy puts on the clipboard for the cursor cell                                   |
| `onNeedRows`                    | `(from, to) => void`                                   | Asks for rows `[from, to)` about to draw                                              |
| `rowLead`, `leadWidth`          | `(row) => ReactNode`, `number`                         | Controls before a row's cells and their column's width                                |
| `rowAction`, `actionWidth`      | `(row) => ReactNode`, `number`                         | A control after a row's cells; `max-content` wide without a width                     |
| `sort` / `sorts`                | `DataGridSort \| null` / `readonly DataGridSortMark[]` | One sort column, or several numbered in order                                         |
| `onSort`                        | `(column, { add, remove }) => void`                    | Makes headers sort controls; Shift adds, Option or Control removes                    |
| `onReorder`                     | `(from, to) => void`                                   | Lets a header drag to another column's place                                          |
| `onHeaderDoubleClick`           | `(column) => void`                                     | A header double-click (copy its name); its second click never sorts again             |
| `markedColumns`, `onMarkColumn` | `ReadonlySet<number>`, `(column) => void`              | Lit columns, and a header click beside its sort control                               |
| `rowMarked`, `onMarkRow`        | `(row) => boolean`, `(row) => void`                    | Lit rows, and a click on a row or Space on the cursor row                             |
| `pointer`                       | `boolean`                                              | Lights the row under the pointer                                                      |
| `maxHeight`                     | `number`                                               | Tallest before it scrolls; 420                                                        |
| `editable`, `onEdit`            | `(row, column) => boolean`, `(row, column) => void`    | Inline edit: which cells take it, and the ask                                         |
| `editTrigger`                   | `'click' \| 'double-click'`                            | What starts an edit with the pointer; double-click                                    |
| `editor`                        | `DataGridEditor \| null`                               | `{ row, column, node }`: the caller's editor, drawn over that cell                    |
| `editorContainer`               | `(grid: HTMLElement) => Element \| null`               | Where the editor's fixed layer is drawn; `document.body` by default                   |

### Cells (`DataGridCell`)

`text` is what the cell draws and what its name reads. `className` adds classes, `tip` a hover tooltip and accessible description, `onOpen` turns the text into a link (Return on the cursor cell runs it too), and `content` draws any node in place of the text.

`className` and `content` are the hooks for values the grid knows nothing about. A data store's missing value, binary data shown by its size, or a value edited but not saved yet are the caller's classes and styles; the grid's stylesheet styles only `cell-edited` (a warning wash).

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

`.data-grid` (`.pointer`), `.data-grid-header`, `.data-grid-heading` (`.align-right`, `.marked`, `.draggable`, `.dragging`, `.drop-before`, `.drop-after`), `.data-grid-label`, `.data-grid-sort`, `.data-grid-arrow`, `.data-grid-resize`, `.data-grid-body`, `.data-grid-row` (`.marked`), `.data-grid-cell` (`.align-right`, `.cursor`, `.marked`, `.editing`, `.cell-edited`), `.data-grid-lead`, `.data-grid-action`, `.data-grid-link`, `.data-grid-editor`. The editor's layer sits above a dialog (`--z-dialog` + 1).

## Labels read

None. Column labels and cell text are the caller's.
