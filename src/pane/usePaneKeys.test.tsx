import { act, fireEvent, render, screen } from '@testing-library/react';
import { memo, Profiler, useState, useSyncExternalStore, type ReactElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Row, RowCursorContext, type RowCursor } from '../listing/Listing.js';
import { paneRow, verbControl } from './PaneKeys.js';
import { paneKeyAction, type PaneKeyAction, type TabOrder } from './PaneKeys.logic.js';
import { usePaneKeys } from './usePaneKeys.js';

/**
 * Two panes with a control of every kind Tab meets: the sidebar's path-bar
 * button, its tree (the home) holding a row's control and a filter field,
 * and its status-line button; the main pane's path-bar button, its page
 * (the home) holding a row whose control is out of the Tab order and a
 * `tabbable` row whose select and button are in it, and its log after.
 */
function Panes({
  sidebarStops,
  sidebar = true,
  held = false,
  locked = false,
  hiddenStops = false,
  tabOrder
}: {
  readonly sidebarStops: boolean;
  /** The order Tab walks the panes in. */
  readonly tabOrder?: TabOrder;
  /** The sidebar shows; false hides it, as a window does. */
  readonly sidebar?: boolean;
  /** A page held mounted out of sight comes before the front page. */
  readonly held?: boolean;
  /** A disabled fieldset's control follows Edit, refusing the focus. */
  readonly locked?: boolean;
  /**
   * A hidden input with a tabindex, and a button the stylesheet hides
   * (display: none, which jsdom does not apply), follow Manual.
   */
  readonly hiddenStops?: boolean;
}): ReactElement {
  const panes = usePaneKeys<PaneKeyAction, object>({
    shown: true,
    loaded: true,
    initialPane: sidebar ? 'sidebar' : 'main',
    page: 'page',
    sidebarKeys: ['one'],
    openKey: null,
    readVerbs: () => ({}),
    noVerbs: {},
    follows: [],
    readKey: paneKeyAction,
    cursorKey: (action) => action.kind === 'move' || action.kind === 'enter',
    run: () => undefined,
    sidebarStops,
    tabOrder
  });

  return (
    <div aria-label="View" ref={panes.rootRef} tabIndex={-1}>
      {sidebar ? (
        <aside className="pane">
          <button type="button">Refresh</button>
          <div aria-label="Tree" data-pane-home="sidebar" tabIndex={-1}>
            <div data-row-key="one">
              <button type="button">Next page</button>
            </div>
            <input aria-label="Filter" />
          </div>
          <button type="button">Collapse all</button>
        </aside>
      ) : null}
      <div className="pane" ref={panes.mainRef} tabIndex={-1}>
        <button type="button">Edit</button>
        {locked ? (
          <fieldset disabled>
            <button type="button">Locked</button>
          </fieldset>
        ) : null}
        {held ? (
          <div hidden>
            <div aria-label="Held page" data-pane-home="page" tabIndex={-1}>
              <div data-row-key="held">
                <button data-verb="enter" type="button">
                  Held
                </button>
              </div>
            </div>
          </div>
        ) : null}
        <div aria-label="Page" data-pane-home="page" tabIndex={-1}>
          <div data-row-key="first">
            <button tabIndex={-1} type="button">
              Open
            </button>
          </div>
          <div data-row-key="second">
            <select aria-label="Collation" />
            <button type="button">Manual</button>
            {hiddenStops ? (
              <>
                <input aria-label="Token" tabIndex={0} type="hidden" />
                <button type="button">Folded</button>
              </>
            ) : null}
          </div>
        </div>
        <button type="button">Log</button>
      </div>
    </div>
  );
}

/** Tab, or Shift-Tab with `back`, aimed where the focus is, as a key is; then names where it went. */
const tab = (back = false): string => {
  fireEvent.keyDown(document.activeElement ?? window, { key: 'Tab', shiftKey: back });

  return focused();
};

const focused = (): string => {
  const element = document.activeElement;

  return element?.getAttribute('aria-label') ?? element?.textContent?.trim() ?? '';
};

/** Gives the focus to the control named `name`. */
const focus = (name: string): void => {
  const control = [
    ...document.querySelectorAll<HTMLElement>('button, input, select, [tabindex]')
  ].find((element) => (element.getAttribute('aria-label') ?? element.textContent?.trim()) === name);

  control?.focus();
};

