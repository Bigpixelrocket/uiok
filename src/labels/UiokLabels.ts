/*
 * The composition point for every label group. Each area that shows shared
 * chrome strings defines its group in its own module beside this one
 * (`keys.ts`: an interface and its English defaults), then adds one field to
 * `UiokLabels` and one to `DEFAULT_LABELS` here. Groups are flat records of
 * strings, records of strings, and functions for copy with a count or a
 * value in it (`affectedItems(count)`), so a partial override merges cleanly.
 */

import { DEFAULT_KEY_LABELS, type KeyLabels } from './keys.js';
import { DEFAULT_LISTING_LABELS, type ListingLabels } from './listing.js';
import { DEFAULT_PALETTE_LABELS, type PaletteLabels } from './palette.js';

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
  /** A listing's column strip: the sorting label's accessible name (`Listing`, `Strip`). */
  readonly listing: ListingLabels;
  /** A palette's query row: the level chip and a refused keystroke (`PaletteQuery`). */
  readonly palette: PaletteLabels;
}

/** The English labels every component falls back to without a `UiokProvider`. */
export const DEFAULT_LABELS: UiokLabels = {
  keys: DEFAULT_KEY_LABELS,
  listing: DEFAULT_LISTING_LABELS,
  palette: DEFAULT_PALETTE_LABELS
};
