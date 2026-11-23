/**
 * How the text and hex views put a selection on the clipboard. A view's copy
 * answers at once from the bytes it holds, after one bounded read, or with
 * why it will not copy; this delivers each answer and says what happened in
 * the view's status line.
 */

import type { ViewerLabels } from '../labels/viewer.js';

/** A view's answer to copy: the text, a read that ends with it, or why there is none. */
export type ViewerCopy =
  { readonly text: string } | { readonly pending: Promise<string> } | { readonly error: string };

/**
 * Puts `copied` on the clipboard: through `clipboardData` when the Edit
 * menu's copy event supplied it and the text is ready, otherwise written
 * once it is. `say` shows a message in the view's status line, or clears it
 * (null) once the copy is done.
 */
export function deliverCopy(
  copied: ViewerCopy,
  clipboardData: DataTransfer | null,
  say: (message: string | null) => void,
  labels: ViewerLabels
): void {
  if ('error' in copied) {
    say(copied.error);
    return;
  }

  if ('text' in copied && clipboardData !== null) {
    clipboardData.setData('text/plain', copied.text);
    say(null);
    return;
  }

  let text: Promise<string>;
  if ('text' in copied) {
    text = Promise.resolve(copied.text);
  } else {
    say(labels.copying);
    text = copied.pending;
  }

  // A read ends after the copy event, so the text goes to the clipboard on
  // its own; a failed read explains itself.
  text
    .then((value) =>
      navigator.clipboard.writeText(value).catch(() => {
        throw new Error(labels.copyFailed);
      })
    )
    .then(
      () => say(null),
      (error: unknown) => say(error instanceof Error ? error.message : labels.copyFailed)
    );
}
