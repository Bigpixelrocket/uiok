/**
 * The terminal: `Terminal`, Ghostty's VT engine as WebAssembly drawn on a
 * canvas, with its Copy and Paste menu and the scrollback length every
 * terminal under `TerminalScrollbackContext` keeps. Imported on its own as
 * `@bigpixelrocket/uiok/terminal`, never from the package root, so an app
 * that shows no terminal never loads the engine; its look is terminal.css,
 * which the base stylesheet imports.
 */

export {
  Terminal,
  type TerminalHandle,
  type TerminalProps,
  type TerminalSize
} from './Terminal.js';
export { type TerminalAction, type TerminalKeyStroke } from './Terminal.logic.js';
export { DEFAULT_TERMINAL_MENU_CHORDS, type TerminalMenuChords } from './TerminalMenu.logic.js';
export {
  DEFAULT_TERMINAL_SCROLLBACK_LINES,
  TerminalScrollbackContext
} from './TerminalScrollback.js';
