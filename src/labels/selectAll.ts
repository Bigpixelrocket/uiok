/**
 * The words a select-all bar repeats under every list whose rows have
 * checkboxes: its checkbox, the lead-in to the bulk actions, and the bar's
 * accessible name when the caller gives none.
 */
export interface SelectAllLabels {
  /** The checkbox that checks or clears every row: "Check all". */
  readonly checkAll: string;
  /** The words before the bulk actions: "With selected:". */
  readonly withSelected: string;
  /** The bar's accessible name when the caller gives none: "With selected". */
  readonly label: string;
}

/** English select-all words: the `selectAll` group `UiokProvider` starts from. */
export const DEFAULT_SELECT_ALL_LABELS: SelectAllLabels = {
  checkAll: 'Check all',
  withSelected: 'With selected:',
  label: 'With selected'
};
