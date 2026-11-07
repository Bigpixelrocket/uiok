/**
 * The words every terminal repeats: its menu's accessible name and items,
 * the line that stands in for a terminal that could not start, and the
 * input element's fallback name. A terminal's own name is its `ariaLabel`
 * prop.
 */
export interface TerminalLabels {
  /** The accessible name of the menu a secondary click opens: "Terminal". */
  readonly menu: string;
  /** The menu's Copy item, macOS's own word for the verb: "Copy". */
  readonly copy: string;
  /** The menu's Paste item, macOS's own word for the verb: "Paste". */
  readonly paste: string;
  /** Shown in place of a terminal whose engine could not start: "Could not start the terminal." */
  readonly startFailed: string;
  /**
   * The input element's accessible name when the engine is started without
   * one (`Terminal` always passes its `ariaLabel`): "Terminal input".
   */
  readonly input: string;
}

/** English terminal words: the `terminal` group `UiokProvider` starts from. */
export const DEFAULT_TERMINAL_LABELS: TerminalLabels = {
  menu: 'Terminal',
  copy: 'Copy',
  paste: 'Paste',
  startFailed: 'Could not start the terminal.',
  input: 'Terminal input'
};
