/** The way a listing is sorted by one column: up, down, or not by it (null). */
export type SortDirection = 'asc' | 'desc' | null;

/**
 * The words a listing's column strip speaks: what a sorting label is called
 * to assistive technology, which says the column and how it sorts now.
 */
export interface ListingLabels {
  /**
   * The accessible name of a column label that sorts its listing, given the
   * column's label and the way the listing sorts by it now: "Sort by Name,
   * sorted ascending".
   */
  readonly sortBy: (column: string, direction: SortDirection) => string;
}

/** English listing words: the `listing` group `UiokProvider` starts from. */
export const DEFAULT_LISTING_LABELS: ListingLabels = {
  sortBy: (column, direction) =>
    direction === 'asc'
      ? `Sort by ${column}, sorted ascending`
      : direction === 'desc'
        ? `Sort by ${column}, sorted descending`
        : `Sort by ${column}`
};
