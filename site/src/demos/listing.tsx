/**
 * A listing of a project's files: sort by name or size, move the cursor row
 * with the arrows or the pointer, Return opens the cursor row.
 */

import { FileText, FolderOpen } from 'lucide-react';
import { useState } from 'react';

import {
  ACTION_COLUMN,
  Cell,
  column,
  Listing,
  PathCell,
  Row,
  RowCursorContext,
  StateMark,
  type SortDirection,
  type StateTone
} from '@bigpixelrocket/uiok/listing';
import { QuietAction } from '@bigpixelrocket/uiok/pane';

import { useDemoCursor } from './cursor';
import { bytes, FILES, type SampleFile } from './data';

type SortKey = 'name' | 'size';

const STATES: readonly { tone: StateTone; word: string }[] = [
  { tone: 'ready', word: 'synced' },
  { tone: 'ready', word: 'synced' },
  { tone: 'warning', word: 'changed' },
  { tone: 'busy', word: 'uploading' },
  { tone: 'muted', word: 'ignored' },
  { tone: 'danger', word: 'conflict' }
];
const stateOf = (index: number) => STATES[index % STATES.length] ?? { tone: 'muted', word: '' };

const next = (direction: SortDirection): SortDirection =>
  direction === 'asc' ? 'desc' : direction === 'desc' ? null : 'asc';

/** The listing page's demo. */
export function ListingDemo() {
  const [sort, setSort] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'name',
    direction: 'asc'
  });
  const [opened, setOpened] = useState<string | null>(null);
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
                { label: 'Action', hidden: true }
              ]}
              grid={`20px minmax(0, 1fr) ${column(10)} minmax(0, 1.4fr) ${column(9)} ${ACTION_COLUMN}`}
              title="Name"
              titleSort={sortBy('name')}
            >
              {rows.map(({ file, state }) => (
                <Row
                  key={file.id}
                  mark={<FileText size={14} />}
                  name={file.name}
                  onOpen={() => open(file.id)}
                  rowKey={file.id}
                >
                  <Cell>
                    <StateMark tone={state.tone} word={state.word} />
                  </Cell>
                  <Cell>
                    <PathCell path={file.path} />
                  </Cell>
                  <Cell align="right">{bytes(file.size)}</Cell>
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
    </div>
  );
}
