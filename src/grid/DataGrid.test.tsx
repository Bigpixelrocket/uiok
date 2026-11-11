import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { DataGrid } from './DataGrid.js';

/** Gives every element the viewport's height, which jsdom never lays out. */
const viewportHeight = (height: number): void => {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(height);
};

/** Makes the grid's columns overflow its well by `by` pixels, which jsdom never lays out. */
const overflowBy = (by: number): void => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(400);
  vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(400 + by);
};

/** Scrolls the grid as the wheel would, firing its scroll event. */
const scrollTo = (top: number): void => {
  const grid = screen.getByRole('grid');

  grid.scrollTop = top;
  fireEvent.scroll(grid);
};

/** The `aria-rowindex` of each row drawn, the header's 1 left out. */
const drawnRows = (): number[] =>
  [...document.querySelectorAll('[role="row"][aria-rowindex]')]
    .map((row) => Number(row.getAttribute('aria-rowindex')))
    .filter((index) => index > 1);

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the data grid', () => {
  it('draws its rows again only once a scroll leaves the rows drawn', () => {
    viewportHeight(400);

    const cell = vi.fn((row: number) => ({ text: `row ${row}` }));

    render(
      <DataGrid
        cell={cell}
        columns={[{ label: 'name' }]}
        copyText={() => null}
        label="Rows"
        rowCount={1_000}
      />
    );
    expect(Math.min(...drawnRows())).toBe(2);

    // A row down draws the rows again once, leaning ahead of the screen:
    // rows 0 to 32 rather than the 0 to 27 drawn before any scroll.
    expect(Math.max(...drawnRows())).toBe(29);
    scrollTo(22);
    expect(Math.max(...drawnRows())).toBe(34);

    const drawn = cell.mock.calls.length;

    // Three rows further, still inside what is drawn: nothing is drawn again.
    scrollTo(4 * 22);
    expect(cell.mock.calls.length).toBe(drawn);

    // Two hundred rows down: the rows there are drawn.
    scrollTo(200 * 22);
    expect(cell.mock.calls.length).toBeGreaterThan(drawn);
    expect(drawnRows()).toContain(202);
    expect(screen.getByText('row 200')).toBeTruthy();
  });

  it('draws the rows a turn uncovers before its scroll event returns', () => {
    viewportHeight(400);
    render(
      <DataGrid
        cell={(row) => ({ text: `row ${row}` })}
        columns={[{ label: 'name' }]}
        copyText={() => null}
        label="Rows"
        rowCount={1_000}
      />
    );
    // Down to row 100, drawn from row 96 leaning ahead; then six rows back up.
    scrollTo(100 * 22);
    expect(Math.min(...drawnRows())).toBe(98);

    const grid = screen.getByRole('grid');
    const scope = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
    const acting = scope.IS_REACT_ACT_ENVIRONMENT;

    // Outside act, as the browser dispatches it, so a redraw only queued would not show yet.
    scope.IS_REACT_ACT_ENVIRONMENT = false;
    try {
      grid.scrollTop = 94 * 22;
      grid.dispatchEvent(new Event('scroll'));
      expect(drawnRows()).toEqual(expect.arrayContaining([96, 97]));
    } finally {
      scope.IS_REACT_ACT_ENVIRONMENT = acting;
    }
  });

  it('says what its empty well holds only when it has no rows', () => {
    const columns = [{ label: 'name' }, { label: 'size' }];
    const { rerender } = render(
      <DataGrid
        cell={() => ({ text: 'a' })}
        columns={columns}
        copyText={() => null}
        empty="No rows match"
        label="Files"
        rowCount={0}
      />
    );
    const said = screen.getByRole('gridcell', { name: 'No rows match' });
    expect(said.getAttribute('aria-colspan')).toBe('2');
    expect(said.closest('.data-grid-body')?.classList.contains('empty')).toBe(true);

    rerender(
      <DataGrid
        cell={() => ({ text: 'a' })}
        columns={columns}
        copyText={() => null}
        empty="No rows match"
        label="Files"
        rowCount={3}
      />
    );
    expect(screen.queryByText('No rows match')).toBeNull();
  });

  it('keeps where it stood while out of layout, as in a hidden pane', () => {
    viewportHeight(400);
    render(
      <DataGrid
        cell={(row) => ({ text: `row ${row}` })}
        columns={[{ label: 'name' }]}
        copyText={() => null}
        label="Rows"
        rowCount={1_000}
      />
    );
    scrollTo(200 * 22);
    viewportHeight(0);
    scrollTo(0);
    expect(drawnRows()).toContain(202);
  });
});

