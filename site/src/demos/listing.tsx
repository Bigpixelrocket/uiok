/**
 * A listing of a project's files: sort by name or size, move the cursor row
 * with the arrows or the pointer, Return opens the cursor row. Two rows are
 * selected, as a multi-select draws them. Every state mark, a busy transition, selected rows,
 * a destructive hover action, and the path cell are in it. Under it, a list
 * whose rows act on a click (the pointer's hover wash, an add row) and a
 * listing with nothing in it.
 */

import { FileText, FolderOpen, Plus, Server, Trash2 } from 'lucide-react';
import { useState } from 'react';

import {
  ACTION_COLUMN,
  Cell,
  column,
  iconLinksColumn,
  Listing,
  PathCell,
  Row,
  RowCursorContext,
  StateMark,
  type SortDirection,
  type StateTone
} from '@bigpixelrocket/uiok/listing';
import { QuietAction, RowIconAction } from '@bigpixelrocket/uiok/pane';

import { useDemoCursor } from './cursor';
import { bytes, FILES, type SampleFile } from './data';

type SortKey = 'name' | 'size';

const STATES: readonly { tone: StateTone; word: string; busy?: boolean }[] = [
  { tone: 'ready', word: 'synced' },
  { tone: 'ready', word: 'synced' },
  { tone: 'warning', word: 'changed' },
  { tone: 'busy', word: 'uploading' },
  { tone: 'muted', word: 'ignored' },
  { tone: 'danger', word: 'conflict' },
  { tone: 'busy', word: 'checking', busy: true }
];
const stateOf = (index: number) => STATES[index % STATES.length] ?? { tone: 'muted', word: '' };

const next = (direction: SortDirection): SortDirection =>
  direction === 'asc' ? 'desc' : direction === 'desc' ? null : 'asc';

/** The name keeps 14 characters before the other columns give way; a narrower pane scrolls. */
const GRID = `var(--icon-column) minmax(14ch, 1fr) ${column(12)} minmax(0, 1.4fr) ${column(9)} ${iconLinksColumn(1, 0)} ${ACTION_COLUMN}`;

const SERVERS = ['local', 'staging', 'production'];

/** The listing page's demo. */
export function ListingDemo() {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'name',
    direction: 'asc'
  });
  const [opened, setOpened] = useState<string | null>(null);
  const selected = new Set(FILES.slice(1, 3).map((file) => file.id));
  const files = FILES.slice(0, 14).map((file, index) => ({ file, state: stateOf(index) }));
  const order = (a: SampleFile, b: SampleFile) =>
    sort.key === 'name' ? a.name.localeCompare(b.name) : a.size - b.size;
  const rows =
    sort.direction === null
      ? files
      : [...files].sort((a, b) => (sort.direction === 'asc' ? 1 : -1) * order(a.file, b.file));
  const keys = rows.map((row) => row.file.id);
  const open = (key: string) => setOpened(FILES.find((file) => file.id === key)?.path ?? null);
  const { cursor, onKeyDown } = useDemoCursor(keys, open);
  const sortBy = (key: SortKey) => ({
    direction: sort.key === key ? sort.direction : null,
    onSort: () => setSort({ key, direction: sort.key === key ? next(sort.direction) : 'asc' })
  });

  return (
    <div className="demo-stack listing-root">
      <div className="pane demo-pane">
        <div
          aria-label="Files: arrows move, Return opens"
          className="pane-list demo-scroll"
          onKeyDown={onKeyDown}
          tabIndex={0}
        >
          <RowCursorContext value={cursor}>
            <Listing
              columns={[
                { label: 'State' },
                { label: 'Path' },
                { label: 'Size', align: 'right', sort: sortBy('size') },
                { label: 'Remove', hidden: true },
                { label: 'Action', hidden: true }
              ]}
              grid={GRID}
              title="Name"
              titleSort={sortBy('name')}
            >
              {rows.map(({ file, state }) => (
                <Row
                  className={selected.has(file.id) ? 'selected' : undefined}
                  key={file.id}
                  mark={<FileText size={14} />}
                  name={file.name}
                  onOpen={() => open(file.id)}
                  rowKey={file.id}
                >
                  <Cell>
                    <StateMark busy={state.busy} tone={state.tone} word={state.word} />
                  </Cell>
                  {/* PathCell is the cell: it draws its own `.row-meta`. */}
                  <PathCell path={file.path} />
                  <Cell align="right">{bytes(file.size)}</Cell>
                  <Cell className="pane-hover-cell">
                    <RowIconAction
                      danger
                      icon={Trash2}
                      label={`Remove ${file.name}`}
                      onClick={() => setOpened(`removed ${file.name} (not really)`)}
                    />
                  </Cell>
                  <Cell className="pane-action-cell">
                    <QuietAction
                      icon={FolderOpen}
                      label={`Open ${file.name}`}
                      onClick={() => open(file.id)}
                      verb="enter"
                      word="Open"
                    />
                  </Cell>
                </Row>
              ))}
            </Listing>
          </RowCursorContext>
        </div>
      </div>
      <code className="demo-readout">opened: {opened ?? 'nothing yet'}</code>
      <div className="demo-row">
        <div className="pane demo-pane" style={{ flex: 1 }}>
          {/* Rows that act on a click: the pointer's hover wash, then an add row. */}
          <div aria-label="Servers" className="pane-list pointer">
            <Listing columns={[]} grid="var(--icon-column) minmax(0, 1fr)" title="Servers">
              {SERVERS.map((server) => (
                <Row
                  key={server}
                  mark={<Server size={14} />}
                  name={server}
                  onOpen={() => setOpened(server)}
                  rowKey={server}
                />
              ))}
              <Row
                className="pane-add"
                mark={<Plus size={14} />}
                name="Add server…"
                onOpen={() => setOpened('add a server')}
                rowKey="add"
              />
            </Listing>
          </div>
        </div>
        <div className="pane demo-pane" style={{ flex: 1 }}>
          <div aria-label="Trash" className="pane-list">
            <Listing
              columns={[{ label: 'Size', align: 'right' }]}
              empty="The trash is empty."
              grid={`var(--icon-column) minmax(0, 1fr) ${column(9)}`}
              title="Trash"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
