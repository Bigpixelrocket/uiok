/**
 * A filtered folder menu built from the menu parts: type to filter (try
 * `src`, `!test`, `^doc`, or `.tsx$`), ↑ ↓ move, Return picks, Escape clears
 * then closes. A keystroke that would empty the list is refused with the
 * visual bell. Folders and files sit under their own headings, two folders
 * show the chord that opens them, and one folder is disabled (the cursor
 * passes over it; its tooltip says why). Beside it, a compact menu of a
 * row's short commands, as a tool opens one (`.folder-menu-compact`), with
 * the desktop menu's other looks: a row that opens a submenu, a checked
 * setting, a disabled command, and plain separators. Under them, `Menu`
 * itself: Actions drops one from its button, and a secondary click on the
 * box opens the same menu at the pointer. Last, a pane of files: a
 * secondary click on a file moves the cursor to it and opens its menu, whose
 * Copy As opens a submenu (→ or the pointer opens it, ← or Escape closes
 * it), and one on the pane's empty space opens the pane's own menu. From
 * the keys: click the list, ↑ ↓ move the cursor, and the Menu key or
 * Shift-F10 opens the cursor file's menu under it.
 */

import {
  ClipboardPaste,
  Copy,
  Eye,
  File,
  Folder,
  FolderOpen,
  FolderPlus,
  PenLine,
  Trash2
} from 'lucide-react';
import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { FilterIcon } from '@bigpixelrocket/uiok/filter';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { KeyChord } from '@bigpixelrocket/uiok/keychord';
import { Cell, Listing, Row, RowCursorContext } from '@bigpixelrocket/uiok/listing';
import {
  Menu,
  matchQuery,
  menuQueryRefused,
  moveMenuCursor,
  useBellBeat,
  type MenuEntry
} from '@bigpixelrocket/uiok/menu';
import { PaneBox, PaneList } from '@bigpixelrocket/uiok/pane';
import { MarkedText } from '@bigpixelrocket/uiok/text';

import { useDemoCursor } from './cursor';
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
                title={disabled ? 'You cannot read this folder' : undefined}
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
    </div>
  );
}

/** A row's short commands, each with the chord that runs it or the look a desktop menu gives it. */
const COMMANDS: readonly {
  readonly name: string;
  readonly icon: typeof File;
  readonly chord?: { readonly key: string; readonly meta?: boolean; readonly alt?: boolean };
  /** Opens a submenu: the row ends in a chevron instead of a chord. */
  readonly submenu?: boolean;
  /** A setting the row turns on and off, shown by a check mark while on. */
  readonly checked?: boolean;
  readonly disabled?: boolean;
  /** A separator above the row. */
  readonly group?: boolean;
}[] = [
  { name: 'Open', icon: FolderOpen, chord: { key: 'o', meta: true } },
  { name: 'Open With', icon: FolderOpen, submenu: true },
  { name: 'Rename', icon: PenLine, chord: { key: 'Enter' }, group: true },
  { name: 'Duplicate', icon: Copy, chord: { key: 'd', meta: true } },
  { name: 'Paste', icon: ClipboardPaste, chord: { key: 'v', meta: true }, disabled: true },
  { name: 'Show Hidden Files', icon: Eye, checked: true, group: true },
  { name: 'Move to Trash', icon: Trash2, chord: { key: 'Backspace', meta: true }, group: true }
];

/** The commands the cursor can stand on, in order. */
const PICKABLE = COMMANDS.flatMap((command, index) => (command.disabled === true ? [] : [index]));

/**
 * A compact menu of short commands opened from a tool: the same parts at the
 * small size (`.folder-menu-compact`), with no query row. ↑ ↓ move (over the
 * disabled row), Return runs, Escape closes.
 */
