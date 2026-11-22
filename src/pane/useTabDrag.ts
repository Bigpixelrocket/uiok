import { useEffect, useMemo, useRef, useState } from 'react';

import { draggedTabOrder, gatherTabs, type TabBox } from './PaneTabs.logic.js';

/** How far the pointer travels before a press on a tab becomes a drag, in pixels. */
export const DRAG_SLOP = 4;

/** What a drag needs from its strip; the strip hands it over after every layout. */
export interface TabStripHandle {
  /** Every tab in the order drawn now, folded ones included. */
  readonly order: readonly string[];
  /** The pinned tabs, which move only among themselves. */
  readonly pinned: ReadonlySet<string>;
  /** The strip's tabs element, whose padding edge a drag's offsets count from. */
  readonly strip: HTMLElement | null;
  /** A drop that changed the order: the strip hands it to its host. */
  readonly commit: (order: readonly string[]) => void;
}

/** What a press on a picked tab adds to a drag. */
export interface CarriedTabs {
  /** Every tab the drag carries, the pressed one among them. */
  readonly ids: readonly string[];
  /** Runs when the press ends without a drag: a plain click on the tab. */
  readonly onClick: () => void;
}

/** One strip's drag. */
export interface TabDrag {
  /** The tabs in the hand once the pointer has moved past the slop; none at rest. */
  readonly draggingIds: readonly string[];
  /** The order the strip draws while a drag runs; null at rest, when the host's order stands. */
  readonly liveOrder: readonly string[] | null;
  /** Starts a possible drag of the tab `id` from a press on `tab` at `clientX`. */
  readonly begin: (id: string, tab: HTMLElement, clientX: number, carried?: CarriedTabs) => void;
  /** A stable ref callback per tab id, so the drag knows where each tab on show is drawn. */
  readonly tabRef: (id: string) => (element: HTMLElement | null) => (() => void) | undefined;
  /** The strip has laid out: the drag reads its handle and keeps the hand under the pointer. */
  readonly afterLayout: (handle: TabStripHandle) => void;
}

/** A tab in the hand, with the tabs it carries. */
interface HeldTab {
  readonly id: string;
  /** Every tab in the hand, `id` among them, all pinned or all not. */
  ids: readonly string[];
  readonly onClick: (() => void) | null;
  readonly startX: number;
  /** The pointer's offset inside the pressed tab, which it keeps while it follows. */
  readonly grab: number;
  x: number;
  /** Which way the pointer last moved; a neighbour steps aside only for a tab coming toward it. */
  direction: number;
  moved: boolean;
  /** The order as the drag found it, which Escape puts back and a drop compares with. */
  startOrder: readonly string[];
}

/** Parses a duration token's computed value ("120ms", "0.12s") to milliseconds. */
const durationMs = (value: string): number => {
  const text = value.trim();
  const amount = parseFloat(text);

  return Number.isFinite(amount) ? (text.endsWith('ms') ? amount : amount * 1000) : 0;
};

/**
 * Slides a tab from an offset back to where the layout now has it, over the
 * fast duration token with its easing, so reduced motion (which zeroes the
 * token) makes it a jump.
 */
function slideHome(tab: HTMLElement, from: string): void {
  if (from === '' || from === 'none') {
    return;
  }

  const style = getComputedStyle(tab);
  const duration = durationMs(style.getPropertyValue('--duration-fast'));

  if (duration <= 0) {
    return;
  }

  // Optional: jsdom has no Web Animations.
  tab.animate?.([{ transform: from }, { transform: 'none' }], {
    duration,
    easing: style.getPropertyValue('--ease-out').trim() || 'ease-out'
  });
}

/**
 * Dragging a strip's tabs to reorder them. The held tab follows the pointer
 * along the strip, lifted over its neighbours, and the strip reorders under
 * it: a neighbour steps aside once the held tab covers half of it
 * (`draggedTabOrder`). An unpinned tab stops at the pin rule and a pinned
 * one moves only among the pinned; the hand never goes past the last tab on
 * show, so nothing drops among the folded tabs. Picked tabs close up round
 * the held one as the drag starts (`gatherTabs`) and ride as one block.
 *
 * Escape (or the window losing the focus) puts every tab back; the Escape
 * is the drag's alone, taken on the window's capture ahead of every other
 * handler, with its repeats until it comes up. Release hands the new order
 * to the strip's `commit` when it changed. The window follows the pointer,
 * since a reordered tab moves in the document and would drop a capture.
 */
