import { useCallback, useRef, useState } from 'react';

/**
 * Watches an element's content height: a ref callback for the element, and
 * its height in pixels, null until measured (or where nothing measures, as
 * in jsdom without a ResizeObserver).
 */
export function useElementHeight(): [(element: HTMLElement | null) => void, number | null] {
  const [height, setHeight] = useState<number | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (element === null || typeof ResizeObserver === 'undefined') return;

    observer.current = new ResizeObserver(([entry]) => {
      if (entry) setHeight(entry.contentRect.height);
    });
    observer.current.observe(element);
  }, []);

  return [ref, height];
}