function CommandMenu({
  onPick,
  onClose
}: {
  readonly onPick: (name: string) => void;
  readonly onClose: () => void;
}) {
  const [cursor, setCursor] = useState(0);
  const cursorRow = PICKABLE[cursor] ?? 0;
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => list.current?.focus(), []);
  return (
    <div
      className="folder-menu folder-menu-compact demo-menu"
      data-overlay
      onKeyDown={(event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setCursor(
            (current) =>
              moveMenuCursor(current, event.key === 'ArrowDown' ? 1 : -1, PICKABLE.length) ?? 0
          );
        }
        if (event.key === 'Enter') onPick(COMMANDS[cursorRow]?.name ?? '');
        if (event.key === 'Escape') onClose();
      }}
    >
      <div
        aria-activedescendant={`demo-command-${cursorRow}`}
        aria-label="Row commands"
        className="folder-menu-options"
        ref={list}
        role="listbox"
        tabIndex={-1}
      >
        {COMMANDS.map(({ name, icon: Icon, chord, submenu, checked, disabled, group }, index) => (
          <Fragment key={name}>
            {group === true ? <div className="folder-menu-separator" role="presentation" /> : null}
            <div
              aria-checked={checked}
              aria-disabled={disabled}
              aria-haspopup={submenu === true ? 'menu' : undefined}
              aria-selected={index === cursorRow}
              className={index === cursorRow ? 'folder-menu-option cursor' : 'folder-menu-option'}
              id={`demo-command-${index}`}
              onClick={() => disabled !== true && onPick(name)}
              onMouseMove={() => disabled !== true && setCursor(PICKABLE.indexOf(index))}
              role="option"
            >
              <span className="row-icon">
                <Icon size={ICON_MD} />
              </span>
              <span className="row-name">{name}</span>
              {chord === undefined ? null : <KeyChord chord={chord} />}
            </div>
          </Fragment>
        ))}
      </div>
    </div>
  );
}

/** `Menu`'s entries: verbs with chords, a disabled one, a separator, a heading, a destructive one, and a setting. */
const ACTIONS: readonly MenuEntry[] = [
  { id: 'open', label: 'Open', icon: FolderOpen, chord: { key: 'o', meta: true } },
  { id: 'copy', label: 'Copy Path', icon: Copy, chord: { key: 'c', meta: true, alt: true } },
  { id: 'paste', label: 'Paste', icon: ClipboardPaste, disabled: true, tip: 'Nothing copied yet' },
  { kind: 'separator' },
  { kind: 'heading', label: 'View' },
  { id: 'hidden', label: 'Show Hidden Files', icon: Eye, checked: true },
  { kind: 'separator' },
  {
    id: 'trash',
    label: 'Move to Trash',
    icon: Trash2,
    danger: true,
    chord: { key: 'Backspace', meta: true }
  }
];

/** `Menu` dropped from a button, and opened at a secondary click's point. */
function ActionsMenuDemo({ onPick }: { readonly onPick: (name: string) => void }) {
  const [anchor, setAnchor] = useState<HTMLButtonElement | null>(null);
  const [where, setWhere] = useState<'anchor' | { x: number; y: number } | null>(null);
  const close = (by: 'keyboard' | 'pointer') => {
    setWhere(null);
    if (by === 'keyboard') anchor?.focus();
  };
  return (
    <div className="demo-row">
      <Button
        aria-expanded={where === 'anchor'}
        aria-haspopup="menu"
        onClick={() => setWhere((value) => (value === 'anchor' ? null : 'anchor'))}
        ref={setAnchor}
        size="small"
      >
        Actions
      </Button>
      <div
        className="demo-context-target"
        onContextMenu={(event) => {
          event.preventDefault();
          setWhere({ x: event.clientX, y: event.clientY });
        }}
      >
        Secondary-click here
      </div>
      {where === null ? null : (
        <Menu
          anchor={where === 'anchor' ? anchor : null}
          at={where === 'anchor' ? undefined : where}
          compact
          entries={ACTIONS}
          label="Actions"
          onClose={close}
          onPick={(id) => {
            onPick(id);
            close('keyboard');
          }}
        />
      )}
    </div>
  );
}

/** The files in the pane, by name, each with its size. */
const PANE_FILES: readonly (readonly [string, string])[] = [
  ['README.md', '4 KB'],
  ['package.json', '2 KB'],
  ['vite.config.ts', '1 KB'],
  ['index.html', '1 KB']
];

/** A file's menu: its verbs, Copy As with its submenu, and a destructive one. */
const FILE_MENU: readonly MenuEntry[] = [
  { id: 'open', label: 'Open', icon: FolderOpen, chord: { key: 'o', meta: true } },
  {
    kind: 'submenu',
    id: 'copy-as',
    label: 'Copy As',
    icon: Copy,
    entries: [
      { id: 'copy-path', label: 'Path', chord: { key: 'c', meta: true, alt: true } },
      { id: 'copy-relative', label: 'Relative Path' },
      { id: 'copy-url', label: 'File URL' },
      { kind: 'separator' },
      { id: 'copy-name', label: 'Name' }
    ]
  },
  { id: 'rename', label: 'Rename', icon: PenLine, chord: { key: 'Enter' } },
  { kind: 'separator' },
  { id: 'trash', label: 'Move to Trash', icon: Trash2, danger: true }
];

