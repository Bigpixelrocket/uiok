import { act, render, screen } from '@testing-library/react';
import { Profiler } from 'react';
import { Trash2 } from 'lucide-react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { ModalDialog } from '../dialog/ModalDialog.js';
import { UiokProvider } from '../labels/UiokProvider.js';
import { Palette } from '../palette/Palette.js';
import { SettingsDialog } from '../shell/SettingsDialog.js';
import {
  QuietAction,
  RowIconAction,
  RowLinkLookContext,
  type LinkLook
} from '../pane/PaneActions.js';
import { CurrentDot } from './CurrentDot.js';
import {
  Cell,
  column,
  iconLinksColumn,
  linksColumn,
  Listing,
  PathCell,
  Row,
  RowCursorContext,
  StateMark,
  Strip,
  WellColumn,
  type RowCursor
} from './Listing.js';
import { TimelineCell, TimelineScale } from './Timeline.js';
import { MarkedText } from '../text/MarkedText.js';

const styles = readStylesheet('src/styles.css');

describe('a listing column of row links', () => {
  it('keeps the icons column as it is while the links draw as icons', () => {
    expect(linksColumn('icons', column(14), ['Browse', 'Structure'])).toBe(column(14));
  });

  it('makes room for every word, its icon beside it for both, and the controls that take none', () => {
    // Each word: 10 px of padding and 7 px a character; both adds the icon and its gap.
    expect(linksColumn('text', column(4), ['Check privileges'])).toBe(
      'calc(122px + var(--pane-column-gap))'
    );
    expect(linksColumn('both', column(4), ['Edit', 'Drop'], 22)).toBe(
      'calc(132px + var(--pane-column-gap))'
    );
  });
});

describe('a column strip whose labels are wider than their columns', () => {
  it('clips each label inside its control, ending it in an ellipsis on the column’s edge', () => {
    // jsdom lays nothing out, so this reads what the shared listing styles set on each piece.
    applyStylesheets(styles);
    render(
      <div className="listing-root">
        <Strip
          columns={[
            { label: 'Collation of the table' },
            {
              label: 'Rows counted at the last analyze',
              align: 'right',
              sort: { direction: null, onSort: () => undefined }
            }
          ]}
          title="Tables of the database"
        />
      </div>
    );

    const labels = [...document.querySelectorAll<HTMLElement>('.pane-sort-label')];

    expect(labels.map((label) => label.textContent)).toEqual([
      'Tables of the database',
      'Collation of the table',
      'Rows counted at the last analyze'
    ]);
    for (const label of labels) {
      const control = label.closest('.pane-sort') as HTMLElement;

      // The control clips at its own edge, half a gutter past the column's.
      expect(getComputedStyle(control).overflow).toBe('hidden');
      expect(getComputedStyle(control).minWidth).toBe('0px');
      // The label shrinks below its text and ends in an ellipsis on the column's edge.
      expect(getComputedStyle(label).overflow).toBe('hidden');
      expect(getComputedStyle(label).minWidth).toBe('0px');
      expect(declaredValues(label, 'text-overflow')).toEqual(['ellipsis']);
    }
  });
});

