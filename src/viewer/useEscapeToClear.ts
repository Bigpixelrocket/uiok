import { useEffect } from 'react';

/**
 * Lets a bare Escape clear what a view holds (its selection) wherever focus
 * is in the window, the Wrap checkbox or a status bar button included, before
 * the window's own Escape closes it (`ViewerWindow.tsx`). The listener sits on
 * the document, which a keystroke reaches before the window, and takes Escape
 * only while `active`; a key something inside took first stays with it.
 */
export function useEscapeToClear(active: boolean, clear: () => void): void {
  useEffect(() => {
    if (!active) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      const bare = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      if (event.defaultPrevented || event.key !== 'Escape' || !bare) return;

      event.preventDefault();
      clear();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, clear]);
}
