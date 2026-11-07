import { fireEvent, render, screen } from '@testing-library/react';
import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement
} from 'react';
import { describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import { MODAL_SELECTOR } from '../keyboard/Keyboard.logic.js';
import { UiokProvider } from '../labels/UiokProvider.js';
import { matchQuery } from '../menu/fuzzyMatch.js';
import { menuQueryRefused, moveMenuCursor } from '../menu/MenuQuery.logic.js';
import { MarkedText } from '../text/MarkedText.js';
import { Palette, PaletteQuery, type PaletteLevel } from './Palette.js';

interface Command {
  readonly id: string;
  readonly label: string;
}

const COMMANDS: readonly Command[] = [
  { id: 'new-tab', label: 'New Tab' },
  { id: 'new-window', label: 'New Window' },
  { id: 'close-tab', label: 'Close Tab' },
  { id: 'settings', label: 'Open Settings' }
];

/** The commands a query keeps, best first, with where it hit each. */
const filtered = (query: string) =>
  COMMANDS.flatMap((command) => {
    const match = matchQuery(command.label, query);

    return match === null ? [] : [{ command, positions: match.positions, score: match.score }];
  }).sort((left, right) => right.score - left.score);

/**
 * A command palette the way a caller composes one: it owns the query, the
 * cursor, and the refusals, and draws its rows inside the shared frame.
 */
function CommandPalette({
  onRun,
  onClose,
  level = null
}: {
  readonly onRun: (id: string) => void;
  readonly onClose: () => void;
  readonly level?: PaletteLevel | null;
}): ReactElement {
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState<number | null>(0);
  const [bell, setBell] = useState(0);
  const [refused, setRefused] = useState<string | null>(null);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const rows = filtered(query);
  const optionId = (index: number): string => `${listId}-${index}`;

  useLayoutEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      setCursor(moveMenuCursor(cursor, event.key === 'ArrowDown' ? 1 : -1, rows.length));
    } else if (event.key === 'Enter' && cursor !== null) {
      event.preventDefault();
      const row = rows[cursor];
      if (row !== undefined) onRun(row.command.id);
    }
  };

  return (
    <Palette label="Commands" onClose={onClose}>
      <PaletteQuery
        activeId={cursor === null ? undefined : optionId(cursor)}
        bell={bell}
        count={query === '' ? null : `${rows.length} of ${COMMANDS.length}`}
        inputRef={inputRef}
        label="Filter commands"
        level={level}
        listId={listId}
        onChange={(event) => {
          const next = event.target.value;

          if (menuQueryRefused(query, next, rows.length, filtered(next).length)) {
            setBell((count) => count + 1);
            setRefused(next);
            return;
          }

          setRefused(null);
          setQuery(next);
          setCursor(0);
        }}
        onKeyDown={onKeyDown}
        placeholder="Type a command"
        refused={refused}
        value={query}
      />
      <div className="folder-menu-options" id={listId} role="listbox">
        {rows.map((row, index) => (
          <div
            aria-label={row.command.label}
            aria-selected={index === cursor}
            className={index === cursor ? 'folder-menu-option cursor' : 'folder-menu-option'}
            id={optionId(index)}
            key={row.command.id}
            onClick={() => onRun(row.command.id)}
            role="option"
          >
            <span className="row-icon" />
            <span className="palette-text">
              <span className="row-name">
                <MarkedText positions={row.positions} text={row.command.label} />
              </span>
            </span>
          </div>
        ))}
      </div>
    </Palette>
  );
}

const field = (): HTMLInputElement => screen.getByRole('combobox', { name: 'Filter commands' });

const options = (): string[] =>
  screen.getAllByRole('option').map((option) => option.getAttribute('aria-label') ?? '');

const cursorRow = (): string | null =>
  screen
    .getAllByRole('option')
    .find((option) => option.getAttribute('aria-selected') === 'true')
    ?.getAttribute('aria-label') ?? null;

const type = (value: string): void => {
  fireEvent.change(field(), { target: { value } });
};

