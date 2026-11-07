/**
 * The words a palette's query row speaks: the level chip's tooltip and
 * accessible name, and why a keystroke was refused.
 */
export interface PaletteLabels {
  /** The level chip's tooltip verb: "Back". */
  readonly back: string;
  /** The level chip's accessible name, given the level's title: "Back from Formats". */
  readonly backFrom: (level: string) => string;
  /**
   * Said where the count stands after a refused keystroke, given the query
   * it would have made: "nothing matches “dox”".
   */
  readonly nothingMatches: (query: string) => string;
}

/** English palette words: the `palette` group `UiokProvider` starts from. */
export const DEFAULT_PALETTE_LABELS: PaletteLabels = {
  back: 'Back',
  backFrom: (level) => `Back from ${level}`,
  nothingMatches: (query) => `nothing matches “${query}”`
};