describe('a listing whose row links take words', () => {
  /** The pane's width, which jsdom does not lay out. */
  let paneWidth = 0;
  let resized: () => void = () => undefined;

  beforeEach(() => {
    // A listing is as wide as the pixels its grid adds up to, and its pane is paneWidth wide.
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      return (this.style.getPropertyValue('--pane-grid').match(/\d+(?=px)/gu) ?? [])
        .map(Number)
        .reduce((sum, px) => sum + px, 0);
    });
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(() => paneWidth);
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: () => void) {
          resized = callback;
        }
        observe(): void {}
        disconnect(): void {}
      }
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  const GRIDS: Readonly<Record<LinkLook, string>> = {
    both: '20px 880px',
    text: '20px 680px',
    icons: '20px 380px'
  };

  /** How Drop draws: its icon, its word, or both. */
  const drawn = (): LinkLook => {
    const drop = screen.getByRole('button', { name: 'Drop t' });
    const word = drop.textContent === 'Drop';

    return word ? (drop.querySelector('svg') === null ? 'text' : 'both') : 'icons';
  };

  const listing = (chosen: LinkLook) => (
    <RowLinkLookContext.Provider value={chosen}>
      <Listing
        columns={[{ label: 'Action', hidden: true }]}
        grid={(look) => GRIDS[look]}
        title="Tables"
      >
        <Row name="t" rowKey="t">
          <Cell>
            <RowIconAction icon={Trash2} label="Drop t" onClick={() => undefined} word="Drop" />
          </Cell>
        </Row>
      </Listing>
    </RowLinkLookContext.Provider>
  );

  it('steps its links down to words alone, then icons, only as far as its pane needs', () => {
    paneWidth = 1000;
    const view = render(listing('both'));

    expect(drawn()).toBe('both');

    paneWidth = 800;
    act(() => resized());
    expect(drawn()).toBe('text');
    expect(screen.getByRole('table').style.getPropertyValue('--pane-grid')).toBe(GRIDS.text);

    paneWidth = 500;
    act(() => resized());
    expect(drawn()).toBe('icons');

    // A pane that widens again gets the words back.
    paneWidth = 1000;
    act(() => resized());
    expect(drawn()).toBe('both');

    // Words alone, chosen, never take the icon.
    paneWidth = 800;
    view.rerender(listing('text'));
    act(() => resized());
    expect(drawn()).toBe('text');
  });

  it('draws nothing again while a resize keeps the look, and only its own step when it changes', () => {
    let commits = 0;
    paneWidth = 500;
    render(
      <Profiler id="listing" onRender={() => (commits += 1)}>
        {listing('both')}
      </Profiler>
    );
    expect(drawn()).toBe('icons');

    // The observer's first report finds the pane as the listing was fitted to it.
    commits = 0;
    act(() => resized());
    expect(commits).toBe(0);

    // Narrower, or wider yet short of what words alone need: the icons stay, undrawn.
    paneWidth = 420;
    act(() => resized());
    paneWidth = 650;
    act(() => resized());
    expect(drawn()).toBe('icons');
    expect(commits).toBe(0);

    // Room for words alone takes them in one step, then words beside icons in one more.
    paneWidth = 760;
    act(() => resized());
    expect(drawn()).toBe('text');
    expect(commits).toBe(1);
    paneWidth = 950;
    act(() => resized());
    expect(drawn()).toBe('both');
    expect(commits).toBe(2);

    // Narrower again steps straight down to what fits.
    paneWidth = 500;
    act(() => resized());
    expect(drawn()).toBe('icons');
    expect(commits).toBe(3);
  });

  it('keeps its look while its space is out of view and lays out nothing', () => {
    let commits = 0;
    paneWidth = 800;
    render(
      <Profiler id="listing" onRender={() => (commits += 1)}>
        {listing('both')}
      </Profiler>
    );
    act(() => resized());
    expect(drawn()).toBe('text');

    commits = 0;
    paneWidth = 0;
    act(() => resized());
    paneWidth = 800;
    act(() => resized());
    expect(drawn()).toBe('text');
    expect(commits).toBe(0);
  });

  it('fits a look chosen while out of view again once shown at the same width', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      // A hidden space lays out nothing.
      if (paneWidth === 0) return 0;
      return (this.style.getPropertyValue('--pane-grid').match(/\d+(?=px)/gu) ?? [])
        .map(Number)
        .reduce((sum, px) => sum + px, 0);
    });
    paneWidth = 500;
    const view = render(listing('icons'));
    act(() => resized());

    paneWidth = 0;
    act(() => resized());
    view.rerender(listing('both'));
    paneWidth = 500;
    act(() => resized());
    expect(drawn()).toBe('icons');
  });

  it('fits a look chosen again after a resize afresh, not as it was fitted before', () => {
    paneWidth = 700;
    const view = render(listing('both'));

    expect(drawn()).toBe('text');

    // Words alone fit as chosen, and the pane grows to room for words beside icons.
    view.rerender(listing('text'));
    paneWidth = 1000;
    act(() => resized());
    expect(drawn()).toBe('text');

    view.rerender(listing('both'));
    expect(drawn()).toBe('both');
  });

  it('keeps icons that do not fit, the plainest look there is', () => {
    paneWidth = 300;
    render(listing('both'));
    expect(drawn()).toBe('icons');
  });
});

