/** How many source colours the theme defines (`--log-source-1` to `--log-source-6`). */
export const LOG_SOURCE_COLOURS = 6;

/**
 * The colour token the log source at `index` (from zero) is written in, as
 * a `var()`: `--log-source-1` for 0 through `--log-source-6` for 5,
 * starting over at 6. Each holds 4.5:1 as text on a panel.
 */
export const logSourceColour = (index: number): string =>
  `var(--log-source-${(index % LOG_SOURCE_COLOURS) + 1})`;

/**
 * Each source's colour index, in the order given (`order`, then any other
 * source in the order it first appears in `lines`), so a source keeps its
 * colour however its lines interleave and whatever comes in later.
 */
export function logSourceIndexes(
  sources: readonly (string | null | undefined)[],
  order: readonly string[] = []
): ReadonlyMap<string, number> {
  const indexes = new Map<string, number>();

  for (const source of [...order, ...sources]) {
    if (source !== null && source !== undefined && !indexes.has(source)) {
      indexes.set(source, indexes.size);
    }
  }

  return indexes;
}

/** The width of a log's source column, in characters: its longest source, none when no line has one. */
export function logSourceWidth(sources: readonly (string | null | undefined)[]): number {
  return sources.reduce<number>((widest, source) => Math.max(widest, source?.length ?? 0), 0);
}
