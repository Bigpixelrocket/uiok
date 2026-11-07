/**
 * One value held outside React state, which the components that show it
 * follow on their own through `useSyncExternalStore`: a change draws those
 * components alone, never the one that holds the store, nor the page
 * around them. No React here.
 */
export interface ValueStore<T> {
  readonly get: () => T;
  /** Replaces the value and tells every listener, unless it is the same value (`Object.is`). */
  readonly set: (next: T) => void;
  /** Adds a listener; returns its removal. */
  readonly subscribe: (listener: () => void) => () => void;
}

/** A subscription that hears nothing, for `useSyncExternalStore` while there is nothing to follow. */
export const unheard = (): (() => void) => () => undefined;

/** A store holding `initial` until its first `set`. */
export function createValueStore<T>(initial: T): ValueStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();

  return {
    get: () => value,
    set: (next) => {
      if (Object.is(next, value)) return;
      value = next;
      for (const listener of [...listeners]) listener();
    },
    subscribe: (listener) => {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    }
  };
}
