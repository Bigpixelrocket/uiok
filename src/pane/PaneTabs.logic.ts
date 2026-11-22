/**
 * The rules a pane's tab strip draws by, as pure functions: which tabs are
 * picked to close or move together, which tabs a crowded strip folds away
 * and how many in one step, how narrow a tab's label may get, and where a
 * dragged tab lands. A host keeps its tab state with the pick helpers;
 * `PaneTabs` uses the rest.
 */

/**
 * The tabs picked on a strip beside the one in front. They belong to the
 * tab in front when they were picked, and lapse once another tab comes to
 * the front. A host keeps them in memory; they are never worth saving.
 */
export interface TabPicks {
  /** The tab in front when the picks were made. */
  readonly front: string;
  /** The picked tabs other than the one in front, in the order they were picked. */
  readonly ids: readonly string[];
}

/** The picks that still stand: those made under the tab in front now, on tabs still in `order`. */
const livePicks = (
  order: readonly string[],
  frontId: string,
  picks: TabPicks | null
): readonly string[] =>
  picks === null || picks.front !== frontId
    ? []
    : picks.ids.filter((id) => id !== frontId && order.includes(id));

/**
 * The tabs a strip's picks stand for, in strip order: the tab in front,
 * always, and every pick that still stands.
 */
export function pickedTabs(
  order: readonly string[],
  frontId: string,
  picks: TabPicks | null
): readonly string[] {
  const live = livePicks(order, frontId, picks);

  return order.filter((id) => id === frontId || live.includes(id));
}

/**
 * A Command press on the tab `id`: picks it, or drops it when it was
 * picked. The tab in front is always among the picks and is never dropped,
 * so a press on it changes nothing. Null once nothing beside the tab in
 * front is picked.
 */
export function togglePick(
  order: readonly string[],
  frontId: string,
  picks: TabPicks | null,
  id: string
): TabPicks | null {
  const live = livePicks(order, frontId, picks);
  const ids =
    id === frontId || !order.includes(id)
      ? live
      : live.includes(id)
        ? live.filter((other) => other !== id)
        : [...live, id];

  return ids.length === 0 ? null : { front: frontId, ids };
}

/**
 * A Shift press on the tab `id`: picks the run of tabs from the one in
 * front to it, both ends included, in place of the picks before. Null for a
 * press on the tab in front, or on a tab not in `order`.
 */
export function pickRun(order: readonly string[], frontId: string, id: string): TabPicks | null {
  const from = order.indexOf(frontId);
  const to = order.indexOf(id);

  if (from < 0 || to < 0 || from === to) {
    return null;
  }

  return {
    front: frontId,
    ids: order
      .slice(Math.min(from, to), Math.max(from, to) + 1)
      .filter((other) => other !== frontId)
  };
}

/**
 * The strip's order with the tabs `carried` drawn together around `held`,
 * the tab under the pointer, as a drag of picked tabs lifts them: the ones
 * before it close up just before it and the ones after it just after, in
 * their order, and every other tab keeps its order.
 */
export function gatherTabs(
  order: readonly string[],
  carried: readonly string[],
  held: string
): readonly string[] {
  const block = order.filter((id) => id === held || carried.includes(id));
  const rest = order.filter((id) => id === held || !carried.includes(id));
  const at = rest.indexOf(held);

  return at < 0 ? order : [...rest.slice(0, at), ...block, ...rest.slice(at + 1)];
}

/** The characters of its name a tab keeps before it folds away instead of shrinking further. */
const NAME_FLOOR = 8;

/** The characters of its context a tab keeps before its name starts to shrink. */
const CONTEXT_FLOOR = 3;

/** How many characters a part cut to `floor` takes: all of a shorter one, else `floor` and its ellipsis. */
const kept = (text: string, floor: number): number => {
  const length = [...text].length;

  return length <= floor ? length : floor + 1;
};

