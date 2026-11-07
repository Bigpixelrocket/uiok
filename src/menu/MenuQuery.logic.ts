/*
 * Pure rules every filtered menu and palette shares: which keystroke a query
 * refuses, how the cursor moves through the rows, and where it lands when a
 * level opened in place is left.
 */

import { hasNegativeTerms } from './fuzzyMatch.js';

/**
 * Whether a menu or a palette refuses the query `next`: it would empty a
 * menu that `previous` still filled. A loaded list is complete, so an empty
 * result is certain and the character is refused instead of leaving a dead
 * query to backspace out of. A shorter query always passes, and so does one
 * that excludes with `!`, which widens again as its term grows. A menu with
 * no rows yet (still loading, failed, or empty) refuses nothing.
 */
export const menuQueryRefused = (
  previous: string,
  next: string,
  rowsBefore: number,
  rowsAfter: number
): boolean =>
  next.length >= previous.length && !hasNegativeTerms(next) && rowsBefore > 0 && rowsAfter === 0;

/**
 * A menu cursor moved by `delta` rows, clamped to the list; null for an
 * empty list. With no cursor yet, a move down enters at the first row and a
 * move up at the last.
 */
export function moveMenuCursor(
  cursor: number | null,
  delta: number,
  length: number
): number | null {
  if (length === 0) {
    return null;
  }

  if (cursor === null) {
    return delta > 0 ? 0 : length - 1;
  }

  return Math.min(length - 1, Math.max(0, cursor + delta));
}

/** A palette row the cursor can stand on unless it is taken. */
export interface PickableRow {
  /** What the row stands for, which the cursor follows as the list changes. */
  readonly key: string;
  /** Nothing to do here (already installed, already added): listed, dimmed, and passed over. */
  readonly taken: boolean;
}

/**
 * The row the cursor stands on: the one it was moved to, while that row is
 * listed and still pickable, else the first pickable row, else none. A row
 * that becomes taken meanwhile (another client did it) moves the cursor on,
 * so the primary verb never asks for what is already done.
 */
export function pickableCursor(
  items: readonly PickableRow[],
  pointed: string | null
): number | null {
  const kept =
    pointed === null ? -1 : items.findIndex((item) => item.key === pointed && !item.taken);

  if (kept !== -1) return kept;

  const first = items.findIndex((item) => !item.taken);

  return first === -1 ? null : first;
}

/**
 * The cursor moved by `delta` over the pickable rows alone, clamped to
 * them; null when none is pickable.
 */
export function movedPickableCursor(
  items: readonly PickableRow[],
  cursor: number | null,
  delta: number
): number | null {
  const pickable = items.flatMap((item, index) => (item.taken ? [] : [index]));
  const at = cursor === null ? null : pickable.indexOf(cursor);
  const next = moveMenuCursor(at === -1 ? null : at, delta, pickable.length);

  return next === null ? null : (pickable[next] ?? null);
}

/**
 * A level a menu or a palette opened in place, with the row that opened it.
 * A trail of them, outermost first, is how deep the surface stands.
 */
export interface LevelStep<Level> {
  readonly level: Level;
  /**
   * The key of the row the level was opened from, where the cursor lands on
   * the way back; null for a level opened some other way.
   */
  readonly from: string | null;
}

/** The level a trail stands in: its last step's, or null at the top. */
export const trailLevel = <Level>(trail: readonly LevelStep<Level>[]): Level | null =>
  trail.at(-1)?.level ?? null;

/** The trail after the row keyed `from` opens `level` one step deeper. */
export const enteredLevel = <Level>(
  trail: readonly LevelStep<Level>[],
  level: Level,
  from: string | null
): readonly LevelStep<Level>[] => [...trail, { level, from }];

/** One step back out of a trail, and the row the cursor returns to there. */
export interface LevelReturn<Level> {
  readonly trail: readonly LevelStep<Level>[];
  /** The key of the row that opened the level left, or null when none did. */
  readonly pointed: string | null;
}

/**
 * Steps back out of the trail's last level, the way an iPod's wheel does:
 * the cursor lands on the row that opened it, at every depth, not on the
 * first row. Null at the top, where there is nothing to step back from.
 * The surface still checks that the row is listed (`returnedCursor`), since
 * the list may have changed while the level showed.
 */
export function leftLevel<Level>(trail: readonly LevelStep<Level>[]): LevelReturn<Level> | null {
  const last = trail.at(-1);

  return last === undefined ? null : { trail: trail.slice(0, -1), pointed: last.from };
}

/**
 * Where the cursor stands after stepping back: the row keyed `pointed`
 * while it is listed, else null, which leaves the surface's own resting row.
 */
export function returnedCursor(keys: readonly string[], pointed: string | null): number | null {
  const at = pointed === null ? -1 : keys.indexOf(pointed);

  return at === -1 ? null : at;
}