describe('usePaneKeys Tab, listing first', () => {
  it("goes from the page's listing through its controls, the ones above it included, then to the sidebar", () => {
    render(<Panes sidebarStops={false} tabOrder="listing" />);

    expect(focused()).toBe('Tree');
    const forward = ['Page', 'Edit', 'Collation', 'Manual', 'Log', 'Tree', 'Page'];
    expect(forward.map(() => tab())).toEqual(forward);
    // Shift-Tab steps back through the page to its listing, and from a
    // listing switches panes.
    focus('Collation');
    expect(tab(true)).toBe('Edit');
    expect(tab(true)).toBe('Page');
    expect(tab(true)).toBe('Tree');
    expect(tab(true)).toBe('Page');
  });

  it("walks the sidebar's controls after its listing when the view asks", () => {
    render(<Panes sidebarStops tabOrder="listing" />);

    const forward = ['Refresh', 'Filter', 'Collapse all', 'Page', 'Edit'];
    expect(forward.map(() => tab())).toEqual(forward);
    focus('Filter');
    expect(tab(true)).toBe('Refresh');
    expect(tab(true)).toBe('Tree');
  });

  it('goes on from the page listing when the view itself holds the focus, whichever pane was active', () => {
    render(<Panes sidebarStops tabOrder="listing" />);

    expect(focused()).toBe('Tree');
    focus('View');
    expect(tab()).toBe('Edit');
    focus('View');
    expect(tab(true)).toBe('Tree');
  });

  it('passes over a control a disabled fieldset holds', () => {
    render(<Panes locked sidebarStops={false} tabOrder="listing" />);

    focus('Page');
    expect(tab()).toBe('Edit');
    expect(tab()).toBe('Collation');
  });

  it('cycles through the page alone when the window hides the sidebar', () => {
    render(<Panes sidebar={false} sidebarStops={false} tabOrder="listing" />);

    expect(focused()).toBe('Page');
    expect(tab(true)).toBe('Log');
    expect(tab()).toBe('Page');
    expect(tab()).toBe('Edit');
  });
});

describe('usePaneKeys Tab past a stop that refuses the focus', () => {
  /** Makes Folded refuse the focus, as a browser does for an element the stylesheet hides. */
  const refuseFolded = (): void => {
    const folded = screen.getByRole('button', { name: 'Folded' });
    vi.spyOn(folded, 'focus').mockImplementation(() => undefined);
  };

  it.each(['document', 'listing'] as const)(
    'goes on past a hidden input and a hidden control, both ways, in %s order',
    (tabOrder) => {
      render(<Panes hiddenStops sidebar={false} sidebarStops={false} tabOrder={tabOrder} />);
      refuseFolded();
      focus('Manual');

      expect(tab()).toBe('Log');
      expect(tab(true)).toBe('Manual');
    }
  );
});

describe('usePaneKeys Tab', () => {
  it('stays in the page when the window hides the sidebar', () => {
    render(<Panes sidebar={false} sidebarStops={false} />);

    expect(focused()).toBe('Page');
    expect(tab()).toBe('Collation');
    expect(tab()).toBe('Manual');
    expect(tab()).toBe('Log');
    // The page's stops make one cycle, wrapping at either end.
    expect(tab()).toBe('Edit');
    expect(tab()).toBe('Page');
    expect(tab(true)).toBe('Edit');
    expect(tab(true)).toBe('Log');
    expect(tab(true)).toBe('Manual');
  });

  it('never reaches the home, rows, or verbs of a page held out of sight', () => {
    render(<Panes held sidebarStops={false} />);
    const main = screen.getByLabelText('Page').closest('.pane');

    expect(tab()).toBe('Page');
    expect(paneRow(main, 'held')).toBeNull();
    expect(paneRow(main, 'first')).not.toBeNull();
    expect(verbControl(main, 'enter')).toBeNull();
  });

  it('goes from the sidebar to the page either way, and through the page back to it, by default', () => {
    render(<Panes sidebarStops={false} />);

    expect(focused()).toBe('Tree');
    expect(tab()).toBe('Page');
    expect(tab()).toBe('Collation');
    expect(tab()).toBe('Manual');
    expect(tab()).toBe('Log');
    expect(tab()).toBe('Tree');
    expect(tab(true)).toBe('Page');
    expect(tab(true)).toBe('Edit');
    expect(tab(true)).toBe('Tree');

    // A sidebar control switches panes as the tree does.
    focus('Refresh');
    expect(tab()).toBe('Page');
    focus('Filter');
    expect(tab(true)).toBe('Page');
  });

  it("goes on from a row's control in the Tab order, and from the page's home for one out of it", () => {
    render(<Panes sidebarStops={false} />);

    focus('Collation');
    expect(tab()).toBe('Manual');
    expect(tab(true)).toBe('Collation');
    expect(tab(true)).toBe('Page');

    focus('Open');
    expect(tab()).toBe('Collation');
    focus('Open');
    expect(tab(true)).toBe('Edit');
  });

  it("walks the sidebar's own controls with the page's as one cycle when the view asks", () => {
    render(<Panes sidebarStops />);

    const forward = ['Filter', 'Collapse all', 'Edit', 'Page', 'Collation', 'Manual', 'Log'];
    expect(forward.map(() => tab())).toEqual(forward);
    expect(tab()).toBe('Refresh');
    expect(tab()).toBe('Tree');

    const backward = ['Refresh', 'Log', 'Manual', 'Collation', 'Page', 'Edit', 'Collapse all'];
    expect(backward.map(() => tab(true))).toEqual(backward);
    expect(tab(true)).toBe('Filter');
    expect(tab(true)).toBe('Tree');

    // A sidebar row's control is no stop: Tab goes on from the tree.
    focus('Next page');
    expect(tab()).toBe('Filter');
  });
});

