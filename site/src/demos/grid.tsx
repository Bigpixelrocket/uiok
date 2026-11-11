/**
 * A grid of ten thousand orders: click into it and arrow around, ⌘ and an
 * arrow jumps to an edge, Page Up and Down move a screen, Space marks a
 * row, a header click sorts (Shift adds a column), a header edge resizes,
 * and a header drags to reorder. Under it, a short grid with every cell
 * kind (a lead checkbox, linked ids, missing and edited values, a marked
 * column, an inline field on double-click and an editor with Save and
 * Cancel), and a grid with no rows.
 */

import { useMemo, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import {
  DataGrid,
  type DataGridCell,
  type DataGridColumn,
  type DataGridSortMark
} from '@bigpixelrocket/uiok/grid';

import { ORDER_COUNT, orderAt, type Order } from './data';

const FIELDS: readonly { readonly key: keyof Order; readonly column: DataGridColumn }[] = [
  { key: 'id', column: { id: 'id', label: 'order', align: 'right' } },
  { key: 'customer', column: { id: 'customer', label: 'customer' } },
  { key: 'city', column: { id: 'city', label: 'city' } },
  { key: 'product', column: { id: 'product', label: 'product' } },
  { key: 'quantity', column: { id: 'quantity', label: 'qty', align: 'right', tip: 'units' } },
  { key: 'total', column: { id: 'total', label: 'total', align: 'right', tip: 'US dollars' } },
  { key: 'placed', column: { id: 'placed', label: 'placed' } },
  { key: 'status', column: { id: 'status', label: 'status' } }
];

const ORDERS: readonly Order[] = Array.from({ length: ORDER_COUNT }, (_, index) => orderAt(index));
const money = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

const text = (order: Order, key: keyof Order): string =>
  key === 'total' ? money.format(order.total) : String(order[key]);

/** The grid page's demo. */
export function GridDemo() {
  const [fields, setFields] = useState(FIELDS);
  const [sorts, setSorts] = useState<readonly DataGridSortMark[]>([]);
  const [marked, setMarked] = useState<ReadonlySet<number>>(() => new Set());

  const rows = useMemo(() => {
    if (sorts.length === 0) return ORDERS;
    const keys = sorts.map((sort) => ({
      key: fields[sort.column]?.key ?? 'id',
      sign: sort.direction === 'ascending' ? 1 : -1
    }));
    return [...ORDERS].sort((a, b) => {
      for (const { key, sign } of keys) {
        const left = a[key];
        const right = b[key];
        const order =
          typeof left === 'number' && typeof right === 'number'
            ? left - right
            : String(left).localeCompare(String(right));
        if (order !== 0) return sign * order;
      }
      return 0;
    });
  }, [sorts, fields]);

  return (
    <div className="demo-stack">
      <DataGrid
        cell={(row, column) => {
          const order = rows[row];
          const field = fields[column];
          if (order === undefined || field === undefined) return null;
          return {
            text: text(order, field.key),
            className:
              field.key === 'status' && order.status === 'refunded' ? 'demo-cell-dim' : undefined
          };
        }}
        columns={fields.map((field) => field.column)}
        copyText={(row, column) => {
          const order = rows[row];
          const field = fields[column];
          return order === undefined || field === undefined ? null : text(order, field.key);
        }}
        label="Orders"
        maxHeight={360}
        onMarkRow={(row) => {
          const id = rows[row]?.id;
          if (id === undefined) return;
          setMarked((current) => {
            const next = new Set(current);
            if (!next.delete(id)) next.add(id);
            return next;
          });
        }}
        onNeedRows={() => undefined}
        onReorder={(from, to) => {
          const next = [...fields];
          const [moved] = next.splice(from, 1);
          if (moved !== undefined) next.splice(to, 0, moved);
          const place = (column: number) => next.indexOf(fields[column] as (typeof fields)[number]);
          setSorts((current) => current.map((sort) => ({ ...sort, column: place(sort.column) })));
          setFields(next);
        }}
        onSort={(column, click) => {
          setSorts((current) => {
            const existing = current.find((sort) => sort.column === column);
            if (click.remove) return renumber(current.filter((sort) => sort.column !== column));
            const flipped: DataGridSortMark = {
              column,
              direction: existing?.direction === 'ascending' ? 'descending' : 'ascending',
              position: existing?.position ?? current.length + 1
            };
            if (click.add) {
              return existing === undefined
                ? [...current, flipped]
                : current.map((sort) => (sort.column === column ? flipped : sort));
            }
            return [{ ...flipped, position: 1 }];
          });
        }}
        pointer
        rowCount={rows.length}
        rowMarked={(row) => marked.has(rows[row]?.id ?? -1)}
        sorts={sorts}
      />
      <code className="demo-readout">
        {rows.length.toLocaleString('en-US')} rows · {marked.size} marked · sorted by{' '}
        {sorts.length === 0
          ? 'nothing'
          : sorts
              .map((sort) => `${fields[sort.column]?.column.label} ${sort.direction}`)
              .join(', ')}
      </code>
      <h3 className="demo-subhead">Cell kinds and inline edit</h3>
      <CellKinds />
      <h3 className="demo-subhead">No rows</h3>
      <DataGrid
        cell={() => null}
        columns={FIELDS.slice(0, 4).map((field) => field.column)}
        copyText={() => null}
        empty="No orders yet. New orders appear here as they come in."
        label="Orders, none yet"
        rowCount={0}
      />
    </div>
  );
}

const KIND_COLUMNS: readonly DataGridColumn[] = [
  { id: 'id', label: 'order', align: 'right' },
  { id: 'customer', label: 'customer' },
  { id: 'city', label: 'city', tip: 'NULL where the order has none' },
  { id: 'status', label: 'status', tip: 'Double-click to edit' },
  { id: 'product', label: 'product', tip: 'Double-click to edit, then Save or Cancel' }
];
/** The columns a double-click edits: status in a bare field, product with Save and Cancel. */
const STATUS = 3;
const PRODUCT = 4;
/** The city column, marked to show a marked column's light. */
const MARKED_COLUMNS: ReadonlySet<number> = new Set([2]);
const KIND_ROWS = ORDERS.slice(0, 8);

/**
 * A short grid with a lead checkbox, linked ids, NULL cities in a marked
 * column, edited statuses, and both inline editors: a bare field, and a
 * field with Save and Cancel.
 */
function CellKinds() {
  const [checked, setChecked] = useState<ReadonlySet<number>>(() => new Set([1, 2]));
  const [edits, setEdits] = useState<ReadonlyMap<string, string>>(
    () => new Map([[`3:${STATUS}`, 'held']])
  );
  const [editing, setEditing] = useState<{ row: number; column: number; draft: string } | null>(
    null
  );
  const [opened, setOpened] = useState('nothing');

  const cell = (row: number, column: number): DataGridCell | null => {
    const order = KIND_ROWS[row];
    if (order === undefined) return null;
    if (column === 0) {
      return { text: String(order.id), onOpen: () => setOpened(`order ${order.id}`) };
    }
    if (column === 1) return { text: order.customer };
    if (column === 2) {
      return row % 3 === 1 ? { text: 'NULL', className: 'cell-null' } : { text: order.city };
    }
    const was = column === STATUS ? order.status : order.product;
    const edited = edits.get(`${row}:${column}`);
    return edited === undefined
      ? { text: was }
      : { text: edited, className: 'cell-edited', tip: `Was ${was}; not saved yet` };
  };
  const commit = (): void => {
    if (editing === null) return;
    setEdits((current) => new Map(current).set(`${editing.row}:${editing.column}`, editing.draft));
    setEditing(null);
  };
  const field = (name: string, commitOnBlur: boolean) =>
    editing === null ? null : (
      <input
        aria-label={name}
        autoFocus
        onBlur={commitOnBlur ? commit : undefined}
        onChange={(event) => setEditing({ ...editing, draft: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setEditing(null);
        }}
        value={editing.draft}
      />
    );

  return (
    <>
      <DataGrid
        cell={cell}
        columns={KIND_COLUMNS}
        copyText={(row, column) => cell(row, column)?.text ?? null}
        editable={(_, column) => column === STATUS || column === PRODUCT}
        editor={
          editing === null
            ? null
            : {
                row: editing.row,
                column: editing.column,
                node:
                  editing.column === STATUS ? (
                    field('Status', true)
                  ) : (
                    <>
                      {field('Product', false)}
                      <Button onClick={commit} size="small" variant="primary">
                        Save
                      </Button>
                      <Button onClick={() => setEditing(null)} size="small">
                        Cancel
                      </Button>
                    </>
                  )
              }
        }
        label="Orders with every cell kind"
        leadWidth={32}
        markedColumns={MARKED_COLUMNS}
        onEdit={(row, column) => setEditing({ row, column, draft: cell(row, column)?.text ?? '' })}
        onMarkRow={(row) =>
          setChecked((current) => {
            const next = new Set(current);
            if (!next.delete(row)) next.add(row);
            return next;
          })
        }
        rowCount={KIND_ROWS.length}
        rowLead={(row) => (
          <input
            aria-label={`Check order ${KIND_ROWS[row]?.id ?? ''}`}
            checked={checked.has(row)}
            className="check"
            onChange={() =>
              setChecked((current) => {
                const next = new Set(current);
                if (!next.delete(row)) next.add(row);
                return next;
              })
            }
            onClick={(event) => event.stopPropagation()}
            type="checkbox"
          />
        )}
        rowMarked={(row) => checked.has(row)}
      />
      <code className="demo-readout">
        {checked.size} checked · {edits.size} edited · opened {opened}
      </code>
    </>
  );
}

const renumber = (sorts: readonly DataGridSortMark[]): readonly DataGridSortMark[] =>
  sorts.map((sort, index) => ({ ...sort, position: index + 1 }));
