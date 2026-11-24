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

/** A run of a log's lines, by index: `start` drawn, `end` not. */
export interface LineRun {
  readonly start: number;
  readonly end: number;
}

/**
 * Each line's top in a log of `count` lines, and the log's whole height
 * last (`count + 1` entries): a line measured is as tall as `measured`
 * says, any other `estimate` tall.
 */
export function lineTops(
  count: number,
  measured: (index: number) => number | undefined,
  estimate: number
): Float64Array {
  const tops = new Float64Array(count + 1);

  for (let index = 0; index < count; index += 1) {
    tops[index + 1] = (tops[index] ?? 0) + (measured(index) ?? estimate);
  }
  return tops;
}

/** The index of the line at `y`, by `tops` (`lineTops`): the last whose top is at or above it. */
export function lineAt(tops: Float64Array, y: number): number {
  const count = tops.length - 1;
  let low = 0;
  let high = count;

  // The first line whose bottom passes `y`.
  while (low < high) {
    const middle = (low + high) >>> 1;

    if ((tops[middle + 1] ?? 0) <= y) low = middle + 1;
    else high = middle;
  }
  return Math.min(low, Math.max(0, count - 1));
}

/**
 * The lines a view from `top` to `top + height` shows, by `tops`
 * (`lineTops`), and `overscan` more on each side, so a scroll of a few
 * lines draws nothing new before the browser paints.
 */
export function visibleRun(
  tops: Float64Array,
  top: number,
  height: number,
  overscan: number
): LineRun {
  const count = tops.length - 1;

  if (count === 0) return { start: 0, end: 0 };
  const first = lineAt(tops, Math.max(0, top));
  const last = lineAt(tops, Math.max(0, top + height));

  return { start: Math.max(0, first - overscan), end: Math.min(count, last + 1 + overscan) };
}

/** `runs` (within `count` lines) in order, the ones that touch or overlap joined into one. */
export function joinedRuns(runs: readonly LineRun[], count: number): readonly LineRun[] {
  const sorted = runs
    .map((run) => ({ start: Math.max(0, run.start), end: Math.min(count, run.end) }))
    .filter((run) => run.end > run.start)
    .sort((a, b) => a.start - b.start);
  const joined: LineRun[] = [];

  for (const run of sorted) {
    const previous = joined.at(-1);

    if (previous !== undefined && run.start <= previous.end) {
      joined[joined.length - 1] = { start: previous.start, end: Math.max(previous.end, run.end) };
    } else {
      joined.push(run);
    }
  }
  return joined;
}
