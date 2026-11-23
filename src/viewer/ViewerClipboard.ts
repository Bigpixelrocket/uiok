/**
 * How the text and hex views put a selection on the clipboard. A view's copy
 * answers at once from the bytes it holds, after one bounded read, or with
 * why it will not copy; this delivers each answer and says what happened in
 * the view's status line.
 */

import { useCallback, useEffect, useRef } from 'react';

import type { ViewerLabels } from '../labels/viewer.js';

/** A view's answer to copy: the text, a read that ends with it, or why there is none. */
export type ViewerCopy =
  { readonly text: string } | { readonly pending: Promise<string> } | { readonly error: string };

/**
 * A view's copy tickets: each copy takes one, and a copy whose text arrives
 * late writes only while its ticket is the newest and the view is still
 * mounted, so an older read, or one of a file the viewer has left, never
 * overwrites a newer copy.
 */
export function useCopyTickets(): () => () => boolean {
  const mounted = useRef(false);
  const latest = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  return useCallback(() => {
    latest.current += 1;
    const ticket = latest.current;
    return () => mounted.current && latest.current === ticket;
  }, []);
}

/**
 * Puts `copied` on the clipboard: through `clipboardData` when the Edit
 * menu's copy event supplied it and the text is ready, otherwise written
 * once it is, while `current` (the copy's ticket) still holds. `say` shows a
 * message in the view's status line, or clears it (null) once the copy is
 * done.
 */
export function deliverCopy(
  copied: ViewerCopy,
  clipboardData: DataTransfer | null,
  say: (message: string | null) => void,
  labels: ViewerLabels,
  current: () => boolean = () => true
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
  // its own; a failed read explains itself. A copy a newer one overtook, or
  // one of a view that has gone, writes and says nothing.
  text
    .then((value) =>
      current()
        ? navigator.clipboard.writeText(value).then(
            () => true,
            () => {
              throw new Error(labels.copyFailed);
            }
          )
        : false
    )
    .then(
      (written) => {
        if (written) say(null);
      },
      (error: unknown) => {
        if (current()) say(error instanceof Error ? error.message : labels.copyFailed);
      }
    );
}
