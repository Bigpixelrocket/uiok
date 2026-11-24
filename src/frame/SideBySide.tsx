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
 * A one-line `FilterChips` row, which scrolls its chips sideways: a scroll
 * container's own box says nothing of the chips it holds (in a listing's
 * flexible column it lays out nearly nothing wide).
 */
const SCROLLING_CHIPS = '.pane-quick-row:not(.pane-quick-row-wrap)';

/**
 * How much wider `part` needs to be for its widest one-line chip row to
 * show every chip, as laid out now: the width that row hides, which the
 * part's own box does not count.
 */
const hiddenChips = (part: Element): number => {
  let hidden = 0;

  for (const row of part.querySelectorAll(SCROLLING_CHIPS)) {
    hidden = Math.max(hidden, row.scrollWidth - row.clientWidth);
  }
  return hidden;
};

/**
 * A chip row's content width, whatever room its box has: the chips laid
 * end to end, read from a range over its contents. `scrollWidth` is no
 * measure of it, since a row that fits reports its own width, room to
 * spare included. A document without range geometry reads `scrollWidth`.
 */
const chipsExtent = (row: Element): number => {
  const chips = document.createRange();

  chips.selectNodeContents(row);
  return typeof chips.getBoundingClientRect === 'function'
    ? chips.getBoundingClientRect().width
    : row.scrollWidth;
};

/**
 * A pop-up button (a `Select`, a native `select` that is no list box): it
 * stands at its items' width but is held to its column (`max-width:
 * 100%`, in a form), or kept whole and clipped by its cell (in a
 * listing), so a narrow half cuts its words at their end, which no box it
 * sits in reports. Its content width is read with the hold lifted
 * (`data-natural`, which the stylesheet reads).
 */
const POP_UP_BUTTONS = 'select:not([multiple], [size])';

/** A horizontal span, left to right, in the viewport's pixels. */
interface Span {
  readonly left: number;
  readonly right: number;
}

/** Where two spans overlap: empty (`right <= left`) where they do not. */
const overlap = (a: Span, b: Span): Span => ({
  left: Math.max(a.left, b.left),
  right: Math.min(a.right, b.right)
});

/** A box's span inside its borders and, with `padded`, inside its padding too. */
const innerSpan = (box: Element, padded: boolean): Span => {
  const rect = box.getBoundingClientRect();
  const style = getComputedStyle(box);
  const inset = (side: 'Left' | 'Right'): number =>
    (parseFloat(style[`border${side}Width`]) || 0) +
    (padded ? parseFloat(style[`padding${side}`]) || 0 : 0);

  return { left: rect.left + inset('Left'), right: rect.right - inset('Right') };
};

/**
 * What a pop-up button shows and the room it is given, in pixels, in its
 * half: the span it can show is its part's, narrowed by every box up to
 * the part that clips what overflows it (a listing's cell); it `shows`
 * its own span within that, on either side (a right-to-left cell clips
 * its start), and its `room` is its holder's content box within that (a
 * form's value column, a listing's cell), so room a squeezed column had
 * to spare counts. A box with no laid-out edges (a document without
 * layout) clips nothing.
 */
const popUpSpace = (button: Element): { readonly shows: number; readonly room: number } => {
  const part = button.closest('.side-by-side-part');
  const own = button.getBoundingClientRect();
  const finite = (span: Span): boolean => Number.isFinite(span.left) && Number.isFinite(span.right);
  // Narrows `span` by `by`, where `by` has laid-out edges.
  const within = (span: Span, by: Span): Span => (finite(by) ? overlap(span, by) : span);
  const width = (span: Span): number => Math.max(0, span.right - span.left);
  let seen: Span = { left: -Infinity, right: Infinity };

  if (part !== null) seen = within(seen, innerSpan(part, false));
  for (let box = button.parentElement; box !== null && box !== part; box = box.parentElement) {
    const overflow = getComputedStyle(box).overflowX;

    // An empty value is no style read (a document without a stylesheet): no clip.
    if (overflow !== '' && overflow !== 'visible') seen = within(seen, innerSpan(box, false));
  }
  const drawn = within(seen, { left: own.left, right: own.right });
  const holder =
    button.parentElement === null ? seen : within(seen, innerSpan(button.parentElement, true));

  return {
    shows: finite(drawn) ? width(drawn) : own.width,
    room: finite(holder) ? width(holder) : own.width
  };
};