/** What a cursor test counts: the view's renders, and each row drawn, by key, in order. */
interface Counts {
  space: number;
  readonly rows: string[];
}

const ROW_KEYS = Array.from({ length: 12 }, (_, index) => `r${index}`);

/**
 * A view whose page lists twelve rows, each under a `Profiler` that
 * records it whenever it draws, and whose space counts its own renders.
 * Only `r2` offers Open, so the legend's verbs change on it alone. The
 * status line says the cursor row the view read in its last render.
 */
function CursorSpace({
  counts,
  cursorInRender,
  suffix = '',
  keys = ROW_KEYS
}: {
  readonly counts: Counts;
  readonly cursorInRender?: boolean;
  readonly suffix?: string;
  /** The rows the page lists, which the view hands no `follows` entry for. */
  readonly keys?: readonly string[];
}): ReactElement {
  counts.space += 1;

  const panes = usePaneKeys<PaneKeyAction, { readonly enter: boolean }>({
    shown: true,
    loaded: true,
    initialPane: 'main',
    page: 'page',
    sidebarKeys: [],
    openKey: null,
    readVerbs: (main, cursor) => ({
      enter: verbControl(paneRow(main, cursor), 'enter') !== null
    }),
    noVerbs: { enter: false },
    follows: [],
    readKey: paneKeyAction,
    cursorKey: (action) => action.kind === 'move' || action.kind === 'enter',
    run: (action, pane) => {
      if (action.kind === 'move') panes.move(action.to, pane);
    },
    ...(cursorInRender === undefined ? {} : { cursorInRender })
  });

  return (
    <div ref={panes.rootRef}>
      <div ref={panes.mainRef} tabIndex={-1}>
        <p>offers {panes.offered.enter ? 'Open' : 'nothing'}</p>
        <p>read {panes.mainKey ?? 'none'}</p>
        <div aria-label="Page" data-pane-home="page" role="table" tabIndex={-1}>
          <RowCursorContext.Provider value={panes.rowCursor}>
            {keys.map((key) => (
              <Profiler id={key} key={key} onRender={(id) => counts.rows.push(id)}>
                <Row name={`${key}${suffix}`} rowKey={key}>
                  {key === 'r2' && (
                    <button data-verb="enter" tabIndex={-1} type="button">
                      Open
                    </button>
                  )}
                </Row>
              </Profiler>
            ))}
          </RowCursorContext.Provider>
        </div>
      </div>
    </div>
  );
}

const rowOf = (key: string): HTMLElement => {
  const row = document.querySelector<HTMLElement>(`[data-row-key="${key}"]`);

  if (row === null) throw new Error(`no row ${key}`);
  return row;
};

/** The rows wearing the cursor. */
const cursorRows = (): string[] =>
  [...document.querySelectorAll<HTMLElement>('[aria-current="true"]')].map(
    (row) => row.dataset.rowKey ?? ''
  );

/** The rows drawn since `counts` was last cleared, by key, sorted; then clears them. */
const drawn = (counts: Counts): string[] => {
  const keys = [...new Set(counts.rows)].sort();

  counts.rows.length = 0;
  return keys;
};

