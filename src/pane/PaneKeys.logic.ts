/*
 * The keys a two-pane layout (a sidebar beside a page) reads: the cursor's
 * moves, Return, Tab between the panes, and the Command chords on the
 * cursor row. The app maps them onto its own verbs and adds its own chords;
 * the window listener that delivers them is `usePaneKeys`.
 */

/** Where a move takes a pane's cursor. */
export type PaneMove = 'up' | 'down' | 'start' | 'end' | 'page-up' | 'page-down';

/** The parts of a key event the panes read. */
export interface PaneKeyStroke {
  readonly key: string;
  /**
   * The physical key, read for an Option chord alone: Option makes a letter
   * a dead key or another character (⌥N), so an Option chord is known by
   * where its key sits.
   */
  readonly code: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

/**
 * What a key asks of a two-pane layout before the app names it: a move,
 * Tab or Shift-Tab, Return (`enter`), `.` (`reveal`), ⌘⌫ (`remove`), ⌘⏎
 * (`toggle`), ⌥⌘⏎ (`restart`), or a Command chord on a letter (`chord`,
 * the letter lowercase, `alt` for ⌥⌘), which the app maps to its own verb
 * or leaves alone.
 */
export type PaneKeyAction =
  | { readonly kind: 'move'; readonly to: PaneMove }
  | { readonly kind: 'switch-pane'; readonly back: boolean }
  | { readonly kind: 'enter' }
  | { readonly kind: 'reveal' }
  | { readonly kind: 'remove' }
  | { readonly kind: 'toggle' }
  | { readonly kind: 'restart' }
  | { readonly kind: 'chord'; readonly letter: string; readonly alt: boolean };

/** How {@link paneKeyAction} reads the platform's modifiers. */
export interface PaneKeyOptions {
  /**
   * The modifier that plays Command: `meta` on macOS (the default), `ctrl`
   * where Control does. The other of the two makes no chord of the panes'.
   */
  readonly command?: 'meta' | 'ctrl';
}

/**
 * The action a key asks of a two-pane layout, or null for one no pane
 * answers. Bare keys move the cursor (↑ ↓, Home and End, Page Up and Down,
 * and ⌘↑ ⌘↓, Home and End for a laptop keyboard), Return runs the cursor
 * row's verb, Tab and Shift-Tab switch panes, and `.` reveals; the rest are
 * Command chords. Neither a chord with the other of Command and Control,
 * nor Shift but with Tab, is the panes' (an app that gives Shift a chord
 * reads it before this).
 */
export function paneKeyAction(
  stroke: PaneKeyStroke,
  options: PaneKeyOptions = {}
): PaneKeyAction | null {
  const { key, altKey: alt, shiftKey: shift } = stroke;
  const command = options.command ?? 'meta';
  const meta = command === 'meta' ? stroke.metaKey : stroke.ctrlKey;
  const other = command === 'meta' ? stroke.ctrlKey : stroke.metaKey;

  if (other) return null;

  if (key === 'Tab' && !meta && !alt) return { kind: 'switch-pane', back: shift };
  if (shift) return null;

  if (!meta && !alt) {
    switch (key) {
      case 'ArrowUp':
        return { kind: 'move', to: 'up' };
      case 'ArrowDown':
        return { kind: 'move', to: 'down' };
      case 'Home':
        return { kind: 'move', to: 'start' };
      case 'End':
        return { kind: 'move', to: 'end' };
      case 'PageUp':
        return { kind: 'move', to: 'page-up' };
      case 'PageDown':
        return { kind: 'move', to: 'page-down' };
      case 'Enter':
        return { kind: 'enter' };
      case '.':
        return { kind: 'reveal' };
      default:
        return null;
    }
  }

  if (meta && alt) {
    if (key === 'Enter') return { kind: 'restart' };

    const letter = /^Key([A-Z])$/u.exec(stroke.code)?.[1];

    return letter === undefined ? null : { kind: 'chord', letter: letter.toLowerCase(), alt: true };
  }

  if (!meta) return null;

  switch (key) {
    case 'ArrowUp':
      return { kind: 'move', to: 'start' };
    case 'ArrowDown':
      return { kind: 'move', to: 'end' };
    case 'Backspace':
      return { kind: 'remove' };
    case 'Enter':
      return { kind: 'toggle' };
    default:
      return key.length === 1 ? { kind: 'chord', letter: key.toLowerCase(), alt: false } : null;
  }
}

/**
 * Where a move takes a cursor among `count` rows from `index` (-1 for no
 * cursor yet, which any move puts on the first row, or the last for `end`).
 * Every move stops at either end; a page move goes `page` rows. Null when
 * there are no rows.
 */
export function movedIndex(count: number, index: number, to: PaneMove, page = 1): number | null {
  if (count === 0) return null;
  if (index < 0) return to === 'end' ? count - 1 : 0;

  const step = Math.max(1, page);
  const next =
    to === 'up'
      ? index - 1
      : to === 'down'
        ? index + 1
        : to === 'start'
          ? 0
          : to === 'end'
            ? count - 1
            : to === 'page-up'
              ? index - step
              : index + step;

  return Math.min(count - 1, Math.max(0, next));
}

/**
 * What the cursor row in the main pane offers the keys, as its controls
 * say: the word of the control Return runs (Install, Open), whether it can
 * be removed or revealed, and the toggle (Start or Stop) and restart that
 * ⌘⏎ and ⌥⌘⏎ run for the row or, failing that, for the page. An app with
 * more verbs extends it.
 */
export interface MainVerbs {
  /** The main pane lists rows the cursor walks. */
  readonly rows: boolean;
  /** The word of the control Return runs, or null for none. */
  readonly enter: string | null;
  readonly remove: boolean;
  /** `.` reveals the item, and Return does not already. */
  readonly reveal: boolean;
  /** The word of the toggle ⌘⏎ runs (Start or Stop), or null for none. */
  readonly toggle: string | null;
  readonly restart: boolean;
}

/** A main pane that offers nothing to the keys. */
export const NO_MAIN_VERBS: MainVerbs = {
  rows: false,
  enter: null,
  remove: false,
  reveal: false,
  toggle: null,
  restart: false
};

/**
 * Whether two readings of what a pane offers say the same, field by field,
 * so a reading that changed nothing keeps the one a legend drew.
 */
export const sameVerbs = <Verbs extends object>(a: Verbs, b: Verbs): boolean =>
  (Object.keys(a) as (keyof Verbs)[]).every((field) => a[field] === b[field]) &&
  Object.keys(b).length === Object.keys(a).length;
