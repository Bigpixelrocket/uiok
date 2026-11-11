/**
 * A listing of a project's files: sort by name or size, move the cursor row
 * with the arrows or the pointer, Return opens the cursor row. Two rows are
 * selected, as a multi-select draws them. Every state mark, a busy transition, selected rows,
 * a destructive hover action, and the path cell are in it. Under it, a list
 * whose rows act on a click (the pointer's hover wash, an add row) and a
 * listing with nothing in it. Then, under their own headings: strips with a
 * strip link and a pane message, a WellColumn, a pane with nothing in it,
 * marked rows in a listing wider than its box with its action column pinned,
 * and rows with no icon that take the focus themselves, one with a value cut
 * short, under a section heading drawn by a lone Strip.
 */

import {
  ArrowDownToLine,
  FileText,
  FolderOpen,
  FolderPlus,
  GitBranch,
  Plus,
  Server,
  Trash2,
  X
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ICON_MD, ICON_SM, ICON_XL } from '@bigpixelrocket/uiok/icon';
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
  Strip,
  WellColumn,
  type SortDirection,
  type StateTone
} from '@bigpixelrocket/uiok/listing';
import { PanePathBar, PaneStatus, QuietAction, RowIconAction } from '@bigpixelrocket/uiok/pane';

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

/** Icon, name, version, and the strip link's column. */
const STRIP_GRID = `var(--icon-column) minmax(0, 1fr) ${column(10)} ${column(12)}`;

const RUNTIMES = [
  { key: 'node', name: 'Node.js', version: '24.11.0' },
  { key: 'php', name: 'PHP', version: '8.4.12' }
];

const WELL_TEXT = [
  '$ npm run dev',
  '',
  '> site@1.4.0 dev',
  '> vite',
  '',
  '  VITE v7.1.0  ready in 412 ms',
  '',
  '  ➜  Local:   http://localhost:5173/',
  '  ➜  Network: use --host to expose',
  '12:04:31 [vite] hmr update /src/App.tsx',
  '12:04:40 [vite] page reload src/main.tsx'
].join('\n');

/** Wider than the 360px box it sits in, so the columns before the pinned actions scroll under them. */
const WIDE_GRID = `var(--icon-column) minmax(min(var(--pane-name-floor), 100%), 1fr) ${column(12)} ${column(16)} ${column(12)} ${column(10)} ${ACTION_COLUMN}`;

/** A variable's name and value, the value cut short past 24 characters. */
const VARIABLES_GRID = `var(--icon-column) minmax(min(var(--pane-name-floor), 100%), 1fr) ${column(24)} ${ACTION_COLUMN}`;

const VARIABLES = [
  ['NODE_ENV', 'production'],
  ['PORT', '5173'],
  ['DATABASE_URL', 'mysql://deploy@db.internal:3306/site_production'],
  ['LOG_LEVEL', 'info']
] as const;

const RELEASES = ['site', 'api', 'docs', 'worker', 'scheduler', 'mailer', 'search'];
const RELEASES_MARKED = new Set(['worker', 'scheduler']);