describe('usePaneKeys main cursor', () => {
  it('draws only the row the cursor leaves and the row it lands on where the view leaves it out of render', () => {
    const counts: Counts = { space: 0, rows: [] };

    render(<CursorSpace counts={counts} cursorInRender={false} />);
    // The active main pane stands on its first row.
    expect(cursorRows()).toEqual(['r0']);
    drawn(counts);

    const space = counts.space;

    fireEvent.pointerMove(rowOf('r5'));
    expect(cursorRows()).toEqual(['r5']);
    expect(drawn(counts)).toEqual(['r0', 'r5']);

    // The keys move the same cursor the pointer moved.
    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    expect(cursorRows()).toEqual(['r6']);
    expect(drawn(counts)).toEqual(['r5', 'r6']);

    // A move onto the cursor row tells no one.
    fireEvent.pointerMove(rowOf('r6'));
    expect(drawn(counts)).toEqual([]);
    expect(counts.space).toBe(space);
  });

  it('pages by the rows’ laid-out heights, so a row that grew is not skipped unseen', () => {
    const counts: Counts = { space: 0, rows: [] };

    render(<CursorSpace counts={counts} cursorInRender={false} />);
    // A 120px page of 40px rows (rows that hold wrapping chips): two fit past the cursor row.
    const page = screen.getByRole('table', { name: 'Page' });
    Object.defineProperty(page, 'clientHeight', { configurable: true, value: 120 });
    const rects = vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      return { height: this.hasAttribute('data-row-key') ? 40 : 0 } as DOMRect;
    });

    expect(cursorRows()).toEqual(['r0']);
    // 24px rows would page four (120 / 24 - 1); these page two.
    fireEvent.keyDown(document.activeElement ?? window, { key: 'PageDown' });
    expect(cursorRows()).toEqual(['r2']);
    rects.mockRestore();
  });

  it('reads what the row the cursor lands on offers where the view leaves it out of render', () => {
    const counts: Counts = { space: 0, rows: [] };

    render(<CursorSpace counts={counts} cursorInRender={false} />);
    expect(screen.getByText('offers nothing')).toBeTruthy();

    fireEvent.pointerMove(rowOf('r2'));
    expect(screen.getByText('offers Open')).toBeTruthy();

    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    expect(cursorRows()).toEqual(['r3']);
    expect(screen.getByText('offers nothing')).toBeTruthy();
  });

  it('draws the view on each move by default, so it reads the cursor row in render', () => {
    const counts: Counts = { space: 0, rows: [] };

    render(<CursorSpace counts={counts} />);
    expect(screen.getByText('read r0')).toBeTruthy();

    const space = counts.space;

    fireEvent.pointerMove(rowOf('r7'));
    expect(cursorRows()).toEqual(['r7']);
    expect(screen.getByText('read r7')).toBeTruthy();
    expect(counts.space).toBeGreaterThan(space);
  });

  it('still draws what the page hands its rows, the cursor kept where it was', () => {
    const counts: Counts = { space: 0, rows: [] };
    const { rerender } = render(<CursorSpace counts={counts} cursorInRender={false} />);

    fireEvent.pointerMove(rowOf('r4'));
    rerender(<CursorSpace counts={counts} cursorInRender={false} suffix=" (renamed)" />);

    expect(rowOf('r4').textContent).toBe('r4 (renamed)');
    expect(rowOf('r9').textContent).toBe('r9 (renamed)');
    expect(cursorRows()).toEqual(['r4']);
  });

  it('reads the rows again after a render that removes the cursor row where the view leaves it out of render', () => {
    const counts: Counts = { space: 0, rows: [] };
    const { rerender } = render(<CursorSpace counts={counts} cursorInRender={false} />);

    fireEvent.pointerMove(rowOf('r2'));
    expect(screen.getByText('offers Open')).toBeTruthy();

    // No `follows` entry changes: the render alone moves the cursor to the first row and reads it.
    rerender(
      <CursorSpace
        counts={counts}
        cursorInRender={false}
        keys={ROW_KEYS.filter((key) => key !== 'r2')}
      />
    );
    expect(cursorRows()).toEqual(['r0']);
    expect(screen.getByText('offers nothing')).toBeTruthy();
  });
});

/** Hands a test the way to set the rows a `LatePage` lists, which only the page itself holds. */
interface LateRows {
  set: (keys: readonly string[]) => void;
}

/**
 * A page that lists no rows until it is handed some through `rows`, as a
 * page that reads its own listing after it opens does: the rows are its
 * own state, so they come and go without a render of the view.
 */
