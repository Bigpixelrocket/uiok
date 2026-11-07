/*
 * Browser-keyboard policy for an app that owns its keys: which keystrokes
 * keep the browser's document behaviour (reload, find, history, page
 * scroll) away from the page, which controls keep their native editing
 * keys, and the overlay selectors every modal surface and menu shares.
 */

/**
 * One key combination. `key` is `KeyboardEvent.key` for named keys
 * (`ArrowUp`, `Backspace`, `Tab`), a lowercase letter, or a symbol; the
 * modifiers are the ones the chord holds. Every surface that prints or
 * matches a chord shares this shape, so an app's own chords and a
 * component's can be listed side by side.
 */
export interface Chord {
  readonly key: string;
  readonly ctrl?: boolean;
  readonly meta?: boolean;
  readonly alt?: boolean;
  readonly shift?: boolean;
}

/** Modifier state needed to recognize one unmodified macOS Command shortcut. */
export interface CommandKeyStroke {
  readonly key: string;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
}

const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit'
]);

const BROWSER_DOCUMENT_COMMAND_KEYS = new Set(['f', 'g', 'p', 'r', 's', 'u']);
const BROWSER_HISTORY_KEYS = new Set(['[', ']', 'ArrowLeft', 'ArrowRight']);
const BROWSER_SCROLL_KEYS = new Set([' ', 'PageUp', 'PageDown', 'Home', 'End']);

/**
 * Any open modal dialog or palette, whoever drew it: the ARIA contract every
 * modal surface shares (`isModalOpen`). Part of UIOK's public contract: a
 * surface that holds the window's keys sets `aria-modal="true"`, and an app
 * reads this selector to know one is open. Changing it is a breaking change.
 */
export const MODAL_SELECTOR = '[aria-modal="true"]';

/**
 * Any open overlay Escape closes: every modal surface (`MODAL_SELECTOR`), and
 * the overlays that leave the window's other keys alone, which carry
 * `data-overlay` instead (a menu, a find bar, a picker popover, a folded
 * list of verbs). While one is open, an app should let Escape close it and
 * hold back a window-level close such as ⌘W (`isOverlayOpen`). Part of
 * UIOK's public contract; changing it is a breaking change.
 */
export const OVERLAY_SELECTOR = `${MODAL_SELECTOR}, [data-overlay]`;

const hasUnmodifiedCommand = (key: CommandKeyStroke): boolean =>
  key.metaKey && !key.ctrlKey && !key.altKey;

const hasOptionCommand = (key: CommandKeyStroke): boolean =>
  key.metaKey && !key.ctrlKey && key.altKey;

/** True only for plain Cmd+A, without a second modifier. */
function isCommandSelectAll(key: CommandKeyStroke): boolean {
  return hasUnmodifiedCommand(key) && !key.shiftKey && key.key.toLowerCase() === 'a';
}

/** Whether a key target is a control where native text selection is intentionally available. */
export function isTextEditingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  const input = target.closest('input');

  if (input instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(input.type);
  }

  if (target.closest('textarea') instanceof HTMLTextAreaElement) {
    return true;
  }

  const contentEditable = target.closest('[contenteditable]');
  const setting = contentEditable?.getAttribute('contenteditable')?.toLowerCase();

  return setting === '' || setting === 'true' || setting === 'plaintext-only';
}

/**
 * Controls and explicitly focusable surfaces whose native key behavior must
 * survive. An element marks itself (or an ancestor) `data-native-keyboard`
 * to keep its native keys without being a control.
 */
export function isNativeKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false;
  }

  return (
    target.closest(
      'button, input, textarea, select, summary, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [data-native-keyboard], [tabindex]:not([tabindex="-1"])'
    ) !== null
  );
}

/**
 * Whether a keydown should lose its browser document behaviour: reload,
 * find, print, save, view source, history, select-all on the page, and page
 * scrolling. Meant for a window-level capture listener that cancels the key
 * through `cancelBrowserDocumentKey` without stopping propagation, so a
 * feature can still own the same key.
 *
 * Text editing and native controls retain the keys that have meaningful
 * focused-control behavior, and a modal dialog retains the page-scroll keys
 * aimed into it: its key legend may bind bare keys (Space to pause) and
 * cancels the key itself when a slot runs. A legend slot bound to a chord
 * cancelled here (⌘R) still runs, because `isKeyKept` tells the two cancels
 * apart.
 */
export function shouldSuppressBrowserDocumentKey(
  key: CommandKeyStroke,
  target: EventTarget | null
): boolean {
  if (hasUnmodifiedCommand(key) && BROWSER_DOCUMENT_COMMAND_KEYS.has(key.key.toLowerCase())) {
    return true;
  }

  if (hasOptionCommand(key) && key.key.toLowerCase() === 'u') {
    return true;
  }

  if (isTextEditingTarget(target)) {
    return false;
  }

  if (isCommandSelectAll(key)) {
    return true;
  }

  // Chromium's history chords are plain Command, so only those are
  // cancelled; a Shift variant of the brackets is often a native menu
  // accelerator, which a desktop shell hands to the page first and drops if
  // the page cancels it.
  if (hasUnmodifiedCommand(key) && !key.shiftKey && BROWSER_HISTORY_KEYS.has(key.key)) {
    return true;
  }

  if (!key.metaKey && !key.ctrlKey && !key.altKey && key.key === 'Backspace') {
    return true;
  }

  return (
    !key.metaKey &&
    !key.ctrlKey &&
    !key.altKey &&
    BROWSER_SCROLL_KEYS.has(key.key) &&
    !isNativeKeyboardTarget(target) &&
    !(target instanceof Element && target.closest(MODAL_SELECTOR) !== null)
  );
}

/**
 * Whether a modal dialog is open anywhere under `root`. Different parts of
 * an app each own their dialogs, so none reads another's state; the ARIA
 * contract is what they share: any `aria-modal="true"` element holds the
 * window's keys until it closes, the way a native sheet blocks the rest of
 * its window. Over a whole document, ask `watchOverlays`, which answers the
 * same without walking every element.
 */
export function isModalOpen(root: {
  readonly querySelector: (selectors: string) => Element | null;
}): boolean {
  return root.querySelector(MODAL_SELECTOR) !== null;
}

/**
 * Whether any overlay Escape closes is open and in view under `root`, a
 * modal one or one marked `data-overlay` (`OVERLAY_SELECTOR`). An app holds
 * a window-level close such as ⌘W back while it is, so that key closes
 * nothing behind a dialog, a palette, or a menu. An overlay inside a
 * `hidden` ancestor does not count: a view out of sight may keep its menu
 * mounted, and Escape cannot reach it from the view on screen. Over a whole
 * document, ask `watchOverlays`.
 */
export function isOverlayOpen(root: {
  readonly querySelectorAll: (selectors: string) => Iterable<Element>;
}): boolean {
  return [...root.querySelectorAll(OVERLAY_SELECTOR)].some(
    (overlay) => overlay.closest('[hidden]') === null
  );
}
