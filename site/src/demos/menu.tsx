/**
 * A filtered folder menu built from the menu parts: type to filter (try
 * `src`, `!test`, `^doc`, or `.tsx$`), ↑ ↓ move, Return picks, Escape clears
 * then closes. A keystroke that would empty the list is refused with the
 * visual bell. Folders and files sit under their own headings, two folders
 * show the chord that opens them, one folder is disabled (the cursor passes
 * over it), and a note under the list says why.
 */

import { File, Folder } from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { FilterIcon } from '@bigpixelrocket/uiok/filter';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';
import {
  matchQuery,
  menuQueryRefused,
  moveMenuCursor,
  useBellBeat
} from '@bigpixelrocket/uiok/menu';
import { MarkedText } from '@bigpixelrocket/uiok/text';

import { FILES } from './data';

/** An entry of the menu: a folder or a file, a chord for some, and one folder that cannot be opened. */
interface Entry {
  readonly id: string;
  readonly name: string;
  readonly folder: boolean;
  readonly chord?: { readonly key: string; readonly meta?: boolean; readonly shift?: boolean };
  readonly disabled?: boolean;
}

const FOLDERS: readonly Entry[] = [
  { id: 'd-src', name: 'src', folder: true, chord: { key: '1', meta: true } },
  { id: 'd-docs', name: 'docs', folder: true, chord: { key: '2', meta: true } },
  { id: 'd-public', name: 'public', folder: true },
  { id: 'd-private', name: 'private (no access)', folder: true, disabled: true },
  { id: 'd-tests', name: 'tests', folder: true }
];

const ENTRIES: readonly Entry[] = [
  ...FOLDERS,
  ...FILES.map((file) => ({
    id: file.id,
    name: file.path.replace('~/projects/site/', ''),
    folder: false
  }))
];

const rowsFor = (query: string) =>
  ENTRIES.flatMap((entry) => {
    const match = matchQuery(entry.name, query);
    return match === null ? [] : [{ entry, positions: match.positions, score: match.score }];
  }).sort((a, b) => Number(b.entry.folder) - Number(a.entry.folder) || b.score - a.score);

/** The menu itself, open under its button. */
function FolderMenu({
  onPick,
  onClose
}: {
  readonly onPick: (name: string) => void;
  readonly onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  // The cursor counts pickable rows only, so it passes over the disabled one.
  const [cursor, setCursor] = useState<number | null>(0);
  const [bell, setBell] = useState(0);
  const beat = useBellBeat(bell);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const rows = rowsFor(query);
  const pickable = rows.flatMap((row, index) => (row.entry.disabled === true ? [] : [index]));
  const cursorRow = cursor === null ? null : (pickable[cursor] ?? null);

  useEffect(() => input.current?.focus(), []);

  // The cursor's row stays in view as the arrows move it past the list's edge.
  useLayoutEffect(() => {
    if (cursorRow === null) return;
    list.current
      ?.querySelector(`[data-row="${cursorRow}"]`)
      ?.scrollIntoView?.({ block: 'nearest' });
  }, [cursorRow, query]);

  return (
    <div
      className="folder-menu demo-menu"
      data-overlay
      onMouseDown={(event) => event.target !== input.current && event.preventDefault()}
    >
      <div className={beat === null ? 'folder-menu-query' : `folder-menu-query bell-${beat}`}>
        <FilterIcon />
        <input
          aria-label="Filter files"
          onChange={(event) => {
            const next = event.target.value;
            if (menuQueryRefused(query, next, rows.length, rowsFor(next).length)) {
              setBell((count) => count + 1);
              return;
            }
            setQuery(next);
            setCursor(0);
          }}
          onKeyDown={(event) => {
            // Keys that compose a character with an input method are the method's own. Safari
            // ends the composition before the confirming Return's keydown, marked key code 229.
            if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor(moveMenuCursor(cursor, 1, pickable.length));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor(moveMenuCursor(cursor, -1, pickable.length));
            }
            if (event.key === 'Enter' && cursorRow !== null) {
              const row = rows[cursorRow];
              if (row !== undefined) onPick(row.entry.name);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              if (query === '') onClose();
              else {
                setQuery('');
                setCursor(0);
              }
            }
          }}
          placeholder="type to filter"
          ref={input}
          spellCheck={false}
          value={query}
        />
        <span className="folder-menu-count">
          {rows.length} of {ENTRIES.length}
        </span>
      </div>
      <div className="folder-menu-options" ref={list} role="listbox" aria-label="Files">
        {rows.map((row, index) => {
          const heading =
            index === 0 || rows[index - 1]?.entry.folder !== row.entry.folder
              ? row.entry.folder
                ? 'Folders'
                : 'Files'
              : null;
          const disabled = row.entry.disabled === true;
          return (
            <Fragment key={row.entry.id}>
              {heading === null ? null : (
                <div className="entry-menu-heading" role="presentation">
                  {heading}
                </div>
              )}
              <div
                aria-disabled={disabled || undefined}
                aria-selected={index === cursorRow}
                className={index === cursorRow ? 'folder-menu-option cursor' : 'folder-menu-option'}
                data-row={index}
                onClick={() => !disabled && onPick(row.entry.name)}
                onMouseMove={() => !disabled && setCursor(pickable.indexOf(index))}
                role="option"
              >
                <span className="row-icon">
                  {row.entry.folder ? <Folder size={ICON_MD} /> : <File size={ICON_MD} />}
                </span>
                <span className="row-name">
                  <MarkedText positions={row.positions} text={row.entry.name} />
                </span>
                {row.entry.chord === undefined ? null : <KeyChord chord={row.entry.chord} />}
              </div>
            </Fragment>
          );
        })}
      </div>
      <p className="folder-menu-note">Folders you cannot read are listed but cannot be opened.</p>
    </div>
  );
}

/** The menu page's demo. */
export function MenuDemo() {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string | null>(null);
  return (
    <div className="demo-stack listing-root menu-demo">
      <div className="demo-anchor">
        <Button onClick={() => setOpen((value) => !value)} size="small">
          {open ? 'Close the menu' : 'Open the menu'}
        </Button>
        {open ? (
          <FolderMenu
            onClose={() => setOpen(false)}
            onPick={(name) => {
              setPicked(name);
              setOpen(false);
            }}
          />
        ) : null}
      </div>
      <code className="demo-readout">picked: {picked ?? 'nothing yet'}</code>
    </div>
  );
}