describe('the data grid’s cursor, sort, and edit', () => {
  const columns = [{ label: 'name' }, { label: 'size', align: 'right' as const }];

  it('moves its cursor cell with the arrows and copies that cell’s text', () => {
    render(
      <DataGrid
        cell={(row, column) => ({ text: `${row}:${column}` })}
        columns={columns}
        copyText={(row, column) => `copied ${row}:${column}`}
        label="Files"
        rowCount={3}
      />
    );
    const grid = screen.getByRole('grid', { name: 'Files' });

    grid.focus();
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'ArrowRight' });

    const cursor = document.getElementById(grid.getAttribute('aria-activedescendant') ?? '');

    expect(cursor?.textContent).toBe('1:1');

    const setData = vi.fn();
    const event = Object.assign(new Event('copy', { bubbles: true, cancelable: true }), {
      clipboardData: { setData }
    });

    window.dispatchEvent(event);
    expect(setData).toHaveBeenCalledWith('text/plain', 'copied 1:1');
    expect(event.defaultPrevented).toBe(true);
  });

  it('asks to sort by a header, adding with Shift and removing with Option, and numbers several sorts', () => {
    const onSort = vi.fn();

    render(
      <DataGrid
        cell={() => ({ text: '' })}
        columns={columns}
        copyText={() => null}
        label="Files"
        onSort={onSort}
        rowCount={0}
        sorts={[
          { column: 0, direction: 'ascending', position: 1 },
          { column: 1, direction: 'descending', position: 2 }
        ]}
      />
    );
    const size = screen.getByRole('button', { name: /^size/ });

    fireEvent.click(size);
    fireEvent.click(size, { shiftKey: true });
    fireEvent.click(size, { altKey: true });
    expect(onSort.mock.calls).toEqual([
      [1, { add: false, remove: false }],
      [1, { add: true, remove: false }],
      [1, { add: false, remove: true }]
    ]);
    expect(
      screen.getAllByRole('columnheader').map((header) => header.getAttribute('aria-sort'))
    ).toEqual(['ascending', 'descending']);
    // The mark is the listing's chevron (descending points down) and the sort's place.
    expect(size.textContent).toBe('size2');
    expect(size.querySelector('.data-grid-arrow svg.lucide-chevron-down')).not.toBeNull();
  });

  it('draws a cell’s class and content, and runs its link on Return', () => {
    const onOpen = vi.fn();

    render(
      <DataGrid
        cell={(_row, column) =>
          column === 0
            ? { text: 'missing', className: 'cell-missing', content: <em>none</em> }
            : { text: 'open me', onOpen }
        }
        columns={columns}
        copyText={() => null}
        label="Files"
        rowCount={1}
      />
    );

    expect(screen.getByText('none').closest('[role="gridcell"]')?.className).toContain(
      'cell-missing'
    );
    expect(screen.getByRole('button', { name: 'open me' })).toBeDefined();

    const grid = screen.getByRole('grid');

    fireEvent.keyDown(grid, { key: 'ArrowDown' });
    fireEvent.keyDown(grid, { key: 'ArrowRight' });
    fireEvent.keyDown(grid, { key: 'Enter' });
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('keeps the keys on the grid after a press on a link', () => {
    render(
      <DataGrid
        cell={(row, column) =>
          column === 0 ? { text: `${row}` } : { text: `open ${row}`, onOpen: () => undefined }
        }
        columns={columns}
        copyText={() => null}
        label="Files"
        rowCount={2}
      />
    );
    const grid = screen.getByRole('grid');

    expect(fireEvent.mouseDown(screen.getByRole('button', { name: 'open 0' }))).toBe(false);
    expect(document.activeElement).toBe(grid);

    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'ArrowDown' });
    expect(
      document.getElementById(grid.getAttribute('aria-activedescendant') ?? '')?.textContent
    ).toBe('0');
  });

  it('resizes a column added after it was drawn from the width it shows', () => {
    const props = {
      cell: () => ({ text: '' }),
      copyText: () => null,
      label: 'Files',
      rowCount: 1
    };
    const { rerender } = render(<DataGrid {...props} columns={[{ label: 'name' }]} />);

    rerender(
      <DataGrid {...props} columns={[{ label: 'name' }, { label: 'a much longer heading' }]} />
    );

    const header = document.querySelector<HTMLElement>('.data-grid-header');
    const widthOfSecond = (): number =>
      parseFloat(header?.style.gridTemplateColumns.split(' ')[1] ?? '');
    const drawn = widthOfSecond();
    const handle = document.querySelectorAll<HTMLElement>('.data-grid-resize')[1];

    if (handle === undefined) throw new Error('no resize handle for the added column');
    // jsdom has no pointer capture.
    Object.defineProperty(handle, 'setPointerCapture', { value: vi.fn() });
    fireEvent.pointerDown(handle, { button: 0, clientX: 100 });
    fireEvent.pointerMove(handle, { clientX: 130 });

    expect(drawn).toBeGreaterThan(60);
    expect(widthOfSecond()).toBe(drawn + 30);
  });

  it('asks to edit an editable cell on a double-click and draws the editor where the caller says', () => {
    const onEdit = vi.fn();
    const host = document.createElement('div');

    host.className = 'app-root';
    document.body.append(host);

    const props = {
      cell: (row: number) => ({ text: `row ${row}` }),
      columns: [{ label: 'name' }],
      copyText: () => null,
      editable: () => true,
      label: 'Files',
      onEdit,
      rowCount: 2
    };
    const { rerender } = render(<DataGrid {...props} />, {
      container: host.appendChild(document.createElement('div'))
    });

    fireEvent.doubleClick(screen.getByText('row 1'));
    expect(onEdit).toHaveBeenCalledWith(1, 0);

    rerender(
      <DataGrid
        {...props}
        editor={{ row: 1, column: 0, node: <input aria-label="Edit name" /> }}
        editorContainer={(grid) => grid.closest('.app-root')}
      />
    );

    const field = screen.getByRole('textbox', { name: 'Edit name' });

    expect(field.closest('.data-grid-editor')?.parentElement).toBe(host);
    host.remove();
  });

  it('frames a scrolling well, and keeps its header one height and its right edge single', () => {
    applyStylesheets(readStylesheet('src/grid/grid.css'));
    overflowBy(40);
    render(
      <DataGrid
        cell={(row, column) => ({ text: `${row}-${column}` })}
        columns={[{ label: 'name' }, { label: 'size' }]}
        copyText={() => null}
        label="Files"
        onSort={() => undefined}
        rowCount={1}
        sort={{ column: 1, direction: 'ascending' }}
      />
    );
    const well = screen.getByRole('grid');
    const frame = well.parentElement as HTMLElement;

    // The fade masks the well; the frame, which draws the border, has none.
    expect(well.classList.contains('scroll-fade-x')).toBe(true);
    expect(frame.classList.contains('data-grid')).toBe(true);
    expect(frame.classList.contains('scroll-fade-x')).toBe(false);
    expect(declaredValues(frame, 'border')).toHaveLength(1);
    expect(declaredValues(well, 'border')).toEqual([]);

    // A sort label is a box of the row's height off the baseline, so a mark
    // never grows the header.
    const sorted = screen.getByRole('button', { name: 'size' });

    expect(sorted.querySelector('.data-grid-arrow')).not.toBeNull();
    expect(declaredValues(sorted, 'display')).toEqual(['flex']);
    expect(declaredValues(sorted, 'height')).toEqual(['var(--row-height-dense)']);

    // The last cell leaves the right edge to the frame.
    const cells = screen.getAllByRole('gridcell');

    expect(declaredValues(cells.at(-1) as Element, 'border-right-style').at(-1)).toBe('none');
    expect(declaredValues(cells[0] as Element, 'border-right-style')).toEqual([]);
  });

  it('fades its inline edges only while the columns overflow the well by the fade’s width', () => {
    const grid = (): void => {
      render(
        <DataGrid
          cell={(row, column) => ({ text: `${row}-${column}` })}
          columns={[{ label: 'name' }, { label: 'note' }]}
          copyText={() => null}
          label="Files"
          rowCount={1}
        />
      );
    };

    // A sliver of overflow scrolls without a fade, so no column's edge dims.
    overflowBy(5);
    grid();
    expect(screen.getByRole('grid').classList.contains('scroll-fade-x')).toBe(false);
    cleanup();

    overflowBy(12);
    grid();
    expect(screen.getByRole('grid').classList.contains('scroll-fade-x')).toBe(true);
  });

  it('stands an editor that holds buttons on a panel, and a bare field on the cell alone', () => {
    applyStylesheets(readStylesheet('src/grid/grid.css'));
    const grid = (node: ReactElement): HTMLElement => {
      render(
        <DataGrid
          cell={(row, column) => ({ text: `${row}-${column}` })}
          columns={[{ label: 'name' }]}
          copyText={() => null}
          editor={{ row: 0, column: 0, node }}
          label="Files"
          rowCount={1}
        />
      );
      return screen.getByRole('textbox', { name: 'Edit' });
    };

    const bare = grid(<input aria-label="Edit" />);

    expect(declaredValues(bare.parentElement as Element, 'background')).toEqual([]);
    cleanup();

    // The field sits in the caller's wrapper beside Save and Cancel.
    const wrapped = grid(
      <span>
        <input aria-label="Edit" />
        <button type="button">Save</button>
        <button type="button">Cancel</button>
      </span>
    );
    const layer = wrapped.closest('.data-grid-editor') as Element;

    expect(declaredValues(layer, 'background')).toEqual(['var(--surface)']);
    expect(declaredValues(wrapped, 'border').at(-1)).toBe('var(--line) solid var(--accent)');
  });
});
