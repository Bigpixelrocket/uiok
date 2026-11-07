/**
 * A filtered folder menu built from the menu parts: type to filter (try
 * `src`, `!test`, `^doc`, or `.tsx$`), ↑ ↓ move, Return picks, Escape clears
 * then closes. A keystroke that would empty the list is refused with the
 * visual bell.
 */

import { Folder } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { FilterIcon } from '@bigpixelrocket/uiok/filter';
import {
  matchQuery,
  menuQueryRefused,
  moveMenuCursor,
  useBellBeat
} from '@bigpixelrocket/uiok/menu';
import { MarkedText } from '@bigpixelrocket/uiok/text';

import { FILES } from './data';

const ITEMS = FILES.map((file) => ({
  id: file.id,
  name: file.path.replace('~/projects/site/', '')
}));

const rowsFor = (query: string) =>
  ITEMS.flatMap((item) => {
    const match = matchQuery(item.name, query);
    return match === null ? [] : [{ item, positions: match.positions, score: match.score }];
  }).sort((a, b) => b.score - a.score);

/** The menu itself, open under its button. */
function FolderMenu({
  onPick,
  onClose
}: {
  readonly onPick: (name: string) => void;
  readonly onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<number | null>(0);
  const [bell, setBell] = useState(0);
  const beat = useBellBeat(bell);
  const input = useRef<HTMLInputElement>(null);
  const rows = rowsFor(query);

  useEffect(() => input.current?.focus(), []);

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
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setCursor(moveMenuCursor(cursor, 1, rows.length));
            }
            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setCursor(moveMenuCursor(cursor, -1, rows.length));
            }
            if (event.key === 'Enter' && cursor !== null) {
              const row = rows[cursor];
              if (row !== undefined) onPick(row.item.name);
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
          ref={input}
          spellCheck={false}
          value={query}
        />
        <span className="folder-menu-count">
          {rows.length}/{ITEMS.length}
        </span>
      </div>
      <div className="folder-menu-options" role="listbox" aria-label="Files">
        {rows.map((row, index) => (
          <div
            aria-selected={index === cursor}
            className={index === cursor ? 'folder-menu-option cursor' : 'folder-menu-option'}
            key={row.item.id}
            onClick={() => onPick(row.item.name)}
            onMouseMove={() => setCursor(index)}
            role="option"
          >
            <span className="row-icon">
              <Folder size={14} />
            </span>
            <span className="row-name">
              <MarkedText positions={row.positions} text={row.item.name} />
            </span>
          </div>
        ))}
      </div>
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
