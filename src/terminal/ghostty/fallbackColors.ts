/*
 * The terminal's only colour literals. The engine paints on a canvas and
 * needs concrete colours before it can draw anything, so when the page's
 * stylesheet sets no `--terminal-*` tokens (UIOK's stylesheet was not
 * imported) or the engine reports none, these stand in. Every themed colour
 * still comes from the tokens; the colour guard skips this module alone.
 */

import type { GhosttyColor, GhosttyTheme } from './core.js';

/**
 * Catppuccin Mocha's terminal ground, text, cursor, and selection, for a
 * stylesheet that defines no terminal tokens.
 */
export const FALLBACK_TERMINAL_THEME: GhosttyTheme = {
  background: { r: 30, g: 30, b: 46 },
  foreground: { r: 205, g: 214, b: 244 },
  cursor: { r: 245, g: 224, b: 220 },
  selectionBackground: 'rgba(137, 180, 250, 0.28)'
};

/** The text colour a snapshot falls back to when the engine reports none. */
export const ENGINE_DEFAULT_FOREGROUND: GhosttyColor = { r: 229, g: 231, b: 235 };

/** The ground colour a snapshot falls back to when the engine reports none. */
export const ENGINE_DEFAULT_BACKGROUND: GhosttyColor = { r: 0, g: 0, b: 0 };

/** The selection tint the renderer paints when its caller gives none. */
export const DEFAULT_SELECTION_BACKGROUND = 'rgba(72, 122, 191, 0.35)';
