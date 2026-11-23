/** The viewer's window and each view's root: where a key or copy is the viewer's. */
const VIEWER_ROOTS = '.viewer-window, .text-view, .hex-view, .image-view, .audio-view, .video-view';

/**
 * Whether a key or copy event the viewer hears on the window is its own:
 * aimed at something inside the viewer, or at nothing (no element, the
 * page's body or root), as in a window that shows only the viewer with
 * nothing focused. An event aimed at a control of the host's page beside
 * the viewer (a search field, a drawer) stays the page's, so the viewer
 * neither closes on its Escape nor copies over its Copy.
 */
export function isViewerEventTarget(target: EventTarget | null): boolean {
  const element = target as Element | null;
  if (element === null || typeof element.closest !== 'function') return true;

  const page = element.ownerDocument;
  if (element === page.body || element === page.documentElement) return true;

  return element.closest(VIEWER_ROOTS) !== null;
}
