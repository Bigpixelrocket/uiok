import { createContext } from 'react';

/** The rows of history a terminal keeps above its screen when no provider says otherwise. */
export const DEFAULT_TERMINAL_SCROLLBACK_LINES = 10_000;

/**
 * The rows of history every terminal under it keeps above its screen, so an
 * app sets one length (a preference, say) for all its terminals. Every
 * terminal follows it: one already open takes a change at once, and a
 * shorter length drops its oldest lines. Without a provider a terminal keeps
 * `DEFAULT_TERMINAL_SCROLLBACK_LINES`.
 */
export const TerminalScrollbackContext = createContext<number>(DEFAULT_TERMINAL_SCROLLBACK_LINES);
