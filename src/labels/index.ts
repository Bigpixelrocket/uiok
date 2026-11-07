/** Shared chrome strings: `UiokProvider`, `useLabels`, and the label groups with their English defaults. */

export { DEFAULT_DATE_TIME_LABELS, type DateTimeLabels } from './dateTime.js';
export { DEFAULT_KEY_LABELS, type KeyLabels } from './keys.js';
export { DEFAULT_LISTING_LABELS, type ListingLabels, type SortDirection } from './listing.js';
export { DEFAULT_PAGER_LABELS, type PagerLabels, type PagerStep } from './pager.js';
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
