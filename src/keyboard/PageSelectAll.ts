/**
 * Keeps a select-all from selecting the page. A native Select All (an Edit
 * menu item, or ⌘A where no listener cancels it) selects in the window it is
 * chosen in, which with no text field focused would select every selectable
 * run of text on the page.
 *
 * Chromium asks before it selects: a page-wide select-all dispatches a
 * cancelable `selectstart` at the body, and one in a focused field or
 * editable region dispatches it at that element. Cancelling only the
 * body's leaves fields, and a selection a pointer starts on an element,
 * untouched. Install once per page, before it renders; returns the function
 * that removes the hold.
 */
export function holdPageSelectAll(document: Document): () => void {
  const hold = (event: Event): void => {
    if (event.target === document.body) {
      event.preventDefault();
    }
  };

  document.addEventListener('selectstart', hold, true);

  return () => document.removeEventListener('selectstart', hold, true);
}
