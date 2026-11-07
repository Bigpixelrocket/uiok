/** Shared chrome strings: `UiokProvider`, `useLabels`, and the label groups with their English defaults. */

export { DEFAULT_CHART_LABELS, type ChartLabels } from './charts.js';
export { DEFAULT_DATE_TIME_LABELS, type DateTimeLabels } from './dateTime.js';
export { DEFAULT_DIALOG_LABELS, type DialogLabels } from './dialog.js';
export { DEFAULT_KEY_LABELS, type KeyLabels } from './keys.js';
export { DEFAULT_LEGEND_LABELS, type LegendLabels } from './legend.js';
export { DEFAULT_LISTING_LABELS, type ListingLabels, type SortDirection } from './listing.js';
export { DEFAULT_PAGER_LABELS, type PagerLabels, type PagerStep } from './pager.js';
export { DEFAULT_PALETTE_LABELS, type PaletteLabels } from './palette.js';
export { DEFAULT_SELECT_ALL_LABELS, type SelectAllLabels } from './selectAll.js';
export { DEFAULT_LABELS, type UiokLabels } from './UiokLabels.js';
export {
  mergeLabels,
  UiokProvider,
  useLabels,
  type LabelsOverride,
  type UiokLabelsOverride,
  type UiokProviderProps
} from './UiokProvider.js';