/**
 * The fewest characters a tab's label keeps, its ellipses counted, split
 * into the context (its slash not counted) and the name: eight characters
 * of the name and three of the context, or all of a shorter one. The
 * context shrinks to its floor before the name loses a character: the name
 * is what the eye looks for, and the context only tells two tabs apart.
 */
export function tabLabelFloor(label: { readonly name: string; readonly context?: string }): {
  readonly context: number;
  readonly name: number;
} {
  return {
    context: label.context === undefined ? 0 : kept(label.context, CONTEXT_FLOOR),
    name: kept(label.name, NAME_FLOOR)
  };
}

/** What `foldOrder` reads of a tab. */
export interface FoldableTab {
  readonly id: string;
  readonly pinned?: boolean;
  readonly following?: boolean;
}

/**
 * The order in which a crowded strip folds its tabs into the count:
 * farthest from the tab in front first and, of two as far, the later one.
 * The tab in front, pinned tabs, and the following tab never fold, so they
 * are left out.
 */
export function foldOrder(tabs: readonly FoldableTab[], frontId: string): readonly string[] {
  const frontAt = tabs.findIndex((tab) => tab.id === frontId);

  return tabs
    .map((tab, index) => ({ tab, index, distance: Math.abs(index - frontAt) }))
    .filter(({ tab }) => tab.id !== frontId && tab.pinned !== true && tab.following !== true)
    .sort((a, b) => b.distance - a.distance || b.index - a.index)
    .map(({ tab }) => tab.id);
}

/**
 * How many more tabs a crowded strip folds in one step. `deficit` is how far
 * the tabs on show run past their room, `widths` the foldable tabs still on
 * show in fold order, and `gap` the space between two tabs. Folding one tab
 * per layout pass would take a pass per tab, and a strip can hold more tabs
 * than React allows passes in a row. A deficit folds at least one tab, and
 * one that no tab covers folds them all.
 */
export function foldsNeeded(deficit: number, widths: readonly number[], gap: number): number {
  let freed = 0;
  let count = 0;

  for (const width of widths) {
    if (freed >= deficit) {
      break;
    }

    freed += width + gap;
    count += 1;
  }

  return count;
}

/** A tab on show in a strip, as a drag measures it. */
export interface TabBox {
  readonly id: string;
  readonly left: number;
  readonly width: number;
}

/**
 * The strip's order while a tab is dragged along it. `held` is the dragged
 * tab where the pointer has it, `boxes` the other tabs on show where the
 * layout has them, and `order` every tab, folded ones included. A neighbour
 * steps aside once the tab coming toward it covers half of it; one the tab
 * is moving away from stays put, so a tab resting on the line between two
 * places cannot flicker between them. Folded tabs keep their places: a tab
 * that crosses no neighbour returns `order` itself, and one that crosses
 * lands beside the last neighbour it passed. `direction` is the sign of the
 * pointer's last move.
 */
export function draggedTabOrder(
  order: readonly string[],
  held: TabBox,
  boxes: readonly TabBox[],
  direction: number
): readonly string[] {
  const mine = order.indexOf(held.id);
  const rest = order.filter((id) => id !== held.id);
  const shown = rest.filter((id) => boxes.some((box) => box.id === id));
  const right = held.left + held.width;
  const passed = shown.filter((id) => {
    const box = boxes.find((candidate) => candidate.id === id);

    if (box === undefined) {
      return false;
    }

    const centre = box.left + box.width / 2;

    return order.indexOf(id) < mine
      ? !(direction < 0 && held.left < centre)
      : direction > 0 && right > centre;
  }).length;
  const stayed = shown.filter((id) => order.indexOf(id) < mine).length;

  // Nothing crossed: the tab keeps its place among the folded tabs too.
  if (passed === stayed) {
    return order;
  }

  // Past a neighbour, the tab lands beside it: folded tabs on the far side
  // of that neighbour stay where they were.
  const at =
    passed > stayed
      ? rest.indexOf(shown[passed - 1] as string) + 1
      : rest.indexOf(shown[passed] as string);

  return [...rest.slice(0, at), held.id, ...rest.slice(at)];
}
