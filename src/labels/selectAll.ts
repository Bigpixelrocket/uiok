/**
 * The words a select-all bar repeats under every list whose rows have
 * checkboxes: its checkbox, the count of checked rows before the bulk
 * actions, and the bar's accessible name when the caller gives none.
 */
export interface SelectAllLabels {
  /** The checkbox that checks or clears every row: "Check all". */
  readonly checkAll: string;
  /** How many rows are checked, said before the bulk actions as a status line says it: "3 of 8 selected". */
  readonly selected: (checked: number, total: number) => string;
  /** The bar's accessible name when the caller gives none: "With selected". */
  readonly label: string;
}

/** English select-all words: the `selectAll` group `UiokProvider` starts from. */
export const DEFAULT_SELECT_ALL_LABELS: SelectAllLabels = {
  checkAll: 'Check all',
  selected: (checked, total) => `${checked} of ${total} selected`,
  label: 'With selected'
};