export function useTabDrag(): TabDrag {
  const [draggingIds, setDraggingIds] = useState<readonly string[]>([]);
  const [liveOrder, setLiveOrder] = useState<readonly string[] | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  // A drag in flight when the strip goes away must not leave the window listening.
  useEffect(() => () => stopRef.current?.(), []);

  const drag = useMemo(() => {
    const tabs = new Map<string, HTMLElement>();
    const refs = new Map<string, (element: HTMLElement | null) => (() => void) | undefined>();
    const lastLefts = new Map<string, number>();
    // Where each tab was drawn as a drag was cancelled, which it slides back from.
    const returning = new Map<string, number>();
    let handle: TabStripHandle | null = null;
    let held: HeldTab | null = null;

    const segmentOf = (order: readonly string[], id: string): readonly string[] => {
      const pinned = handle?.pinned.has(id) ?? false;

      return order.filter((other) => (handle?.pinned.has(other) ?? false) === pinned);
    };

    // The hand's tabs on show, in strip order, each with how far into the block it rides.
    const blockOf = (at: HeldTab) => {
      const order = handle?.order ?? at.ids;
      const shown = order.flatMap((id) => {
        const tab = at.ids.includes(id) ? tabs.get(id) : undefined;

        return tab ? [{ id, tab }] : [];
      });
      const gap = parseFloat(getComputedStyle(handle?.strip ?? document.body).columnGap) || 0;
      let width = 0;
      const members = shown.map((member) => {
        const into = width;

        width += member.tab.offsetWidth + gap;

        return { ...member, into };
      });

      return { members, width: Math.max(0, width - gap) };
    };

    // Where the block's near edge is: the pressed tab under the pointer where
    // it was grabbed, but never outside its segment's tabs on show.
    const heldLeft = (at: HeldTab): number | null => {
      const pressed = tabs.get(at.id);
      const origin = pressed?.offsetParent?.getBoundingClientRect().left;

      if (!handle || !pressed || origin === undefined) {
        return null;
      }

      const block = blockOf(at);
      const into = block.members.find((member) => member.id === at.id)?.into ?? 0;
      const shown = segmentOf(handle.order, at.id).flatMap((id) => {
        const tab = tabs.get(id);

        return tab ? [tab] : [];
      });
      const start = Math.min(...shown.map((tab) => tab.offsetLeft));
      const end = Math.max(...shown.map((tab) => tab.offsetLeft + tab.offsetWidth)) - block.width;

      return Math.max(start, Math.min(at.x - at.grab - origin - into, end));
    };

    const follow = (): void => {
      const left = held?.moved ? heldLeft(held) : null;

      if (held && left !== null) {
        for (const { tab, into } of blockOf(held).members) {
          tab.style.transform = `translateX(${left + into - tab.offsetLeft}px)`;
        }
      }
    };

    // A tab let go of slides from where the hand had it to its place.
    const settle = (id: string): void => {
      const tab = tabs.get(id);

      if (tab) {
        const from = tab.style.transform;

        tab.style.transform = '';
        slideHome(tab, from);
      }
    };

    const move = (event: PointerEvent): void => {
      if (!held || !handle) {
        return;
      }

      held.direction = Math.sign(event.clientX - held.x) || held.direction;
      held.x = event.clientX;

      if (!held.moved) {
        if (Math.abs(held.x - held.startX) < DRAG_SLOP) {
          return;
        }

        held.moved = true;
        held.startOrder = handle.order;
        window.addEventListener('keydown', escape, true);
        setDraggingIds(held.ids);

        // Picked tabs close up round the pressed one as the drag lifts them;
        // the strip lays them out together before the block moves.
        const gathered = gatherTabs(handle.order, held.ids, held.id);

        if (gathered.some((id, index) => id !== handle?.order[index])) {
          setLiveOrder(gathered);

          return;
        }
      }

      follow();

      const left = heldLeft(held);

      if (left === null) {
        return;
      }

      const { id, ids, direction } = held;
      const order = handle.order;
      const segment = segmentOf(order, id);
      const block = segment.filter((other) => ids.includes(other));
      const moved = draggedTabOrder(
        segment.filter((other) => other === id || !ids.includes(other)),
        { id, left, width: blockOf(held).width },
        segment.flatMap((other) => {
          const tab = ids.includes(other) ? undefined : tabs.get(other);

          return tab ? [{ id: other, left: tab.offsetLeft, width: tab.offsetWidth }] : [];
        }) satisfies TabBox[],
        direction
      ).flatMap((other) => (other === id ? block : [other]));
      const others = order.filter((other) => !segment.includes(other));
      const next = handle.pinned.has(id) ? [...moved, ...others] : [...others, ...moved];

      if (next.some((other, index) => other !== order[index])) {
        setLiveOrder(next);
      }
    };

    const stop = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('keydown', escape, true);
      window.removeEventListener('blur', cancel);
      stopRef.current = null;
    };

    // Ends the drag with every tab back where it began, and a press that was
    // not yet a drag without its click.
    function cancel(): void {
      const dropped = held;

      held = null;
      stop();

      if (dropped === null || !dropped.moved) {
        return;
      }

      for (const [id, tab] of tabs) {
        returning.set(id, tab.getBoundingClientRect().left);
        tab.style.transform = '';
      }

      setDraggingIds([]);
      setLiveOrder(null);
    }

    function escape(event: KeyboardEvent): void {
      if (event.key === 'Escape' && held?.moved) {
        event.preventDefault();
        event.stopImmediatePropagation();
        cancel();
        window.addEventListener('keydown', swallowEscape, true);
        window.addEventListener('keyup', releaseEscape, true);
        window.addEventListener('blur', releaseEscape);
      }
    }

    // The Escape that cancelled, still held: its repeats are the cancel's too.
    function swallowEscape(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    }

    function releaseEscape(event: Event): void {
      if (event instanceof KeyboardEvent && event.key !== 'Escape') {
        return;
      }

      window.removeEventListener('keydown', swallowEscape, true);
      window.removeEventListener('keyup', releaseEscape, true);
      window.removeEventListener('blur', releaseEscape);
    }

    function end(): void {
      const dropped = held;

      held = null;
      stop();

      if (dropped === null) {
        return;
      }

      if (!dropped.moved) {
        dropped.onClick?.();

        return;
      }

      dropped.ids.forEach(settle);
      setDraggingIds([]);

      const order = handle?.order ?? dropped.startOrder;

      if (order.some((id, index) => id !== dropped.startOrder[index])) {
        handle?.commit(order);
      }

      setLiveOrder(null);
    }

    return {
      begin: (id: string, tab: HTMLElement, clientX: number, carried?: CarriedTabs): void => {
        stopRef.current?.();

        const pinned = handle?.pinned.has(id) ?? false;
        const ids = carried?.ids.includes(id)
          ? carried.ids.filter((other) => (handle?.pinned.has(other) ?? false) === pinned)
          : [id];

        for (const [other, element] of tabs) {
          lastLefts.set(other, element.offsetLeft);
        }

        held = {
          id,
          ids,
          onClick: carried?.onClick ?? null,
          startX: clientX,
          grab: clientX - tab.getBoundingClientRect().left,
          x: clientX,
          direction: 0,
          moved: false,
          startOrder: handle?.order ?? []
        };
        returning.clear();
        stopRef.current = stop;
        window.addEventListener('pointermove', move);
        window.addEventListener('pointerup', end);
        window.addEventListener('pointercancel', end);
        window.addEventListener('blur', cancel);
      },
      tabRef: (id: string) => {
        let ref = refs.get(id);

        if (ref === undefined) {
          ref = (element: HTMLElement | null) => {
            if (element === null) {
              return undefined;
            }

            tabs.set(id, element);

            return () => {
              if (tabs.get(id) === element) {
                tabs.delete(id);
                lastLefts.delete(id);
                returning.delete(id);
              }
            };
          };
          refs.set(id, ref);
        }

        return ref;
      },
      afterLayout: (next: TabStripHandle): void => {
        handle = next;

        for (const id of refs.keys()) {
          if (!next.order.includes(id)) {
            refs.delete(id);
          }
        }

        const dragged = held?.moved ? held.ids : null;

        for (const [id, tab] of tabs) {
          const left = tab.offsetLeft;
          const before = lastLefts.get(id);
          const from = returning.get(id);

          // A tab a cancel put back slides from where it was drawn.
          if (from !== undefined) {
            const at = tab.getBoundingClientRect().left;

            returning.delete(id);

            if (Math.abs(from - at) > 0.5) {
              slideHome(tab, `translateX(${from - at}px)`);
            }
          }

          // A neighbour the drag displaced slides to its new place instead of jumping.
          if (
            dragged !== null &&
            !dragged.includes(id) &&
            before !== undefined &&
            before !== left
          ) {
            slideHome(tab, `translateX(${before - left}px)`);
          }

          lastLefts.set(id, left);
        }

        follow();
      }
    };
  }, []);

  return useMemo(() => ({ draggingIds, liveOrder, ...drag }), [draggingIds, liveOrder, drag]);
}
