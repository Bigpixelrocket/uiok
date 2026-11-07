/**
 * A row cursor for a demo listing without the two-pane keyboard: the rows
 * follow it through `RowCursorContext`, and the listing's own keydown moves
 * it with the arrows, Home, and End.
 */

import { useMemo, useState, useSyncExternalStore, type KeyboardEvent } from 'react';

import type { RowCursor } from '@bigpixelrocket/uiok/listing';
import { createValueStore } from '@bigpixelrocket/uiok/store';

/** The cursor, the key it is on, and the keydown handler that moves it. */
export interface DemoCursor {
  readonly cursor: RowCursor;
  readonly current: string | null;
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/** A cursor over `keys`, starting on the first. */
export function useDemoCursor(keys: readonly string[], onOpen?: (key: string) => void): DemoCursor {
  const [store] = useState(() => createValueStore<string | null>(keys[0] ?? null));
  const current = useSyncExternalStore(store.subscribe, store.get);
  const cursor = useMemo<RowCursor>(
    () => ({ current: store.get, subscribe: store.subscribe, point: (key) => store.set(key) }),
    [store]
  );
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const at = current === null ? -1 : keys.indexOf(current);
    const to = {
      ArrowDown: Math.min(at + 1, keys.length - 1),
      ArrowUp: Math.max(at - 1, 0),
      Home: 0,
      End: keys.length - 1
    }[event.key];
    if (to !== undefined) {
      event.preventDefault();
      const key = keys[to] ?? null;
      store.set(key);
      if (key !== null) {
        event.currentTarget
          .querySelector(`[data-row-key="${CSS.escape(key)}"]`)
          ?.scrollIntoView({ block: 'nearest' });
      }
      return;
    }
    if (event.key === 'Enter' && current !== null && onOpen !== undefined) {
      event.preventDefault();
      onOpen(current);
    }
  };
  return { cursor, current, onKeyDown };
}