function LatePage({ rows }: { readonly rows: LateRows }): ReactElement {
  const [keys, setKeys] = useState<readonly string[]>([]);

  rows.set = setKeys;

  return (
    <>
      {keys.map((key) => (
        <Row key={key} name={key} rowKey={key} />
      ))}
    </>
  );
}

/**
 * A view that leaves the cursor out of render and whose page reads its
 * rows on its own (`LatePage`); it says whether the page offers the arrows,
 * as a legend that offers ↑ ↓ only over rows does.
 */
function LateSpace({
  counts,
  rows
}: {
  readonly counts: Counts;
  readonly rows: LateRows;
}): ReactElement {
  counts.space += 1;

  const panes = usePaneKeys<PaneKeyAction, { readonly rows: boolean }>({
    shown: true,
    loaded: true,
    initialPane: 'main',
    page: 'page',
    sidebarKeys: [],
    openKey: null,
    readVerbs: (main) => ({ rows: main?.querySelector('[data-row-key]') != null }),
    noVerbs: { rows: false },
    readKey: paneKeyAction,
    cursorKey: (action) => action.kind === 'move' || action.kind === 'enter',
    run: (action, pane) => {
      if (action.kind === 'move') panes.move(action.to, pane);
    },
    cursorInRender: false
  });

  return (
    <div ref={panes.rootRef}>
      <div ref={panes.mainRef} tabIndex={-1}>
        <p>{panes.offered.rows ? 'offers the arrows' : 'offers no arrows'}</p>
        <div aria-label="Page" data-pane-home="page" role="table" tabIndex={-1}>
          <RowCursorContext.Provider value={panes.rowCursor}>
            <LatePage rows={rows} />
          </RowCursorContext.Provider>
        </div>
      </div>
    </div>
  );
}

describe('usePaneKeys rows a page reads on its own', () => {
  it('offers the arrows once rows arrive after the page opened, without a render of the view', async () => {
    const counts: Counts = { space: 0, rows: [] };
    const rows: LateRows = { set: () => undefined };

    render(<LateSpace counts={counts} rows={rows} />);
    expect(screen.getByRole('table', { name: 'Page' })).toBe(document.activeElement);
    expect(screen.getByText('offers no arrows')).toBeTruthy();

    await act(async () => rows.set(['a', 'b', 'c']));
    expect(screen.getByText('offers the arrows')).toBeTruthy();
    // The focused page's cursor stands on its first row, as it does on rows the view draws.
    expect(cursorRows()).toEqual(['a']);

    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    expect(cursorRows()).toEqual(['b']);
  });

  it('takes the arrows away again when a render of the page removes every row', async () => {
    const counts: Counts = { space: 0, rows: [] };
    const rows: LateRows = { set: () => undefined };

    render(<LateSpace counts={counts} rows={rows} />);
    await act(async () => rows.set(['a', 'b']));
    expect(screen.getByText('offers the arrows')).toBeTruthy();

    await act(async () => rows.set([]));
    expect(screen.getByText('offers no arrows')).toBeTruthy();

    await act(async () => rows.set(['c']));
    expect(screen.getByText('offers the arrows')).toBeTruthy();
    expect(cursorRows()).toEqual(['c']);
  });
});

/**
 * A sidebar row that follows the sidebar's cursor on its own and draws
 * again only when that or its props change, as a large tree's rows
 * do, recording each draw in `counts`; `resting` is whether the cursor
 * rests on it (`sidebarRest`).
 */
const SideRow = memo(function SideRow({
  cursor,
  rowKey,
  resting,
  counts
}: {
  readonly cursor: RowCursor;
  readonly rowKey: string;
  readonly resting: boolean;
  readonly counts: Counts;
}): ReactElement {
  counts.rows.push(rowKey);

  const current = useSyncExternalStore(cursor.subscribe, () => cursor.current() === rowKey);

  return (
    <div
      className={current ? 'cursor' : undefined}
      data-resting={resting ? '' : undefined}
      data-row-key={rowKey}
      onPointerMove={() => {
        if (!current) cursor.point(rowKey);
      }}
    >
      {rowKey}
    </div>
  );
});

const SIDE_KEYS = Array.from({ length: 12 }, (_, index) => `s${index}`);

/**
 * A view that leaves both cursors out of render, whose sidebar lists
 * `keys`, and whose space counts its own renders and says the cursor rows
 * it read.
 */
