import { useCallback, useRef, useState } from 'react';

import type { Size } from './ImageZoom.logic.js';

/**
 * Watches an element's content box: a ref callback for the element, and its
 * size in pixels, null until measured (or where nothing measures, as in
 * jsdom without a ResizeObserver).
 */
export function useElementSize(): [(element: HTMLElement | null) => void, Size | null] {
  const [size, setSize] = useState<Size | null>(null);
  const observer = useRef<ResizeObserver | null>(null);

  const ref = useCallback((element: HTMLElement | null) => {
    observer.current?.disconnect();
    observer.current = null;
    if (element === null || typeof ResizeObserver === 'undefined') return;

    observer.current = new ResizeObserver(([entry]) => {
      if (!entry) return;

      const { width, height } = entry.contentRect;
      setSize((current) =>
        current?.width === width && current.height === height ? current : { width, height }
      );
    });
    observer.current.observe(element);
  }, []);

  return [ref, size];
}