describe('listing column names', () => {
  it('uses an unsorted title label independently of the table accessible name', () => {
    render(
      <Listing title="Tracking report" titleLabel="#" columns={[]} grid="20px 4ch">
        <Row name="1" rowKey="1" />
      </Listing>
    );
    expect(screen.getByRole('table', { name: 'Tracking report' })).toBeTruthy();
    expect(screen.getByRole('columnheader').textContent).toBe('#');
  });

  it('provides the complete label on every visible header, including sortable headers', () => {
    render(
      <Listing
        title="Versions"
        titleLabel="Version number"
        titleSort={{ direction: 'asc', onSort: () => undefined }}
        columns={[
          { label: 'A long unsorted column' },
          {
            label: 'Rows examined by this query',
            sort: { direction: null, onSort: () => undefined }
          },
          { label: 'Action', hidden: true }
        ]}
        grid="20px 4ch 4ch 4ch auto"
      />
    );
    const labels = [...document.querySelectorAll<HTMLElement>('.pane-sort-label')];
    expect(labels.map((label) => label.dataset.tooltip)).toEqual([
      'Version number',
      'A long unsorted column',
      'Rows examined by this query'
    ]);
    expect(labels.every((label) => label.dataset.tooltip === label.textContent)).toBe(true);
    expect(screen.getAllByRole('columnheader').at(-1)?.textContent).toBe('Action');
  });
});

describe('a strip label that sorts', () => {
  it('is a button named by the labels, with the way it sorts as the header’s aria-sort', () => {
    const onSort = vi.fn();
    render(
      <Listing
        columns={[{ label: 'Size', align: 'right', sort: { direction: 'desc', onSort } }]}
        grid="20px 4ch 4ch"
        title="Files"
        titleSort={{ direction: null, onSort: () => undefined }}
      />
    );

    const size = screen.getByRole('button', { name: 'Sort by Size, sorted descending' });
    expect(screen.getByRole('button', { name: 'Sort by Files' })).toBeTruthy();
    expect(size.className).toBe('pane-sort sortable active');
    expect(screen.getAllByRole('columnheader').map((header) => header.ariaSort)).toEqual([
      null,
      'descending'
    ]);
    // Over numbers the arrow comes before the label, which keeps the right edge.
    expect(size.firstElementChild?.tagName.toLowerCase()).toBe('svg');

    size.click();
    expect(onSort).toHaveBeenCalledTimes(1);
  });

  it('speaks the app’s words through the provider', () => {
    render(
      <UiokProvider
        labels={{ listing: { sortBy: (column, direction) => `${column}:${direction}` } }}
      >
        <Strip
          columns={[{ label: 'Size', sort: { direction: 'asc', onSort: () => undefined } }]}
          title="Files"
        />
      </UiokProvider>
    );

    expect(screen.getByRole('button', { name: 'Size:asc' })).toBeTruthy();
  });
});

describe('a listing with no rows', () => {
  it('says so in a line under its strip instead of a table', () => {
    render(
      <Listing columns={[{ label: 'Size' }]} empty="No files" grid="20px 4ch" title="Files" />
    );

    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.getByRole('region', { name: 'Files' }).textContent).toContain('No files');
  });
});

