import { useEffect, useState } from 'react';

/**
 * A media element for a native view, loading `url` while it is mounted. The
 * source is set here rather than as an attribute, so that unmounting (a
 * switch to hex, a fallback, a reload's new generation) can pause the
 * element and drop its source, which ends playback and cancels any range
 * request still streaming from the media scheme at once rather than when
 * the element is collected. Returns the ref callback for the element and the
 * element once mounted.
 */
export function useMediaElement<T extends HTMLMediaElement>(
  url: string
): readonly [(element: T | null) => void, T | null] {
  const [media, setMedia] = useState<T | null>(null);

  useEffect(() => {
    if (!media) return;

    media.src = url;

    return () => {
      media.pause();
      media.removeAttribute('src');
      media.load();
    };
  }, [media, url]);

  return [setMedia, media];
}
