import { useCallback, useRef, type Ref, type RefCallback, type RefObject } from 'react';

/**
 * A component's own ref to its element, shared with the ref its host
 * passes: the callback hands the element to both, and its cleanup clears
 * both, running the cleanup a host's callback ref returned (React 19) or
 * calling it with null when it returned none. Internal to the frame area.
 */
export function useSharedRef<T>(
  ref: Ref<T> | undefined
): readonly [RefObject<T | null>, RefCallback<T>] {
  const own = useRef<T | null>(null);
  const attach = useCallback(
    (element: T | null) => {
      own.current = element;

      const cleanup = typeof ref === 'function' ? ref(element) : undefined;

      if (typeof ref !== 'function' && ref !== null && ref !== undefined) ref.current = element;

      return () => {
        own.current = null;
        if (typeof cleanup === 'function') cleanup();
        else if (typeof ref === 'function') ref(null);
        else if (ref !== null && ref !== undefined) ref.current = null;
      };
    },
    [ref]
  );

  return [own, attach];
}
