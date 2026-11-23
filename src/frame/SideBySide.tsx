import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

/** Props for {@link SideBySide}. */
export interface SideBySideProps {
  /**
   * The width in pixels, of the room the pair itself is given (its pane's
   * page, never the window), from which the two stand side by side; in
   * less, the second stands under the first.
   */
  readonly from: number;
  /** The first part, at the inline start side by side and on top stacked: a listing, a section. */
  readonly first: ReactNode;
  /** The first part's accessible name ("Settings"), which its group carries. */
  readonly firstLabel: string;
  /** The second part, beside the first or under it. */
  readonly second: ReactNode;
  /** The second part's accessible name ("Extensions"), which its group carries. */
  readonly secondLabel: string;
}

/**
 * Two of a page's listings or sections, side by side in equal columns while
 * the room the pair is given is `from` pixels wide or more, one over the
 * other in less, a hairline between them either way. The room is the
 * pair's own, measured as it resizes (`data-layout`: `side-by-side` or
 * `stacked`), so a pane narrowed by its sidebar or a split stacks them
 * though the window is wide. It is a layout alone: each part is a group
 * named by its label, in the page's reading order (the first, then the
 * second), and holds no cursor and answers no key; the rows inside follow
 * whatever `RowCursorContext` is around them.
 */
export function SideBySide({
  from,
  first,
  firstLabel,
  second,
  secondLabel
}: SideBySideProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const [sideBySide, setSideBySide] = useState(false);

  // Measured before the first paint, so the pair never draws in the other
  // layout first. A threshold a prop gives cannot reach a container query,
  // whose conditions read no custom property, so the width is read here.
  useLayoutEffect(() => {
    const element = ref.current;

    if (element === null) return undefined;

    // A width of 0 is a page not laid out (held behind another tab), which keeps its layout.
    const measure = (): void => {
      const width = element.clientWidth;

      if (width > 0) setSideBySide(width >= from);
    };

    measure();
    // Optional: jsdom has no ResizeObserver.
    if (typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(measure);

    observer.observe(element);
    return () => observer.disconnect();
  }, [from]);

  return (
    <div className="side-by-side" data-layout={sideBySide ? 'side-by-side' : 'stacked'} ref={ref}>
      <div aria-label={firstLabel} className="side-by-side-part" role="group">
        {first}
      </div>
      <div aria-label={secondLabel} className="side-by-side-part" role="group">
        {second}
      </div>
    </div>
  );
}