describe('a row', () => {
  /** A cursor on `key`, which records where the rows point it. */
  const cursorOn = (key: string | null, pointed: string[]): RowCursor => ({
    current: () => key,
    subscribe: () => () => undefined,
    point: (to) => pointed.push(to)
  });

  it('wears the cursor its pane gives it and points the cursor at itself on pointer movement', () => {
    const pointed: string[] = [];
    render(
      <RowCursorContext value={cursorOn('b', pointed)}>
        <Listing columns={[]} grid="20px 1fr" title="Files">
          <Row name="a" rowKey="a" />
          <Row name="b" rowKey="b" />
        </Listing>
      </RowCursorContext>
    );
    const [a, b] = screen.getAllByRole('row').slice(1) as [HTMLElement, HTMLElement];

    expect(b.getAttribute('aria-current')).toBe('true');
    expect(b.classList.contains('cursor')).toBe(true);
    expect(a.hasAttribute('aria-current')).toBe(false);

    act(() => a.dispatchEvent(new PointerEvent('pointermove', { bubbles: true })));
    // The cursor row itself moves nothing.
    act(() => b.dispatchEvent(new PointerEvent('pointermove', { bubbles: true })));
    expect(pointed).toEqual(['a']);
  });

  it('opens on a click, but not on a press of its controls, which leave the Tab order', () => {
    const onOpen = vi.fn();
    const onDrop = vi.fn();
    render(
      <Listing columns={[{ label: 'Action', hidden: true }]} grid="20px 1fr auto" title="Tables">
        <Row name="t" onOpen={onOpen} rowKey="t">
          <Cell>
            <RowIconAction icon={Trash2} label="Drop t" onClick={onDrop} verb="remove" />
          </Cell>
        </Row>
      </Listing>
    );
    const drop = screen.getByRole('button', { name: 'Drop t' });

    drop.click();
    expect(onDrop).toHaveBeenCalledTimes(1);
    expect(onOpen).not.toHaveBeenCalled();
    expect(drop.tabIndex).toBe(-1);
    expect(drop.dataset.verb).toBe('remove');

    (screen.getAllByRole('row')[1] as HTMLElement).click();
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it('shows a host’s tip under the whole name and reads it, with its description, in the name’s cell', () => {
    render(
      <RowCursorContext value={cursorOn('a', [])}>
        <Listing columns={[]} grid="20px 1fr" title="Services">
          <Row name="postgres" nameDescription="Database" nameTip={'running · 5432'} rowKey="a" />
          <Row name="redis" nameTip="stopped" rowKey="b" />
          <Row name="mailpit" nameDescription="Mail catcher" rowKey="c" />
          <Row name="meilisearch" rowKey="d" />
        </Listing>
      </RowCursorContext>
    );
    const cell = (name: string) => screen.getByRole('cell', { name });
    const row = (name: string) => cell(name).closest('[role="row"]') as HTMLElement;

    // The tip shows at every width, under the whole name, which a cut name still reads in.
    expect(cell('postgres').dataset.tooltip).toBe('postgres\nrunning · 5432');
    expect(cell('postgres').hasAttribute('data-tooltip-cut')).toBe(false);
    // Read in the name's cell, as a table is walked: the description, then the tip.
    expect(cell('postgres').getAttribute('aria-description')).toBe('Database, running · 5432');
    expect(cell('redis').getAttribute('aria-description')).toBe('stopped');
    // A row that takes no focus carries none: its cell is where it is read.
    expect(row('postgres').hasAttribute('aria-description')).toBe(false);

    // A description alone is read, not shown: a cut name keeps its own tooltip.
    expect(cell('mailpit').getAttribute('aria-description')).toBe('Mail catcher');
    expect(cell('mailpit').dataset.tooltip).toBe('mailpit');
    expect(cell('mailpit').hasAttribute('data-tooltip-cut')).toBe(true);

    // Neither: the name as it always was, its tooltip only while cut.
    expect(cell('meilisearch').dataset.tooltip).toBe('meilisearch');
    expect(cell('meilisearch').hasAttribute('data-tooltip-cut')).toBe(true);
    expect(cell('meilisearch').hasAttribute('aria-description')).toBe(false);
    expect(row('meilisearch').hasAttribute('aria-description')).toBe(false);
  });

  it('reads the name’s description where the focus lands: a focusable or tabbable row, a radio', () => {
    render(
      <RowCursorContext value={cursorOn('a', [])}>
        <Listing columns={[]} grid="20px 1fr" title="Services">
          <Row focusable name="postgres" nameDescription="Database" nameTip="running" rowKey="a" />
          <Row name="redis" nameTip="stopped" rowKey="b" tabbable />
          <Row
            name="shop"
            nameDescription="Database"
            nameTip="utf8mb4"
            radio={{ checked: true, group: 'db', onPick: () => undefined }}
            rowKey="c"
          />
        </Listing>
      </RowCursorContext>
    );
    const rows = screen.getAllByRole('row').slice(1);
    const radio = screen.getByRole('radio', { name: 'shop' });

    expect(rows[0]?.getAttribute('aria-description')).toBe('Database, running');
    expect(rows[1]?.getAttribute('aria-description')).toBe('stopped');
    expect(radio.getAttribute('aria-description')).toBe('Database, utf8mb4');
    // The radio's cell carries it for a table's walk; the name's plain span carries no role, so none.
    expect(radio.closest('[role="cell"]')?.getAttribute('aria-description')).toBe(
      'Database, utf8mb4'
    );
    const name = screen.getByText('shop');
    expect(name.hasAttribute('aria-description')).toBe(false);
    expect(name.dataset.tooltip).toBe('shop\nutf8mb4');
  });

  it('takes a marked-up name’s words from the drawn name for the tip’s tooltip', () => {
    render(
      <RowCursorContext value={cursorOn('a', [])}>
        <Listing columns={[]} grid="20px 1fr" title="Services">
          <Row
            name={<MarkedText positions={[0, 1]} text="postgres" />}
            nameTip={'running · 5432'}
            rowKey="a"
          />
        </Listing>
      </RowCursorContext>
    );

    expect(screen.getByRole('cell', { name: 'postgres' }).dataset.tooltip).toBe(
      'postgres\nrunning · 5432'
    );
  });

  it('takes the cursor on a secondary click, then hands the click and its key to the app', () => {
    const order: string[] = [];
    const onContextMenu = vi.fn((_event: unknown, key: string) => {
      order.push(`menu ${key}`);
    });
    const cursor = cursorOn('a', []);
    render(
      <RowCursorContext value={{ ...cursor, point: (to) => order.push(`point ${to}`) }}>
        <Listing columns={[]} grid="20px 1fr" title="Files">
          <Row name="a" onContextMenu={onContextMenu} rowKey="a" />
          <Row name="b" onContextMenu={onContextMenu} rowKey="b" />
          <Row name="c" rowKey="c" />
        </Listing>
      </RowCursorContext>
    );
    const [a, b, c] = screen.getAllByRole('row').slice(1) as [
      HTMLElement,
      HTMLElement,
      HTMLElement
    ];

    const click = new MouseEvent('contextmenu', {
      bubbles: true,
      cancelable: true,
      clientX: 30,
      clientY: 40
    });
    act(() => b.dispatchEvent(click));
    // The cursor moves before the menu opens, and the browser's own menu is cancelled.
    expect(order).toEqual(['point b', 'menu b']);
    expect(click.defaultPrevented).toBe(true);
    expect(onContextMenu.mock.calls[0]?.[0]).toMatchObject({ clientX: 30, clientY: 40 });

    // The cursor row is already the cursor; a row with no handler leaves the click alone.
    act(() => a.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })));
    expect(order).toEqual(['point b', 'menu b', 'menu a']);
    const plain = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    act(() => c.dispatchEvent(plain));
    expect(plain.defaultPrevented).toBe(false);
    expect(onContextMenu).toHaveBeenCalledTimes(2);
  });

  it('keeps its controls in the Tab order when tabbable, and is a stop of its own when focusable', () => {
    render(
      <RowCursorContext value={cursorOn('a', [])}>
        <Listing columns={[]} grid="20px 1fr auto" title="Hosts">
          <Row focusable name="a" rowKey="a" tabbable>
            <Cell>
              <RowIconAction icon={Trash2} label="Remove a" onClick={() => undefined} />
            </Cell>
          </Row>
          <Row entry focusable name="b" rowKey="b" />
          <Row focusable name="c" rowKey="c" />
        </Listing>
      </RowCursorContext>
    );
    const rows = screen.getAllByRole('row').slice(1);

    expect(screen.getByRole('button', { name: 'Remove a' }).tabIndex).toBe(0);
    expect(rows.map((row) => row.tabIndex)).toEqual([0, 0, -1]);
  });

  it('draws a quiet action in a tabbable row with its word, keeping its Tab stop', () => {
    render(
      <RowCursorContext value={cursorOn('a', [])}>
        <Listing columns={[]} grid="20px 1fr auto" title="Hosts">
          <Row name="a" rowKey="a" tabbable>
            <Cell>
              <QuietAction icon={Trash2} label="Remove a" onClick={() => undefined} word="Remove" />
            </Cell>
          </Row>
        </Listing>
      </RowCursorContext>
    );
    const action = screen.getByRole('button', { name: 'Remove a' });

    // Reached by Tab, it shows what it does without a hover.
    expect(action.classList.contains('wordless')).toBe(false);
    expect(action.querySelector('.pane-act-word')?.textContent).toBe('Remove');
    expect(action.dataset.tooltip).toBeUndefined();
    expect(action.tabIndex).toBe(0);
  });
});