/** The controls a half can cut without its own box growing: one-line chip rows and pop-up buttons. */
const CUT_CONTROLS = `${SCROLLING_CHIPS}, ${POP_UP_BUTTONS}`;

/**
 * What the controls a half can cut show with the parts in their two
 * halves, in document order (the chip rows, then the pop-up buttons): the
 * most any of them hides, in pixels, and each one's room, its content
 * width, and what it hides. A chip row's room is its `clientWidth` and its
 * content its chips end to end (`chipsExtent`); a pop-up button's room is
 * its holder's width as drawn (`popUpSpace`), its content the width it
 * takes with nothing holding it to its column, and what it hides that
 * content less what it shows (its span within every box that clips it).
 */
interface ControlsInHalves {
  /** How many of the controls, the first ones, are chip rows; the rest are pop-up buttons. */
  readonly chips: number;
  readonly hidden: number;
  readonly rooms: readonly number[];
  readonly extents: readonly number[];
  readonly hiddens: readonly number[];
}

/**
 * Reads the controls a half can cut (`CUT_CONTROLS`) with the parts in
 * their two halves: the columns laid out side by side for one read
 * (`data-layout`), and, with pop-up buttons among them, once more with
 * their hold lifted (`data-natural`), each put back before the browser
 * paints. `hiddenChips` only bounds the room from below: a listing whose
 * flexible columns share the extra width gives its chips only part of it,
 * so the halves are read as they would be drawn. A pair with no such
 * control needs no read. A stacked pair keeps `stackedHeight`, its height
 * read before the measure touched its layout, through the read (two
 * columns are shorter than one stack), so a scrolled pane around it never
 * has its scroll clamped by it.
 */
const controlsInHalves = (element: HTMLElement, stackedHeight: number | null): ControlsInHalves => {
  const rows = [...element.querySelectorAll(SCROLLING_CHIPS)];
  const buttons = [...element.querySelectorAll(POP_UP_BUTTONS)];

  if (rows.length + buttons.length === 0) {
    return { chips: 0, hidden: 0, rooms: [], extents: [], hiddens: [] };
  }
  const layout = element.getAttribute('data-layout');
  const height = element.style.minHeight;

  if (stackedHeight !== null) element.style.minHeight = `${stackedHeight}px`;
  element.setAttribute('data-layout', 'side-by-side');
  const rooms: number[] = [];
  const extents: number[] = [];
  const hiddens: number[] = [];

  for (const row of rows) {
    rooms.push(row.clientWidth);
    extents.push(chipsExtent(row));
    hiddens.push(row.scrollWidth - row.clientWidth);
  }
  if (buttons.length > 0) {
    // What each shows as drawn, and the room its holder gives it.
    const spaces = buttons.map(popUpSpace);

    element.setAttribute('data-natural', '');
    buttons.forEach((button, index) => {
      const natural = button.getBoundingClientRect().width;
      const space = spaces[index] ?? { shows: natural, room: natural };

      rooms.push(space.room);
      extents.push(natural);
      hiddens.push(natural - space.shows);
    });
    element.removeAttribute('data-natural');
  }
  if (layout === null) element.removeAttribute('data-layout');
  else element.setAttribute('data-layout', layout);
  element.style.minHeight = height;
  return { chips: rows.length, hidden: Math.max(0, ...hiddens), rooms, extents, hiddens };
};

/**
 * Whether a held pair's cut controls hide only what a scrollbar took from
 * them: the same controls in the same order as where they last all showed
 * whole (`fit`), and each one that hides now has lost no more room than
 * `lost` (half the pair's narrowing, what a scrollbar takes from a half,
 * and a pixel for rounding) and holds content no wider than it did there
 * (to half a pixel, as a range reads fractions). So neither content that
 * grew, even into room the control had to spare, nor a column beside it
 * that grew and took more, leaves anything hidden.
 */
const controlsHeld = (fit: ControlsInHalves, now: ControlsInHalves, lost: number): boolean =>
  fit.chips === now.chips &&
  fit.rooms.length === now.rooms.length &&
  now.hiddens.every(
    (hidden, index) =>
      hidden < 1 ||
      ((now.rooms[index] ?? 0) >= (fit.rooms[index] ?? 0) - lost - 1 &&
        (now.extents[index] ?? 0) <= (fit.extents[index] ?? 0) + 0.5)
  );

