/**
 * `DataGrid`: a virtualised grid of rows with a cursor cell, sortable,
 * resizable, and reorderable columns, row and column marks, and an inline
 * editor layer; plus the pure rules it draws and moves by.
 */

export {
  DataGrid,
  type DataGridCell,
  type DataGridColumn,
  type DataGridEditor,
  type DataGridProps,
  type DataGridSort,
  type DataGridSortClick,
  type DataGridSortMark
} from './DataGrid.js';
export {
  dropPlace,
  gridMove,
  initialWidth,
  MINIMUM_COLUMN_WIDTH,
  movedCell,
  resizedWidth,
  visibleRows,
  windowHolds,
  type GridCell,
  type GridMove,
  type ScrollDirection
} from './DataGrid.logic.js';
