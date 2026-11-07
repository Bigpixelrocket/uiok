/**
 * The terminal's menu, which a secondary click opens: its items, the keys it
 * answers, and where it opens. Pure, so the component only draws.
 */

import type { Chord } from '../keyboard/Keyboard.logic.js';
import type { TerminalLabels } from '../labels/terminal.js';

/** What an item of the terminal's menu does. There is no Cut: a terminal's text cannot be cut. */
export type TerminalMenuVerb = 'copy' | 'paste';

/** One item of the terminal's menu. */
export interface TerminalMenuItem {
  readonly verb: TerminalMenuVerb;
  readonly label: string;
  /** The chord that runs the same verb elsewhere (an Edit menu's), which the item shows. */
  readonly chord: Chord;
  /** A disabled item is listed, dimmed, and passed over by the keys. */
  readonly enabled: boolean;
}

/** What the menu's items depend on when it opens. */
export interface TerminalMenuState {
  /** No program to paste into: a log. */
  readonly readOnly: boolean;
  /** Whether the terminal has text selected for Copy. */
  readonly hasSelection: boolean;
}

/**
 * The chords the menu shows beside Copy and Paste: the app's own chords for
 * those verbs, so the menu teaches the keys that do the same thing.
 */
export type TerminalMenuChords = Readonly<Record<TerminalMenuVerb, Chord>>;

/** macOS's Copy and Paste chords, ⌘C and ⌘V: what a terminal shows when its host names none. */
export const DEFAULT_TERMINAL_MENU_CHORDS: TerminalMenuChords = {
  copy: { key: 'c', meta: true },
  paste: { key: 'v', meta: true }
};

/**
 * Copy, while there is a selection, and Paste, unless the terminal is
 * read-only, titled from `labels` and showing `chords`.
 */
export function terminalMenuItems(
  state: TerminalMenuState,
  labels: Pick<TerminalLabels, 'copy' | 'paste'>,
  chords: TerminalMenuChords
): readonly TerminalMenuItem[] {
  return [
    {
      verb: 'copy',
      label: labels.copy,
      chord: chords.copy,
      enabled: state.hasSelection
    },
    {
      verb: 'paste',
      label: labels.paste,
      chord: chords.paste,
      enabled: !state.readOnly
    }
  ];
}

/** A key the open menu answers: move the cursor, run its item, or close. */
export type TerminalMenuKeyAction =
  | { readonly kind: 'move'; readonly delta: number }
  | { readonly kind: 'run' }
  | { readonly kind: 'close' };

/**
 * The menu's keys, all without modifiers: ↑ and ↓ move, Return and Space run
 * the cursor's item, and Escape closes. Anything else is left alone.
 */
export function terminalMenuKeyAction(
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'>
): TerminalMenuKeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return null;
  switch (event.key) {
    case 'ArrowUp':
      return { kind: 'move', delta: -1 };
    case 'ArrowDown':
      return { kind: 'move', delta: 1 };
    case 'Enter':
    case ' ':
      return { kind: 'run' };
    case 'Escape':
      return { kind: 'close' };
    default:
      return null;
  }
}

/** A rectangle in window coordinates. */
export interface TerminalMenuBox {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** Clear space the menu keeps from the edges of the box it opens in. */
export const TERMINAL_MENU_MARGIN = 4;

/**
 * Where the menu's top left corner goes, in window coordinates: at the
 * point clicked, pulled back inside the terminal so it stays over the screen
 * it acts on, or inside the window along an edge the terminal is too small
 * for.
 */
export function placeTerminalMenu(
  at: { readonly x: number; readonly y: number },
  size: { readonly width: number; readonly height: number },
  terminal: TerminalMenuBox,
  viewport: { readonly width: number; readonly height: number }
): { readonly left: number; readonly top: number } {
  const fit = (value: number, extent: number, start: number, end: number, room: number): number => {
    const [low, high] = end - start >= extent + 2 * TERMINAL_MENU_MARGIN ? [start, end] : [0, room];
    return Math.max(
      low + TERMINAL_MENU_MARGIN,
      Math.min(value, high - TERMINAL_MENU_MARGIN - extent)
    );
  };
  return {
    left: fit(at.x, size.width, terminal.left, terminal.right, viewport.width),
    top: fit(at.y, size.height, terminal.top, terminal.bottom, viewport.height)
  };
}