describe('Palette', () => {
  it('opens as a modal dialog with the focus in its field', () => {
    render(<CommandPalette onClose={vi.fn()} onRun={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'Commands' });

    expect(dialog.matches(MODAL_SELECTOR)).toBe(true);
    expect(dialog.className).toBe('folder-menu palette');
    expect(document.activeElement).toBe(field());
    expect(field().getAttribute('aria-controls')).toBe(screen.getByRole('listbox').id);
  });

  it('filters as the user types, counting what is left and marking the hits', () => {
    render(<CommandPalette onClose={vi.fn()} onRun={vi.fn()} />);

    expect(options()).toHaveLength(4);
    expect(document.querySelector('.folder-menu-count')).toBeNull();

    type('tab');

    expect(options()).toEqual(['New Tab', 'Close Tab']);
    expect(document.querySelector('.folder-menu-count')?.textContent).toBe('2 of 4');

    const name = screen.getByRole('option', { name: 'New Tab' }).querySelector('.row-name');

    expect(name?.textContent).toBe('New Tab');
    expect([...(name?.querySelectorAll('.name-hit') ?? [])].map((hit) => hit.textContent)).toEqual([
      'Tab'
    ]);
  });

  it('moves the cursor with the arrows, clamped to the list, and runs it on Return', () => {
    const onRun = vi.fn();
    render(<CommandPalette onClose={vi.fn()} onRun={onRun} />);

    expect(cursorRow()).toBe('New Tab');

    fireEvent.keyDown(field(), { key: 'ArrowDown' });
    fireEvent.keyDown(field(), { key: 'ArrowDown' });

    expect(cursorRow()).toBe('Close Tab');
    expect(field().getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('option', { name: 'Close Tab' }).id
    );

    fireEvent.keyDown(field(), { key: 'ArrowUp' });
    fireEvent.keyDown(field(), { key: 'ArrowUp' });
    fireEvent.keyDown(field(), { key: 'ArrowUp' });

    expect(cursorRow()).toBe('New Tab');

    type('settings');
    fireEvent.keyDown(field(), { key: 'Enter' });

    expect(onRun).toHaveBeenCalledExactlyOnceWith('settings');
  });

  it('closes on Escape, but not on an input method’s Escape', () => {
    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} onRun={vi.fn()} />);

    fireEvent.keyDown(field(), { key: 'Escape', isComposing: true });
    expect(onClose).not.toHaveBeenCalled();

    expect(fireEvent.keyDown(field(), { key: 'Escape' })).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on a press on the backdrop alone, keeping the focus in the field inside', () => {
    const onClose = vi.fn();
    render(<CommandPalette onClose={onClose} onRun={vi.fn()} />);
    const dialog = screen.getByRole('dialog');

    // A press on a row is cancelled, so the browser leaves the focus in the field.
    expect(fireEvent.mouseDown(screen.getByRole('option', { name: 'Close Tab' }))).toBe(false);
    // A press in the field is the field's own, so the caret lands where it is pressed.
    expect(fireEvent.mouseDown(field())).toBe(true);
    expect(onClose).not.toHaveBeenCalled();

    expect(fireEvent.mouseDown(dialog.parentElement as HTMLElement)).toBe(false);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('refuses a keystroke that would empty the list, saying why and ringing the bell', () => {
    render(<CommandPalette onClose={vi.fn()} onRun={vi.fn()} />);
    const row = field().parentElement as HTMLElement;

    type('tab');
    type('tabz');

    expect(field().value).toBe('tab');
    expect(options()).toEqual(['New Tab', 'Close Tab']);
    expect(document.querySelector('.palette-refused')?.textContent).toBe('nothing matches “tabz”');
    expect(document.querySelector('.folder-menu-count')).toBeNull();
    expect(row.className).toBe('folder-menu-query bell-1');

    type('ta');

    expect(document.querySelector('.palette-refused')).toBeNull();
    expect(document.querySelector('.folder-menu-count')?.textContent).toBe('2 of 4');
  });

  it('names the level in a chip that steps back without taking the focus', () => {
    const onBack = vi.fn();
    render(
      <CommandPalette level={{ title: 'Formats', onBack }} onClose={vi.fn()} onRun={vi.fn()} />
    );
    const chip = screen.getByRole('button', { name: 'Back from Formats' });

    expect(chip.textContent).toBe('Formats');
    expect(chip.tabIndex).toBe(-1);
    expect(chip.getAttribute('data-tooltip')).toBe('Back');
    expect(chip.getAttribute('data-tooltip-shortcut')).toBe('←');

    fireEvent.click(chip);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('speaks the labels the provider supplies', () => {
    render(
      <UiokProvider
        labels={{
          palette: {
            back: 'Zurück',
            backFrom: (level) => `Zurück aus ${level}`,
            nothingMatches: (query) => `nichts passt zu „${query}“`
          }
        }}
      >
        <CommandPalette
          level={{ title: 'Formate', onBack: vi.fn() }}
          onClose={vi.fn()}
          onRun={vi.fn()}
        />
      </UiokProvider>
    );

    expect(screen.getByRole('button', { name: 'Zurück aus Formate' }).dataset.tooltip).toBe(
      'Zurück'
    );

    type('q');

    expect(document.querySelector('.palette-refused')?.textContent).toBe('nichts passt zu „q“');
  });

  it('marks itself busy only while it waits, and adds the caller’s classes', () => {
    const { rerender } = render(
      <Palette className="commands" label="Commands" onClose={vi.fn()}>
        {null}
      </Palette>
    );
    const dialog = screen.getByRole('dialog');

    expect(dialog.className).toBe('folder-menu palette commands');
    expect(dialog.hasAttribute('aria-busy')).toBe(false);

    rerender(
      <Palette busy label="Commands" onClose={vi.fn()}>
        {null}
      </Palette>
    );

    expect(dialog.getAttribute('aria-busy')).toBe('true');
  });

  it('floats over the page on the dialog layer, painted only with tokens', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    render(
      <div className="listing-root">
        <CommandPalette onClose={vi.fn()} onRun={vi.fn()} />
      </div>
    );
    const dialog = screen.getByRole('dialog');

    expect(declaredValues(dialog.parentElement as HTMLElement, 'z-index')).toEqual([
      'var(--z-dialog)'
    ]);
    expect(declaredValues(dialog, 'background')).toEqual(['var(--surface)']);
    expect(declaredValues(dialog, 'position')).toContain('static');
    expect(declaredValues(screen.getByRole('option', { name: 'New Tab' }), 'background')).toEqual([
      'var(--cursor-row-bg)'
    ]);
  });
});
