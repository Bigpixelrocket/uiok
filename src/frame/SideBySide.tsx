import { useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react';

/**
 * How far under `from` a pair already side by side stays so, in pixels:
 * wider than a classic scrollbar (15px on macOS, 17px on Windows). Two
 * columns can be taller than one stack, so side by side a scrollbar may
 * appear in the pane and narrow the pair under `from`; stacking then would
 * take the scrollbar away and stand them side by side again, back and
 * forth. Holding the layout through a scrollbar's width keeps it still.
 */
const SCROLLBAR_HOLD = 20;

/** Props for {@link SideBySide}. */
export interface SideBySideProps {
  /**
   * The floor, in pixels, of the room the pair itself is given (its pane's
   * page, never the window): under it the second always stands under the
   * first. From it, the two stand side by side once each also fits its
   * column at its min-content width.
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
 * The room the two parts need to stand side by side, in pixels: twice the
 * wider part's min-content width, as the columns are equal. Measured by
 * laying the parts out in one `min-content` column for one read
 * (`data-measuring`, which the stylesheet reads), whose width is the wider
 * part's, and back again before the browser paints, so the reader never
 * sees it. One column, not two: stacked, the parts stay where they stand,
 * and side by side they stack, so the pair never grows shorter for the
 * read and a scrolled pane around it keeps its scroll. A part with no
 * laid-out width (jsdom, a page held out of sight) asks for nothing.
 */
const contentRoom = (element: HTMLElement): number => {
  const [first, second] = element.children;

  if (first === undefined || second === undefined) return 0;
  element.setAttribute('data-measuring', '');
  const widest = Math.max(
    first.getBoundingClientRect().width,
    second.getBoundingClientRect().width
  );

  element.removeAttribute('data-measuring');
  return Math.ceil(widest * 2);
};

/**
 * Two of a page's listings or sections, side by side in equal columns while
 * the room the pair is given is `from` pixels wide or more and each part
 * fits its half at its min-content width, one over the other otherwise, a
 * hairline between them either way. So wide content (a form whose labels
 * and fields will not narrow, long unbreakable words) stacks though the
 * room passes `from`, and `from` stays a floor under which the pair never
 * stands side by side. Once side by side, it stacks only under the room it
 * needs less a scrollbar's width, so a scrollbar the two columns bring
 * cannot flip it back and forth; a changed `from` applies whole to the
 * first width measured against it. The room is the pair's own, measured as
 * it resizes (`data-layout`: `side-by-side` or `stacked`), so a pane
 * narrowed by its sidebar or a split stacks them though the window is wide.
 *
 * The min-content widths are read in the same `ResizeObserver` callback
 * that reads the room (one forced layout per resize frame, never a read and
 * a write interleaved), and never while the room is under the floor, where
 * nothing they say could stand the pair side by side. Content that changes
 * them decides again with no resize of the pair, as the parts' own boxes
 * stay as wide as their columns: new `first` or `second`, and any change to
 * the nodes or words inside (a `MutationObserver`, which reads no attribute,
 * so the layout's own attributes and a row's cursor never wake it). The
 * widths are the content's own and do not change with the layout chosen,
 * so choosing one cannot loop. The scrollbar's hold is kept while the need
 * stays or shrinks; content that needs more than it did decides without
 * it. A part whose content shrinks to nothing (a listing's names cut by an
 * ellipsis) asks for little; its `from` keeps it apart.
 *
 * It is a layout alone: each part is a group named by its label, in the
 * page's reading order (the first, then the second), and holds no cursor
 * and answers no key; the rows inside follow whatever `RowCursorContext` is
 * around them.
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
  // The layout chosen last, read where the state's updater cannot be: the
  // floor under which no measure runs depends on it.
  const shown = useRef(false);
  // The `from` the last laid-out width was measured against.
  const measuredFrom = useRef<number | null>(null);
  // The room the content needed at the last measure.
  const measuredNeed = useRef(0);
  // Whether the content is as it was at the last measure, so the need read
  // then still holds; a change to the content makes it uncertain.
  const needKnown = useRef(false);
  // The measure of the latest render, given whether the content changed.
  const measureNow = useRef<(contentChanged: boolean) => void>(() => undefined);
  // The parts the last commit drew, to tell new parts from a new `from`.
  const drawn = useRef<readonly [ReactNode, ReactNode]>([first, second]);

  // Measured before the first paint, so the pair never draws in the other
  // layout first. A threshold a prop gives cannot reach a container query,
  // whose conditions read no custom property, so the width is read here.
  useLayoutEffect(() => {
    const element = ref.current;

    if (element === null) return undefined;

    // A width of 0 is a page not laid out (held behind another tab), which
    // keeps its layout. The hold is for a scrollbar the layout itself
    // brought, so the first width measured against a new `from` (as it
    // mounts, as `from` changes, or when a page hidden through the change
    // comes into view) decides without it. The `from` last measured lives
    // in a ref, not in this effect, so an effect that runs again with the
    // same `from` (a page shown again through <Activity>) keeps the hold.
    const measure = (contentChanged: boolean): void => {
      if (contentChanged) needKnown.current = false;

      const width = element.clientWidth;

      if (width === 0) return;

      const holding = shown.current && measuredFrom.current === from;
      let next = false;

      measuredFrom.current = from;
      // Under the floor nothing the content says could stand them side by
      // side, so it is not measured.
      if (width >= (holding ? from - SCROLLBAR_HOLD : from)) {
        // Held under `from` with the content as it was, only the width
        // moved (a scrollbar): the need read last still holds, so the
        // content is not laid out again for it.
        const need =
          holding && width < from && needKnown.current
            ? measuredNeed.current
            : Math.max(from, contentRoom(element));
        // Content that needs more than it did gets no hold: the hold is for
        // a scrollbar, not for content outgrowing its half.
        const hold = holding && need <= measuredNeed.current;

        measuredNeed.current = need;
        needKnown.current = true;
        next = width >= (hold ? need - SCROLLBAR_HOLD : need);
      }
      shown.current = next;
      setSideBySide(next);
    };

    measureNow.current = measure;

    // The content's own changes, which keep the parts' boxes: nodes and
    // words only, never an attribute.
    const content = new MutationObserver(() => measure(true));

    content.observe(element, { characterData: true, childList: true, subtree: true });
    // Optional: jsdom has no ResizeObserver.
    if (typeof ResizeObserver === 'undefined') return () => content.disconnect();

    const observer = new ResizeObserver(() => measure(false));

    // The pair for its room; each part for content that changes its size.
    observer.observe(element);
    for (const part of element.children) observer.observe(part);
    return () => {
      observer.disconnect();
      content.disconnect();
    };
  }, [from]);

  // One measure a commit, after the observers are set: as the pair mounts
  // or comes back into view, as `from` changes, and as new parts from the
  // host decide at once, before the paint.
  useLayoutEffect(() => {
    const changed = drawn.current[0] !== first || drawn.current[1] !== second;

    drawn.current = [first, second];
    measureNow.current(changed);
  }, [from, first, second]);

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
