/**
 * The keydowns an app cancelled only to keep the browser's document
 * behaviour from them (`shouldSuppressBrowserDocumentKey`: ⌘R anywhere, ⌘[
 * and ⌘→ outside a text field). The app cancels them in the window's capture
 * phase, before any control hears them, so a cancelled key alone does not
 * say a control kept it.
 */
const browserDocumentCancels = new WeakSet<Event>();

/**
 * Cancels a key's browser document behaviour and remembers that the cancel
 * was only that, so a dialog legend bound to the same chord (⌘R) still runs
 * its slot (`isKeyKept`). Propagation goes on, so a feature can still own
 * the key. Part of UIOK's public keyboard contract: an app's window-level
 * guard cancels through this, never through a bare `preventDefault`.
 */
export function cancelBrowserDocumentKey(event: Event): void {
  event.preventDefault();
  browserDocumentCancels.add(event);
}

/**
 * Whether a control has already kept a key: it is cancelled, and not only as
 * a browser document key. A control that answers a chord the app's guard
 * cancels too stops the key's propagation, since the cancel cannot tell the
 * two apart. Part of UIOK's public keyboard contract.
 */
export function isKeyKept(event: Event): boolean {
  return event.defaultPrevented && !browserDocumentCancels.has(event);
}