/** The marked rows with the cursor on the first of them; the arrows move it. */
function PinnedMarked({ onOpen }: { readonly onOpen: (what: string) => void }) {
  const { cursor, onKeyDown } = useDemoCursor(
    ['worker', ...RELEASES.filter((name) => name !== 'worker')],
    onOpen
  );
  return (
    <div className="pane demo-pane demo-pin">
      <div
        aria-label="Releases: arrows move, Return opens"
        className="pane-list"
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <RowCursorContext value={cursor}>
          <Listing
            className="pane-pin-end"
            columns={[
              { label: 'State' },
              { label: 'Branch' },
              { label: 'Commit' },
              { label: 'Size', align: 'right' },
              { label: 'Action', hidden: true }
            ]}
            grid={WIDE_GRID}
            title="Service"
          >
            {RELEASES.map((name, index) => (
              <Row
                className={RELEASES_MARKED.has(name) ? 'marked' : undefined}
                key={name}
                mark={<Server size={ICON_MD} />}
                name={name}
                onOpen={() => onOpen(name)}
                rowKey={name}
              >
                <Cell>
                  <StateMark
                    tone={index === 2 ? 'warning' : 'ready'}
                    word={index === 2 ? 'behind' : 'deployed'}
                  />
                </Cell>
                <Cell>release/1.{index + 4}</Cell>
                <Cell>{(0x9f2c41 + index * 0x1d3b).toString(16)}</Cell>
                <Cell align="right">{((index + 2) * 1.7).toFixed(1)} MB</Cell>
                <Cell className="pane-action-cell">
                  <QuietAction
                    icon={FolderOpen}
                    label={`Open ${name}`}
                    onClick={() => onOpen(name)}
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
  );
}

/** The listing page's demo. */
export function ListingDemo() {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'name',
    direction: 'asc'
  });
  const [opened, setOpened] = useState<string | null>(null);
  const [did, setDid] = useState<string | null>(null);
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
                  mark={<FileText size={ICON_MD} />}
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
                  mark={<Server size={ICON_MD} />}
                  name={server}
                  onOpen={() => setOpened(server)}
                  rowKey={server}
                />
              ))}
              <Row
                className="pane-add"
                mark={<Plus size={ICON_MD} />}
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

      <h3 className="demo-subhead">Strip link and message</h3>
      {/* A strip link heads a column: accent for an ordinary verb, danger for a destructive one. */}
      <div className="pane demo-pane demo-strip-pane">
        <div className="pane-list">
          <Listing
            columns={[
              { label: 'Version' },
              {
                label: 'Update all',
                control: (
                  <button
                    className="pane-strip-link"
                    onClick={() => setDid('updated every runtime (not really)')}
                    type="button"
                  >
                    <ArrowDownToLine aria-hidden size={ICON_SM} />
                    Update all
                  </button>
                )
              }
            ]}
            grid={STRIP_GRID}
            title="Runtimes"
          >
            {RUNTIMES.map((runtime) => (
              <Row
                key={runtime.key}
                mark={<FileText size={ICON_MD} />}
                name={runtime.name}
                rowKey={runtime.key}
              >
                <Cell>{runtime.version}</Cell>
                <Cell className="pane-action-cell">
                  <QuietAction
                    icon={ArrowDownToLine}
                    label={`Update ${runtime.name}`}
                    onClick={() => setDid(`updated ${runtime.name} (not really)`)}
                    word="Update"
                  />
                </Cell>
              </Row>
            ))}
          </Listing>
          <p className="pane-message">Updates come from the runtime's own release feed.</p>
          <Listing
            columns={[
              { label: 'Size' },
              {
                label: 'Clear',
                control: (
                  <button
                    className="pane-strip-link danger"
                    onClick={() => setDid('cleared the history (not really)')}
                    type="button"
                  >
                    Clear history
                  </button>
                )
              }
            ]}
            empty="Nothing here yet."
            grid={STRIP_GRID}
            title="History"
          />
          <p className="pane-message danger">The history file could not be read.</p>
        </div>
      </div>

      <h3 className="demo-subhead">Well</h3>
      <div className="pane demo-pane demo-well-pane">
        <WellColumn
          columns={[
            { label: 'dev.log' },
            {
              label: 'Clear',
              control: (
                <button
                  className="pane-strip-link"
                  onClick={() => setDid('cleared the output (not really)')}
                  type="button"
                >
                  Clear
                </button>
              )
            }
          ]}
          label="Output"
          title="Output"
        >
          <pre className="pane-well" tabIndex={0}>
            {WELL_TEXT}
          </pre>
        </WellColumn>
      </div>

      <h3 className="demo-subhead">Empty pane</h3>
      <div className="pane demo-pane demo-empty-pane">
        <PanePathBar trail={['Projects']}>
          <QuietAction
            icon={Plus}
            label="Add a project"
            lit
            onClick={() => setDid('add a project')}
            word="Add"
          />
        </PanePathBar>
        <div className="pane-empty">
          <FolderOpen aria-hidden size={ICON_XL} />
          <strong>No projects yet</strong>
          <p>
            Add a folder you work in, or clone one from a repository, and it shows here with its
            scripts and services.
          </p>
          <div className="pane-empty-actions">
            <Button onClick={() => setDid('add a folder')} variant="primary">
              <FolderPlus size={ICON_MD} />
              Add a Folder
            </Button>
            <Button onClick={() => setDid('clone a repository')}>
              <GitBranch size={ICON_MD} />
              Clone a Repository
            </Button>
          </div>
        </div>
        <PaneStatus>No projects</PaneStatus>
      </div>

      <h3 className="demo-subhead">Rows without icons</h3>
      {/* No mark on a row: the first label starts over the names. Each row is a Tab stop
          (focusable), the long value carries its whole text as a tip, and Unset is a
          destructive action. A lone Strip heads the section under it. */}
      <div className="pane demo-pane">
        <div className="pane-list">
          <Listing
            columns={[{ label: 'Value' }, { label: 'Action', hidden: true }]}
            grid={VARIABLES_GRID}
            title="Variable"
          >
            {VARIABLES.map(([name, value]) => (
              <Row focusable key={name} name={name} rowKey={name}>
                <Cell tip={value}>{value}</Cell>
                <Cell className="pane-action-cell">
                  <QuietAction
                    danger
                    icon={X}
                    label={`Unset ${name}`}
                    onClick={() => setDid(`unset ${name} (not really)`)}
                    word="Unset"
                  />
                </Cell>
              </Row>
            ))}
          </Listing>
          <Strip heading title="Notes" />
          <p className="pane-message">
            Values are read when a service starts; restart it to pick up a change.
          </p>
        </div>
      </div>

      <h3 className="demo-subhead">Marked rows and a pinned action</h3>
      <PinnedMarked onOpen={(name) => setDid(`opened ${name}`)} />
      <code className="demo-readout">did: {did ?? 'nothing yet'}</code>
    </div>
  );
}
