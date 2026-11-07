/**
 * Keyboard policy and chords: the browser-key guard, the overlay selectors
 * and watch, the page select-all hold, and how chords are drawn and spoken.
 */

export { cancelBrowserDocumentKey, isKeyKept } from './BrowserKeys.js';
export {
  chordGlyphs,
  chordParts,
  chordSpoken,
  LAYER_MODIFIERS,
  modifierName,
  type ChordPart,
  type LayerModifier
} from './KeyChord.logic.js';
export {
  isModalOpen,
  isNativeKeyboardTarget,
  isOverlayOpen,
  isTextEditingTarget,
  MODAL_SELECTOR,
  OVERLAY_SELECTOR,
  shouldSuppressBrowserDocumentKey,
  type Chord,
  type CommandKeyStroke
} from './Keyboard.logic.js';
export { watchOverlays, type OverlayWatch } from './OverlayWatch.js';
export { holdPageSelectAll } from './PageSelectAll.js';
