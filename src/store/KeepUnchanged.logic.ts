import { sameData } from './SameProps.js';

/**
 * `next` with each item that holds the same data (`sameData`) as the item
 * of the same id in `previous` replaced by that earlier object, and
 * `previous` itself when every item is kept in the same order. A snapshot
 * that arrives from a server or another process is all fresh objects;
 * keeping the unchanged ones lets memoized rows, and memos keyed by them,
 * skip an update that did not touch them.
 */
export function keepUnchangedById<Item extends { readonly id: string }>(
  previous: readonly Item[] | null,
  next: readonly Item[]
): readonly Item[] {
  return keepUnchangedBy(previous, next, (item) => item.id);
}

/**
 * `keepUnchangedById` for items known by another field (`idOf`): a list
 * built afresh from what the page holds, such as a tree's rows, keeps each
 * row a rebuild left alike. `alike` says when an earlier
 * item may stand for the new one: the same data by default, or a looser
 * test for a list that draws only part of what its items hold.
 */
export function keepUnchangedBy<Item>(
  previous: readonly Item[] | null,
  next: readonly Item[],
  idOf: (item: Item) => string,
  alike: (earlier: Item, item: Item) => boolean = sameData
): readonly Item[] {
  if (previous === null || previous.length === 0) return next;

  const before = new Map(previous.map((item) => [idOf(item), item]));
  let whole = previous.length === next.length;
  const kept = next.map((item, index) => {
    const earlier = before.get(idOf(item));
    const keep = earlier !== undefined && alike(earlier, item) ? earlier : item;

    if (keep !== previous[index]) whole = false;

    return keep;
  });

  return whole ? previous : kept;
}
