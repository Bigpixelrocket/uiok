/**
 * A command palette over the library's palette frame and menu parts: a
 * filtered list of commands, a cursor the arrows move, and Return to run.
 * A command can open a second level of commands, named in a chip before the
 * field (the chip, ←, or Backspace in an empty field steps back), and notes
 * can stand under the list. After its label a row says a sentence, a path
 * (giving way at its start), or a command line (in the code face). A tag can
 * stand at the field's end and a key legend under everything. The shell uses
 * it to find a page; the palette page uses it as its demo.
 */

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

import { DialogLegend } from '@bigpixelrocket/uiok/dialog';
import { KeyChord, type KeyChordProps } from '@bigpixelrocket/uiok/keychord';
import { matchQuery, menuQueryRefused, moveMenuCursor } from '@bigpixelrocket/uiok/menu';
import { Palette, PaletteQuery } from '@bigpixelrocket/uiok/palette';
import { MarkedText } from '@bigpixelrocket/uiok/text';

/** One command the palette lists. */
export interface Command {
  readonly id: string;
  readonly label: string;
  /** A dim sentence after the label. */
  readonly hint?: string;
  /** A path after the label, in place of a sentence; it gives way at its start. */
  readonly path?: string;
  /** A command line after the label, in place of a sentence, in the code face. */
  readonly line?: string;
  readonly icon?: ReactNode;
  /** Dim text at the row's end, such as the page's route. */
  readonly meta?: string;
  /** The command's chord, drawn as key caps at the row's end. */
  readonly chord?: KeyChordProps['chord'];
  /**
   * The commands of a level this command opens, named after its label; the
   * command then steps into the level instead of running.
   */
  readonly level?: readonly Command[];
  /** Notes under the list while the palette stands in this command's level. */
  readonly notes?: readonly PaletteNote[];
  readonly run?: () => void;
}

/** A line under a palette's list: a plain note, or a failure in the danger tone. */
export interface PaletteNote {
  readonly text: string;
  /** Draws the line as a failure. */
  readonly failure?: boolean;
}

/** Props for {@link CommandPalette}. */
export interface CommandPaletteProps {
  readonly label: string;
  readonly placeholder: string;
  readonly commands: readonly Command[];
  /** Notes under the list at the first level. */
  readonly notes?: readonly PaletteNote[];
  /** A tag at the field's end, such as what the rows act on. */
  readonly aside?: ReactNode;
  /**
   * A key legend under everything, with these words: its leave verb closes
   * the palette, its primary runs the cursor row as Return does.
   */
  readonly legend?: { readonly leave: string; readonly primary: string };
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
export function CommandPalette({
  label,
  placeholder,
  commands: firstLevel,
  notes: firstNotes,
  aside,
  legend,
  onClose
}: CommandPaletteProps) {
  // The command whose level the palette stands in; null at the first level.
  const [opener, setOpener] = useState<Command | null>(null);
  const commands = opener?.level ?? firstLevel;
  const notes = opener === null ? firstNotes : opener.notes;
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<number | null>(0);
  const [bell, setBell] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = rowsFor(commands, query);

  // The palette takes the focus while open and hands it back to whatever held it before, so
  // Escape or a press outside does not drop it on the page's body. A command that opens another
  // page moves the focus on from there.
  useLayoutEffect(() => {
    const before = document.activeElement;
    inputRef.current?.focus();
    return () => {
      if (before instanceof HTMLElement && before.isConnected) before.focus();
    };
  }, []);

  // The cursor's row stays in view as the arrows move it past the list's edge.
  useLayoutEffect(() => {
    if (cursor === null) return;
    document.getElementById(`${listId}-${cursor}`)?.scrollIntoView?.({ block: 'nearest' });
  }, [cursor, query, listId]);

  /** Moves to another level with an empty query and the cursor on its first row. */
  const enter = (next: Command | null) => {
    setOpener(next);
    setQuery('');
    setRefused(null);
    setCursor(0);
  };

  const run = (command: Command) => {
    if (command.level !== undefined) {
      enter(command);
      return;
    }
    onClose();
    command.run?.();
  };

  return (
    <Palette label={label} onClose={onClose}>
      <PaletteQuery
        aside={aside}
        activeId={cursor === null ? undefined : `${listId}-${cursor}`}
        bell={bell}
        count={query === '' ? null : `${rows.length} of ${commands.length}`}
        inputRef={inputRef}
        label={label}
        level={
          opener === null
            ? null
            : { title: opener.label.replace(/…$/, ''), onBack: () => enter(null) }
        }
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
          // Keys that compose a character with an input method are the method's own. Safari ends
          // the composition before the confirming Return's keydown, which it marks with key code 229.
          if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return;
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            setCursor(moveMenuCursor(cursor, 1, rows.length));
          }
          if (event.key === 'ArrowUp') {
            event.preventDefault();
            setCursor(moveMenuCursor(cursor, -1, rows.length));
          }
          // ← or Backspace in an empty field steps back out of a level.
          if (
            opener !== null &&
            query === '' &&
            (event.key === 'ArrowLeft' || event.key === 'Backspace')
          ) {
            event.preventDefault();
            enter(null);
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
              {row.command.path === undefined ? null : (
                <span className="palette-context">
                  <bdi>{row.command.path}</bdi>
                </span>
              )}
              {row.command.line === undefined ? null : (
                <span className="palette-context palette-command">{row.command.line}</span>
              )}
            </span>
            <span className="palette-trail keycap">
              {row.command.meta === undefined ? null : (
                <span className="palette-meta">{row.command.meta}</span>
              )}
              {row.command.chord === undefined ? null : <KeyChord chord={row.command.chord} />}
            </span>
          </div>
        ))}
      </div>
      {notes === undefined || notes.length === 0 ? null : (
        <div className="palette-notes">
          {notes.map((note) => (
            <p
              className={
                note.failure === true ? 'folder-menu-note palette-failure' : 'folder-menu-note'
              }
              key={note.text}
              role={note.failure === true ? 'alert' : undefined}
            >
              {note.text}
            </p>
          ))}
        </div>
      )}
      {legend === undefined ? null : (
        <DialogLegend
          legend={{
            leave: { label: legend.leave },
            primary: {
              label: legend.primary,
              disabled: cursor === null || rows[cursor] === undefined,
              onRun: () => {
                const row = cursor === null ? undefined : rows[cursor];
                if (row !== undefined) run(row.command);
              }
            }
          }}
          onLeave={onClose}
        />
      )}
    </Palette>
  );
}
