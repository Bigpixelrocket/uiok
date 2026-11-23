import type { CSSProperties, ReactElement } from 'react';

import { Terminal, type TerminalProps } from './Terminal.js';

/** The height of a boxed terminal when none is given: a dialog body's console, in pixels. */
export const TERMINAL_BOX_HEIGHT = 200;

/** Props for {@link TerminalBox}: a `Terminal`'s, less its layout class, and the box's size. */
export interface TerminalBoxProps extends Omit<TerminalProps, 'className'> {
  /**
   * Fills the room its parent gives it (a dock, a pane's foot) instead of
   * standing as a framed box of `height`: no frame, the parent's whole
   * height. The parent lays it out as a flex column or row.
   */
  readonly fill?: boolean;
  /**
   * The framed box's height in pixels, the same from the first line to the
   * last so the box never grows while output arrives; longer output scrolls
   * inside. `TERMINAL_BOX_HEIGHT` (200) when absent. Ignored with `fill`.
   */
  readonly height?: number;
}

/**
 * A terminal in a box of its own: a framed console of a fixed height in a
 * dialog's body (an install's progress), or one that fills its parent (a
 * dock). Every prop but the layout class is the `Terminal`'s, so a box
 * without `onInput` is read-only: output written through the handle draws
 * in place, a progress line redrawn by a carriage return included, and
 * the user selects and copies it. The box pads the terminal to the
 * library's 12px text inset and paints the terminal's ground behind it.
 * Draws `.terminal-box` (`.fill`), with `--terminal-box-height`.
 */
export function TerminalBox({
  fill = false,
  height = TERMINAL_BOX_HEIGHT,
  ...terminal
}: TerminalBoxProps): ReactElement {
  return (
    <div
      className={fill ? 'terminal-box fill' : 'terminal-box'}
      style={fill ? undefined : ({ '--terminal-box-height': `${height}px` } as CSSProperties)}
    >
      <Terminal {...terminal} className="terminal-box-screen" />
    </div>
  );
}
