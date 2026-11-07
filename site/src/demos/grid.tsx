/**
 * A grid of ten thousand orders: click into it and arrow around, ⌘ and an
 * arrow jumps to an edge, Page Up and Down move a screen, Space marks a
 * row, a header click sorts (Shift adds a column), a header edge resizes,
 * and a header drags to reorder.
 */

import { useMemo, useState } from 'react';

import { DataGrid, type DataGridColumn, type DataGridSortMark } from '@bigpixelrocket/uiok/grid';

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
    </div>
  );
}

const renumber = (sorts: readonly DataGridSortMark[]): readonly DataGridSortMark[] =>
  sorts.map((sort, index) => ({ ...sort, position: index + 1 }));