describe('a cell', () => {
  it('carries a cut text whole as its tooltip and description, and right-aligns numbers', () => {
    render(
      <Cell align="right" tip="12,345,678 rows">
        12M
      </Cell>
    );
    const cell = screen.getByRole('cell');

    expect(cell.className).toBe('row-meta align-right');
    expect(cell.dataset.tooltip).toBe('12,345,678 rows');
    expect(cell.getAttribute('aria-description')).toBe('12,345,678 rows');
  });

  it('carries its tone as data-tone, none without one', () => {
    render(
      <>
        <Cell tone="warning">8.4.15</Cell>
        <Cell>8.4.16</Cell>
      </>
    );
    const [toned, plain] = screen.getAllByRole('cell');

    expect((toned as HTMLElement).dataset.tone).toBe('warning');
    expect((plain as HTMLElement).hasAttribute('data-tone')).toBe(false);
  });

  it('carries the listing scope itself outside one, and not inside a dialog or a palette', () => {
    const columns = [{ label: 'Size' }];
    const { rerender } = render(<Listing columns={columns} grid="1fr" title="Lines" />);

    expect(screen.getByRole('table').className).toBe('pane-listing listing-root');

    rerender(
      <ModalDialog labelId="settings-title" onCancel={() => undefined} title="Settings">
        <Listing columns={columns} grid="1fr" title="Lines" />
      </ModalDialog>
    );
    expect(screen.getByRole('dialog').classList.contains('listing-root')).toBe(true);
    expect(screen.getByRole('table').className).toBe('pane-listing');

    rerender(
      <SettingsDialog
        groups={[
          {
            id: 'app',
            title: 'App',
            pages: [
              {
                id: 'files',
                title: 'Files',
                Icon: () => null,
                subsections: [],
                body: <Listing columns={columns} grid="1fr" title="Lines" />
              }
            ]
          }
        ]}
        onClose={() => undefined}
      />
    );
    // The Settings dialog is a ModalDialog, so its pages stand in the scope too.
    expect(screen.getByRole('dialog').classList.contains('listing-root')).toBe(true);
    expect(screen.getByRole('table').className).toBe('pane-listing');

    rerender(
      <Palette label="Add" onClose={() => undefined}>
        <Listing columns={columns} grid="1fr" title="Lines" />
      </Palette>
    );
    expect(screen.getByRole('table').className).toBe('pane-listing');
  });

  it('draws a dim row and an add row with its accent plus', () => {
    const { container } = render(
      <>
        <Row dim name="8.5" rowKey="v85" />
        <Row add name="Add service…" rowKey="add" />
      </>
    );
    const [dim, add] = container.querySelectorAll('.row');

    expect(dim?.className).toBe('row row-dim');
    expect(add?.className).toBe('row pane-add');
    expect(add?.querySelector('.row-icon svg')).not.toBe(null);
  });
});

