/**
 * A command palette over the library's palette frame and menu parts: a
 * filtered list of commands, a cursor the arrows move, and Return to run.
 * The shell uses it to find a page; the palette page uses it as its demo.
 */

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { matchQuery, menuQueryRefused, moveMenuCursor } from '@bigpixelrocket/uiok/menu';
import { Palette, PaletteQuery } from '@bigpixelrocket/uiok/palette';
import { MarkedText } from '@bigpixelrocket/uiok/text';

/** One command the palette lists. */
export interface Command {
  readonly id: string;
  readonly label: string;
  /** A dim sentence after the label. */
  readonly hint?: string;
  readonly icon?: ReactNode;
  /** Drawn at the row's end, such as a chord's glyphs. */
  readonly meta?: string;
  readonly run: () => void;
}

/** Props for {@link CommandPalette}. */
export interface CommandPaletteProps {
  readonly label: string;
  readonly placeholder: string;
  readonly commands: readonly Command[];
  /** Called on Escape, a press outside, and after a command runs. */
  readonly onClose: () => void;
}

/** The commands a query keeps, best match first. */
function rowsFor(commands: readonly Command[], query: string) {
  return commands
    .flatMap((command) => {
      const match = matchQuery(command.label, query);
      return match === null ? [] : [{ command, ...match }];
    })
    .sort((a, b) => b.score - a.score);
}

/** A modal command palette; render it inside `.listing-root`. */
export function CommandPalette({ label, placeholder, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<number | null>(0);
  const [bell, setBell] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = rowsFor(commands, query);

  useLayoutEffect(() => inputRef.current?.focus(), []);

  const run = (command: Command) => {
    onClose();
    command.run();
  };

  return (
    <Palette label={label} onClose={onClose}>
      <PaletteQuery
        activeId={cursor === null ? undefined : `${listId}-${cursor}`}
        bell={bell}
        count={query === '' ? null : `${rows.length} of ${commands.length}`}
        inputRef={inputRef}
        label={label}
        listId={listId}
        placeholder={placeholder}
        refused={refused}
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          if (menuQueryRefused(query, next, rows.length, rowsFor(commands, next).length)) {
            setBell((count) => count + 1);
            setRefused(next);
            return;
          }
          setRefused(null);
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
            if (row !== undefined) run(row.command);
          }
          // Escape clears a typed query before it closes the palette.
          if (event.key === 'Escape' && query !== '') {
            event.preventDefault();
            event.stopPropagation();
            setQuery('');
            setRefused(null);
            setCursor(0);
          }
          // Nothing else in the palette takes the focus.
          if (event.key === 'Tab') event.preventDefault();
        }}
      />
      <div className="folder-menu-options" id={listId} role="listbox" aria-label={label}>
        {rows.map((row, index) => (
          <div
            aria-selected={index === cursor}
            className={index === cursor ? 'folder-menu-option cursor' : 'folder-menu-option'}
            id={`${listId}-${index}`}
            key={row.command.id}
            onClick={() => run(row.command)}
            onMouseMove={() => setCursor(index)}
            role="option"
          >
            <span className="row-icon">{row.command.icon}</span>
            <span className="palette-text">
              <span className="row-name">
                <MarkedText positions={row.positions} text={row.command.label} />
              </span>
              {row.command.hint === undefined ? null : (
                <span className="palette-context palette-sentence">{row.command.hint}</span>
              )}
            </span>
            <span className="palette-trail">
              <span className="palette-meta">{row.command.meta}</span>
            </span>
          </div>
        ))}
      </div>
    </Palette>
  );
}
