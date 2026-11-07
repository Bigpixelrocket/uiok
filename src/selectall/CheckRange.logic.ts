/**
 * What a click on a row's checkbox leaves checked: a plain click turns its row alone; a Shift-click turns every
 * row from the one clicked last (`anchor`) to this one, in the list's
 * `order`, to the state the clicked row takes. A Shift-click with no
 * anchor, or one the list no longer shows, turns the row alone.
 */
export function checkedAfterClick<K>(
  checked: ReadonlySet<K>,
  order: readonly K[],
  anchor: K | null,
  clicked: K,
  shift: boolean
): Set<K> {
  const next = new Set(checked);
  const on = !checked.has(clicked);
  const from = anchor === null ? -1 : order.indexOf(anchor);
  const to = order.indexOf(clicked);
  const range =
    shift && from >= 0 && to >= 0
      ? order.slice(Math.min(from, to), Math.max(from, to) + 1)
      : [clicked];

  for (const key of range) {
    if (on) next.add(key);
    else next.delete(key);
  }

  return next;
}