describe('column widths', () => {
  it('sizes a column of icon links by their count and gap, with the gutter', () => {
    expect(iconLinksColumn(3, 4)).toBe('calc(74px + var(--pane-column-gap))');
    expect(iconLinksColumn(1, 4)).toBe('calc(22px + var(--pane-column-gap))');
  });
});

describe('StateMark', () => {
  it('draws a dot in its tone and its word, or a spinner for a transition', () => {
    const { container, rerender } = render(<StateMark tone="ready" word="running" />);
    const mark = container.querySelector('.pane-state') as HTMLElement;

    expect(mark.className).toBe('pane-state pane-tone-ready');
    expect(mark.textContent).toBe('running');
    expect(mark.querySelector('.pane-state-dot')?.getAttribute('aria-hidden')).toBe('true');

    rerender(<StateMark busy tone="busy" word="starting" />);
    expect(container.querySelector('.pane-state-dot')).toBeNull();
    expect(container.querySelector('svg.pane-state-busy')).not.toBeNull();
  });

  it('colours its word by its tone inside a row, in the text-safe tone of its state', () => {
    applyStylesheets(styles);
    render(
      <div className="listing-root">
        <div className="row">
          <StateMark tone="warning" word="outdated" />
          <StateMark tone="danger" word="error" />
        </div>
      </div>
    );
    const [warning, danger] = [...document.querySelectorAll('.pane-state')];

    expect(declaredValues(warning as Element, 'color')).toEqual(['var(--warning-text)']);
    expect(declaredValues(danger as Element, 'color')).toEqual(['var(--danger-text)']);
  });
});

