/*
 * The composition point for every label group. Each area that shows shared
 * chrome strings defines its group in its own module beside this one
 * (`keys.ts`: an interface and its English defaults), then adds one field to
 * `UiokLabels` and one to `DEFAULT_LABELS` here. Groups are flat records of
 * strings, records of strings, and functions for copy with a count or a
 * value in it (`affectedItems(count)`), so a partial override merges cleanly.
 */

import { DEFAULT_KEY_LABELS, type KeyLabels } from './keys.js';

/**
 * Every chrome string UIOK's components share across instances, grouped by
 * area: key names, and, as areas arrive, verbs such as Cancel and More.
 * Copy that differs per instance (a dialog's title, a button's words) is a
 * prop instead. An app supplies its translations through `UiokProvider`;
 * whatever it leaves out stays English.
 */
export interface UiokLabels {
  /** Key and modifier names, glyphs, and key cap words (`KeyChord`, `chordSpoken`). */
  readonly keys: KeyLabels;
}

/** The English labels every component falls back to without a `UiokProvider`. */
export const DEFAULT_LABELS: UiokLabels = {
  keys: DEFAULT_KEY_LABELS
};