function SidebarSpace({
  counts,
  keys = SIDE_KEYS,
  openKey = null
}: {
  readonly counts: Counts;
  readonly keys?: readonly string[];
  readonly openKey?: string | null;
}): ReactElement {
  counts.space += 1;

  const panes = usePaneKeys<PaneKeyAction, object>({
    shown: true,
    loaded: true,
    initialPane: 'sidebar',
    page: 'page',
    sidebarKeys: keys,
    openKey,
    readVerbs: () => ({}),
    noVerbs: {},
    follows: [],
    readKey: paneKeyAction,
    cursorKey: (action) => action.kind === 'move' || action.kind === 'enter',
    run: (action, pane) => {
      if (action.kind === 'move') panes.move(action.to, pane);
    },
    cursorInRender: false
  });

  return (
    <div ref={panes.rootRef}>
      <aside className="pane">
        <div aria-label="Tree" data-pane-home="sidebar" tabIndex={-1}>
          {keys.map((key) => (
            <SideRow
              counts={counts}
              cursor={panes.sidebarCursor}
              key={key}
              resting={key === panes.sidebarRest}
              rowKey={key}
            />
          ))}
        </div>
      </aside>
      <div ref={panes.mainRef} tabIndex={-1}>
        <p>
          read {String(panes.sidebarKey)} and {String(panes.mainKey)}
        </p>
      </div>
    </div>
  );
}

/** The sidebar rows wearing the cursor. */
const sideCursorRows = (): string[] =>
  [...document.querySelectorAll<HTMLElement>('aside .cursor')].map(
    (row) => row.dataset.rowKey ?? ''
  );

describe('usePaneKeys sidebar cursor', () => {
  it('draws only the sidebar row the cursor leaves and the row it lands on where the view leaves it out of render', () => {
    const counts: Counts = { space: 0, rows: [] };

    render(<SidebarSpace counts={counts} />);
    // With no row moved to and none open, the cursor rests on the first.
    expect(sideCursorRows()).toEqual(['s0']);
    drawn(counts);

    const space = counts.space;

    fireEvent.pointerMove(rowOf('s5'));
    expect(sideCursorRows()).toEqual(['s5']);
    expect(drawn(counts)).toEqual(['s0', 's5']);

    // The keys move the same cursor the pointer moved.
    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    expect(sideCursorRows()).toEqual(['s6']);
    expect(drawn(counts)).toEqual(['s5', 's6']);

    // A move onto the cursor row tells no one.
    fireEvent.pointerMove(rowOf('s6'));
    expect(drawn(counts)).toEqual([]);
    expect(counts.space).toBe(space);
  });

  it("names neither pane's cursor row in render where the view leaves it out of render", () => {
    render(<SidebarSpace counts={{ space: 0, rows: [] }} />);

    fireEvent.pointerMove(rowOf('s4'));
    expect(sideCursorRows()).toEqual(['s4']);
    expect(screen.getByText('read null and null')).toBeTruthy();
  });

  it('rests on the open row the view hands in, drawing only the rows it moves between', () => {
    const counts: Counts = { space: 0, rows: [] };
    const { rerender } = render(<SidebarSpace counts={counts} />);

    drawn(counts);
    rerender(<SidebarSpace counts={counts} openKey="s3" />);
    expect(sideCursorRows()).toEqual(['s3']);
    expect(drawn(counts)).toEqual(['s0', 's3']);

    // A row moved to holds the cursor until it leaves the list; then it rests on the open row again.
    fireEvent.pointerMove(rowOf('s8'));
    expect(sideCursorRows()).toEqual(['s8']);
    rerender(
      <SidebarSpace counts={counts} keys={SIDE_KEYS.filter((key) => key !== 's8')} openKey="s3" />
    );
    expect(sideCursorRows()).toEqual(['s3']);
  });

  it('rests on the first shown row while a collapsed or filtered tree hides the open row', () => {
    const counts: Counts = { space: 0, rows: [] };
    const hidden = SIDE_KEYS.filter((key) => key !== 's3');
    const { rerender } = render(<SidebarSpace counts={counts} keys={hidden} openKey="s3" />);

    // The open row is not drawn: the cursor rests on the first row, never on nothing.
    expect(sideCursorRows()).toEqual(['s0']);
    expect(rowOf('s0').getAttribute('data-resting')).toBe('');
    // The keys walk on from there.
    fireEvent.keyDown(document.activeElement ?? window, { key: 'ArrowDown' });
    expect(sideCursorRows()).toEqual(['s1']);

    // Shown again, with no row moved to it, the open row takes the rest back.
    rerender(<SidebarSpace counts={counts} openKey="s3" />);
    expect(rowOf('s3').getAttribute('data-resting')).toBe('');
  });
});