describe('PathCell', () => {
  it('splits its path so the folders give way before the name, the whole path in its tooltip', () => {
    render(<PathCell nameClassName="kind-folder" path="/opt/homebrew/var/mysql/" />);
    const cell = screen.getByRole('cell');

    expect(cell.dataset.tooltip).toBe('/opt/homebrew/var/mysql/');
    expect([...cell.children].map((part) => [part.className, part.textContent])).toEqual([
      ['pane-path-head', '/opt/homebrew/'],
      ['pane-path-tail', 'var/'],
      ['pane-path-name kind-folder', 'mysql']
    ]);
  });
});

describe('WellColumn', () => {
  it('draws a strip over its well, a region only when named', () => {
    const { rerender } = render(
      <WellColumn columns={[{ label: 'mysql.log' }]} title="Log">
        <pre className="pane-well">ready</pre>
      </WellColumn>
    );

    expect(screen.queryByRole('region')).toBeNull();
    expect(document.querySelector('.pane-well-column')?.getAttribute('style')).toContain(
      '--pane-grid: var(--icon-column) minmax(min(var(--pane-name-floor), 100%), 1fr) auto'
    );

    rerender(
      <WellColumn columns={[]} label="Server log" title="Log">
        <pre className="pane-well">ready</pre>
      </WellColumn>
    );
    expect(screen.getByRole('region', { name: 'Server log' }).textContent).toContain('ready');
  });
});

describe('CurrentDot', () => {
  it('is named and titled by what current means', () => {
    render(<CurrentDot label="Open folder" />);
    const dot = screen.getByRole('img', { name: 'Open folder' });

    expect(dot.className).toBe('current-dot');
    expect(dot.dataset.tooltip).toBe('Open folder');
  });
});