/** The pane's own menu, for a secondary click on no file. */
const PANE_MENU: readonly MenuEntry[] = [
  {
    id: 'new-folder',
    label: 'New Folder',
    icon: FolderPlus,
    chord: { key: 'n', meta: true, shift: true }
  },
  { id: 'paste', label: 'Paste', icon: ClipboardPaste, disabled: true, tip: 'Nothing copied yet' },
  { kind: 'separator' },
  { id: 'hidden', label: 'Show Hidden Files', icon: Eye, checked: true }
];

/**
 * A pane of files whose rows and empty space each open their own `Menu` on
 * a secondary click: the row's moves the cursor to it first, and the pane's
 * takes only a click no row took. The list is the pane's home, so the Menu
 * key or Shift-F10 there opens the cursor row's menu, placed under the row.
 */
function FilePaneDemo({ onPick }: { readonly onPick: (name: string) => void }) {
  const { cursor, onKeyDown } = useDemoCursor(PANE_FILES.map(([name]) => name));
  const [open, setOpen] = useState<{
    readonly file: string | null;
    readonly at: { readonly x: number; readonly y: number };
  } | null>(null);
  const list = useRef<HTMLDivElement>(null);
  const close = (by: 'keyboard' | 'pointer') => {
    setOpen(null);
    if (by === 'keyboard') list.current?.focus();
  };
  return (
    <PaneBox
      label="Files"
      onContextMenu={(event) => setOpen({ file: null, at: { x: event.clientX, y: event.clientY } })}
    >
      <PaneList
        home
        label="Files: secondary-click a file or the space under them, or press the Menu key for the cursor file"
        onKeyDown={onKeyDown}
        ref={list}
      >
        <RowCursorContext value={cursor}>
          <Listing columns={[{ label: 'Size', align: 'right' }]} grid="20px 1fr auto" title="Files">
            {PANE_FILES.map(([name, size]) => (
              <Row
                key={name}
                mark={<File size={ICON_MD} />}
                name={name}
                onContextMenu={(event, key) =>
                  setOpen({ file: key, at: { x: event.clientX, y: event.clientY } })
                }
                rowKey={name}
              >
                <Cell align="right">{size}</Cell>
              </Row>
            ))}
          </Listing>
        </RowCursorContext>
      </PaneList>
      {open === null ? null : (
        <Menu
          at={open.at}
          compact
          entries={open.file === null ? PANE_MENU : FILE_MENU}
          label={open.file ?? 'Files'}
          onClose={close}
          onPick={(id) => {
            onPick(open.file === null ? id : `${id} ${open.file}`);
            close('keyboard');
          }}
        />
      )}
    </PaneBox>
  );
}

/** The menu page's demo. */
export function MenuDemo() {
  const [open, setOpen] = useState<'files' | 'commands' | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const pick = (name: string) => {
    setPicked(name);
    setOpen(null);
  };
  return (
    <div className="demo-stack listing-root menu-demo">
      <div className="demo-row">
        <div className="demo-anchor">
          <Button
            onClick={() => setOpen((value) => (value === 'files' ? null : 'files'))}
            size="small"
          >
            {open === 'files' ? 'Close the menu' : 'Open the menu'}
          </Button>
          {open === 'files' ? <FolderMenu onClose={() => setOpen(null)} onPick={pick} /> : null}
        </div>
        <div className="demo-anchor end">
          <Button
            onClick={() => setOpen((value) => (value === 'commands' ? null : 'commands'))}
            size="small"
          >
            {open === 'commands' ? 'Close the compact menu' : 'Open the compact menu'}
          </Button>
          {open === 'commands' ? <CommandMenu onClose={() => setOpen(null)} onPick={pick} /> : null}
        </div>
      </div>
      <ActionsMenuDemo onPick={setPicked} />
      <FilePaneDemo onPick={setPicked} />
      <code className="demo-readout">picked: {picked ?? 'nothing yet'}</code>
    </div>
  );
}
