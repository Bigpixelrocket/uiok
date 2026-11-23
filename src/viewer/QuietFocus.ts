import type { FocusEvent } from 'react';

/**
 * The text and hex views take the focus as their window opens, so the keys
 * scroll the document without a click first. That focus is the window's, not
 * the user's, so it draws no ring: the rows carry `data-quiet-focus` until
 * the focus first leaves them inside the window, and the frame's ring rule
 * (`.viewer-rows-frame` in ViewerWindow.css) leaves quiet rows out. Focus the
 * user brings back by keyboard (Tab, or Escape out of the offset field) then
 * shows the ring; a pointer press, which focuses the rows from code after a
 * mouse interaction, does not.
 */

/** Focuses the rows as the window opens, marked so they draw no ring. */
export function focusQuietly(element: HTMLElement | null): void {
  if (element === null) return;
  element.dataset.quietFocus = '';
  element.focus();
}

/**
 * Ends the quiet focus once the focus leaves the rows for something else in
 * the window. A blur because the window itself lost the focus keeps it, so
 * coming back to the window shows no ring either.
 */
export function endQuietFocus(event: FocusEvent<HTMLElement>): void {
  if (event.relatedTarget === null && !event.currentTarget.ownerDocument.hasFocus()) return;
  delete event.currentTarget.dataset.quietFocus;
}