describe('the listing’s redesign additions', () => {
  it('describes a column label by its tip, sortable or not', () => {
    render(
      <div className="listing-root">
        <Listing
          columns={[
            { label: 'Size', tip: 'On disk, in bytes' },
            {
              label: 'Rows',
              tip: 'An estimate',
              sort: { direction: null, onSort: () => undefined }
            }
          ]}
          grid="var(--icon-column) 1fr 8ch 8ch"
          title="Tables"
        />
      </div>
    );

    const size = screen.getByText('Size');
    expect(size.getAttribute('aria-description')).toBe('On disk, in bytes');
    expect(size.dataset.tooltip).toBe('On disk, in bytes');
    expect(size.hasAttribute('data-tooltip-cut')).toBe(false);

    const sort = screen.getByRole('button', { name: /Rows/ });
    expect(sort.getAttribute('aria-description')).toBe('An estimate');
    expect(screen.getByText('Rows').hasAttribute('data-tooltip')).toBe(false);
  });

  it('draws an info state, and describes a state by its tip', () => {
    render(<StateMark tip="Logged by the server at start" tone="info" word="note" />);
    const mark = screen.getByText('note').parentElement as HTMLElement;

    expect(mark.className).toBe('pane-state pane-tone-info');
    expect(mark.getAttribute('aria-description')).toBe('Logged by the server at start');
    expect(screen.getByText('note').hasAttribute('data-tooltip')).toBe(false);
  });

  it('indents a row’s name by its level', () => {
    const { container, rerender } = render(<Row level={2} name="orders" rowKey="a" />);
    const row = container.querySelector('.row') as HTMLElement;

    expect(row.style.getPropertyValue('--row-level')).toBe('2');
    rerender(<Row name="orders" rowKey="a" />);
    expect(row.style.getPropertyValue('--row-level')).toBe('');
  });

  it('washes changed and removed rows, outlines a drop target, and tones messages', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<div class="listing-root">
      <div class="row row-changed"><span class="row-name">a</span><span class="row-meta value-null">NULL</span></div>
      <div class="row row-removed"><span class="row-name">b</span></div>
      <div class="row drop-target cursor"><span class="row-name">c</span></div>
      <p class="pane-message warning">Slow query</p>
      <div class="pane-empty" role="alert"><svg></svg><strong>Failed</strong></div>
      <div class="pane-summary"><div class="notice"><p class="notice-text">x</p></div></div>
    </div>`;
    const get = (selector: string): Element => document.querySelector(selector) as Element;

    expect(declaredValues(get('.row-changed'), '--row-fill').at(-1)).toBe('var(--warning-wash)');
    expect(declaredValues(get('.row-changed'), '--row-bar').at(-1)).toBe('var(--warning)');
    expect(declaredValues(get('.row-removed'), '--row-fill').at(-1)).toBe('var(--danger-wash)');
    expect(declaredValues(get('.row-removed .row-name'), 'text-decoration').at(-1)).toBe(
      'line-through'
    );
    expect(declaredValues(get('.drop-target'), 'box-shadow').at(-1)).toBe(
      'inset 0 0 0 var(--line-strong) var(--accent)'
    );
    expect(declaredValues(get('.value-null'), 'font-style').at(-1)).toBe('italic');
    expect(declaredValues(get('.pane-message.warning'), 'color').at(-1)).toBe('var(--text)');
    expect(declaredValues(get('.pane-empty > svg'), 'color').at(-1)).toBe('var(--danger)');
    expect(declaredValues(get('.pane-summary .notice-text'), 'white-space').at(-1)).toBe('nowrap');
    document.body.innerHTML = '';
  });

  it('draws an invalid filter field’s foot and focus edge in the danger tone', () => {
    applyStylesheets(styles);
    document.body.innerHTML = `<div class="listing-root"><label class="filter-field">
      <span class="filter-icon"></span><input aria-invalid="true"></label></div>`;
    const field = document.querySelector('.filter-field') as Element;

    expect(declaredValues(field, 'border-bottom-color').at(-1)).toBe('var(--danger)');
    expect(declaredValues(document.querySelector('.filter-icon') as Element, 'color').at(-1)).toBe(
      'var(--danger)'
    );
    document.body.innerHTML = '';
  });
});

describe('row states and cell kinds as props', () => {
  it('draws selected, marked, changed, removed, and emphasised rows, and action, hover, and missing cells', () => {
    const { container } = render(
      <>
        <Row name="a" rowKey="a" selected>
          <Cell kind="action">Open</Cell>
          <Cell kind="hover">x</Cell>
          <Cell missing>NULL</Cell>
        </Row>
        <Row marked name="b" rowKey="b" />
        <Row change="changed" name="c" rowKey="c" />
        <Row change="removed" emphasis name="d" rowKey="d" />
      </>
    );
    const [a, b, c, d] = container.querySelectorAll('.row');

    expect(a?.className).toBe('row selected');
    expect(a?.getAttribute('aria-selected')).toBe('true');
    expect([...(a?.querySelectorAll('.row-meta') ?? [])].map((cell) => cell.className)).toEqual([
      'row-meta pane-action-cell',
      'row-meta pane-hover-cell',
      'row-meta value-null'
    ]);
    expect(b?.className).toBe('row marked');
    expect(c?.className).toBe('row row-changed');
    expect(d?.className).toBe('row row-removed row-emphasis');
  });
});

describe('TimelineCell', () => {
  it('places its bar and wait on the shared scale, named by its label', () => {
    render(
      <>
        <TimelineCell
          emphasis
          end={2.7}
          label="began at 1.9 s, took 0.8 s"
          max={3}
          start={1.9}
          waited
        />
        <TimelineScale
          max={3}
          ticks={[
            { at: 0, label: '0 s' },
            { at: 1.5, label: '1.5 s' }
          ]}
        />
      </>
    );
    const cell = screen.getByRole('cell', { name: 'began at 1.9 s, took 0.8 s' });

    expect(cell.className).toBe('row-meta timeline-cell');
    expect(cell.dataset.emphasis).toBe('true');
    expect(cell.style.getPropertyValue('--timeline-start')).toMatch(/^63\.33/);
    expect(cell.style.getPropertyValue('--timeline-end')).toBe('90%');
    expect(cell.querySelector('.timeline-wait')).not.toBe(null);
    expect(cell.dataset.tooltip).toBe('began at 1.9 s, took 0.8 s');
    // Its name already says it; a description would read the same words twice.
    expect(cell.hasAttribute('aria-description')).toBe(false);
    const ticks = [...document.querySelectorAll('.timeline-tick')] as HTMLElement[];
    expect(ticks.map((tick) => tick.style.getPropertyValue('--timeline-at'))).toEqual([
      '0%',
      '50%'
    ]);
  });

  it('clamps a span to its scale and never ends before it starts', () => {
    render(<TimelineCell end={1} label="late" max={4} start={5} />);
    const cell = screen.getByRole('cell', { name: 'late' });

    expect(cell.style.getPropertyValue('--timeline-start')).toBe('100%');
    expect(cell.style.getPropertyValue('--timeline-end')).toBe('100%');
    expect(cell.querySelector('.timeline-wait')).toBe(null);
  });
});
