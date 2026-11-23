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

/**
 * The order Tab walks a two-pane window in: `document`, every stop where
 * the document puts it, each pane's listing among them; `listing`, each
 * pane's listing first, then its other stops in document order, as a file
 * manager walks its panes (`listingFirstStop`).
 */
export type TabOrder = 'document' | 'listing';

/** One pane as a listing-first walk sees it: its listing (its home) and its other stops in document order. */
export interface WalkPane<Stop> {
  readonly home: Stop;
  /** The pane's Tab stops in document order, its home left out. */
  readonly stops: readonly Stop[];
}

/**
 * Where Tab (Shift-Tab with `back`) goes from `from` in a listing-first
 * walk: from the page's listing through the page's other stops in document
 * order, then to the sidebar's listing and through its stops, then back to
 * the page's listing. Shift-Tab steps back through a pane's stops to its
 * listing, and from a listing switches panes to the other one's listing.
 * Without a sidebar (none shown), the page's listing and stops make one
 * cycle that wraps at either end. A `from` neither pane holds (the window
 * itself, a row's control) goes on as from the page's listing. Pure over
 * whatever stands for a stop, so the rule is tested without a DOM.
 */
export function listingFirstStop<Stop>(
  page: WalkPane<Stop>,
  sidebar: WalkPane<Stop> | null,
  from: Stop | null,
  back: boolean
): Stop {
  if (sidebar !== null && from !== null) {
    const at = from === sidebar.home ? -1 : sidebar.stops.indexOf(from);

    if (from === sidebar.home || at >= 0) {
      if (!back) return sidebar.stops[at + 1] ?? page.home;
      if (at === -1) return page.home;

      return at === 0 ? sidebar.home : (sidebar.stops[at - 1] ?? sidebar.home);
    }
  }

  const at = from === null ? -1 : page.stops.indexOf(from);

  if (back) {
    if (at === -1) return sidebar?.home ?? page.stops.at(-1) ?? page.home;

    return at === 0 ? page.home : (page.stops[at - 1] ?? page.home);
  }

  return page.stops[at + 1] ?? sidebar?.home ?? page.home;
}