/**
 * The room the two parts need to stand side by side, in pixels: twice the
 * wider part's min-content width, as the columns are equal, a one-line
 * chip row counted at its full content width (`hiddenChips`), so chips
 * that would scroll out of sight in a half stack the pair. Measured by
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
    first.getBoundingClientRect().width + hiddenChips(first),
    second.getBoundingClientRect().width + hiddenChips(second)
  );

  element.removeAttribute('data-measuring');
  return Math.ceil(widest * 2);
};

/**
 * Two of a page's listings or sections, side by side in equal columns while
 * the room the pair is given is `from` pixels wide or more and each part
 * fits its half at its min-content width, one over the other otherwise, a
 * hairline between them either way. So wide content (a form whose labels
 * and fields will not narrow, long unbreakable words, a one-line
 * `FilterChips` row whose chips would scroll) stacks though the
 * room passes `from`, and `from` stays a floor under which the pair never
 * stands side by side. Once side by side, it stacks only under the room it
 * needs less a scrollbar's width, so a scrollbar the two columns bring
 * cannot flip it back and forth; a changed `from` applies whole to the
 * first width measured against it. The room is the pair's own, measured as
 * it resizes (`data-layout`: `side-by-side` or `stacked`), so a pane
 * narrowed by its sidebar or a split stacks them though the window is wide.
 *
 * A one-line chip row counts at its whole width, and the halves are then
 * checked as drawn, so no chip scrolls out of sight and no pop-up button
 * (a `Select`) is cut in a half.
 *
 * The min-content widths are read in the same `ResizeObserver` callback
 * that reads the room (one forced layout per resize frame, two with a
 * one-line chip row and three with a pop-up button, never a read and
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
  // Where every chip row last showed all its chips in the halves: the
  // pair's width, and each row's room and content. A held pair narrowed
  // under that width by no more than a scrollbar's may hide chips only as
  // `controlsHeld` allows: each hiding row has lost no more room than half the
  // narrowing, and its content has not grown. Content that changes keeps
  // it, so a host drawing its parts again (new elements, the same chips)
  // keeps the hold, and chips or a column beside them that grow stack it.
  const controlsFit = useRef<{ readonly width: number; readonly read: ControlsInHalves } | null>(
    null
  );
  // The measure of the latest render, given whether the content changed.
  const measureNow = useRef<(contentChanged: boolean) => void>(() => undefined);
  // The watch on the content's own changes, whose records a measure in the
  // commit that made them takes, so the change is measured once.
  const contentWatch = useRef<MutationObserver | null>(null);
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

      // A stacked pair's height, read in the same flush as its width, for
      // the halves read to keep (`controlsInHalves`); only with such controls.
      const stackedHeight =
        element.getAttribute('data-layout') !== 'side-by-side' &&
        element.querySelector(CUT_CONTROLS) !== null
          ? element.offsetHeight
          : null;

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
        // Chips are read in the halves themselves. Held, and narrowed by
        // no more than a scrollbar's width under where they last showed
        // whole, a row may hide only what the narrowing took from it
        // (`controlsHeld`); chips that grew, or a column beside them that grew,
        // get no room.
        if (width >= (hold ? need - SCROLLBAR_HOLD : need)) {
          const read = controlsInHalves(element, stackedHeight);
          const fit = controlsFit.current;

          if (read.hidden < 1) controlsFit.current = { width, read };
          next =
            read.hidden < 1 ||
            (hold &&
              fit !== null &&
              width < fit.width &&
              width >= fit.width - SCROLLBAR_HOLD &&
              controlsHeld(fit.read, read, (fit.width - width) / 2));
        }
      }
      shown.current = next;
      setSideBySide(next);
    };

    measureNow.current = measure;

    // The content's own changes, which keep the parts' boxes: nodes and
    // words only, never an attribute.
    const content = new MutationObserver(() => measure(true));

    contentWatch.current = content;

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
    // This commit's own changes, measured here, are not measured again
    // when the watch would deliver them.
    const pending = (contentWatch.current?.takeRecords().length ?? 0) > 0;

    measureNow.current(changed || pending);
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
