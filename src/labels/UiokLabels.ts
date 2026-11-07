/*
 * The composition point for every label group. Each area that shows shared
 * chrome strings defines its group in its own module beside this one
 * (`keys.ts`: an interface and its English defaults), then adds one field to
 * `UiokLabels` and one to `DEFAULT_LABELS` here. Groups are flat records of
 * strings, records of strings, and functions for copy with a count or a
 * value in it (`affectedItems(count)`), so a partial override merges cleanly.
 */

import { DEFAULT_CHART_LABELS, type ChartLabels } from './charts.js';
import { DEFAULT_DATE_TIME_LABELS, type DateTimeLabels } from './dateTime.js';
import { DEFAULT_DIALOG_LABELS, type DialogLabels } from './dialog.js';
import { DEFAULT_KEY_LABELS, type KeyLabels } from './keys.js';
import { DEFAULT_LEGEND_LABELS, type LegendLabels } from './legend.js';
import { DEFAULT_LISTING_LABELS, type ListingLabels } from './listing.js';
import { DEFAULT_PAGER_LABELS, type PagerLabels } from './pager.js';
import { DEFAULT_PALETTE_LABELS, type PaletteLabels } from './palette.js';
import { DEFAULT_SELECT_ALL_LABELS, type SelectAllLabels } from './selectAll.js';

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
  /** Chart read-outs, the scatter chart's count and zoom words, and picture export messages (`@bigpixelrocket/uiok/charts`). */
  readonly charts: ChartLabels;
  /** A date and time picker's month steps, time fields, buttons, and name locale (`DateTimePicker`). */
  readonly dateTime: DateTimeLabels;
  /** Dialog leave verbs and a confirmation's list name (`ConfirmDialog`, `filterLeaveLabel`). */
  readonly dialog: DialogLabels;
  /** A key legend strip's own name, its verb group, paired cap names, and overflow count (`KeyLegendStrip`, `moreLabel`). */
  readonly legend: LegendLabels;
  /** A listing's column strip: the sorting label's accessible name (`Listing`, `Strip`). */
  readonly listing: ListingLabels;
  /** A long list's pager: its steps and its page menu (`Pager`). */
  readonly pager: PagerLabels;
  /** A palette's query row: the level chip and a refused keystroke (`PaletteQuery`). */
  readonly palette: PaletteLabels;
  /** A select-all bar's checkbox and lead-in (`SelectAllBar`). */
  readonly selectAll: SelectAllLabels;
}

/** The English labels every component falls back to without a `UiokProvider`. */
export const DEFAULT_LABELS: UiokLabels = {
  keys: DEFAULT_KEY_LABELS,
  charts: DEFAULT_CHART_LABELS,
  dateTime: DEFAULT_DATE_TIME_LABELS,
  dialog: DEFAULT_DIALOG_LABELS,
  legend: DEFAULT_LEGEND_LABELS,
  listing: DEFAULT_LISTING_LABELS,
  pager: DEFAULT_PAGER_LABELS,
  palette: DEFAULT_PALETTE_LABELS,
  selectAll: DEFAULT_SELECT_ALL_LABELS
};
