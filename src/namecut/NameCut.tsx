import { Fragment, useLayoutEffect, useRef, type ReactElement, type RefObject } from 'react';

import { tooltip } from '../tooltip/Tooltip.logic.js';
import { partsText, type CutPart } from './NameCut.logic.js';

/** A name whose first letter is in a right-to-left script reads right to left. */
const RIGHT_TO_LEFT =
  /^[^\p{L}]*[\p{Script=Arabic}\p{Script=Hebrew}\p{Script=Syriac}\p{Script=Thaana}\p{Script=Nko}]/u;

/** The closing quote `nameParts` keeps at a cut name's end. */
const CLOSING_QUOTE = /["”“»«]$/u;

/** The ellipsis a cut head ends in, as the browser draws it for `text-overflow`. */
const ELLIPSIS = '\u2026';

/** A canvas context to measure the ellipsis in a head's own face; created once. */
let measurer: CanvasRenderingContext2D | null | undefined;

/** The width of `text` in `box`'s face, or null where nothing measures text. */
function textWidth(box: HTMLElement, text: string): number | null {
  if (measurer === undefined) {
    try {
      measurer = document.createElement('canvas').getContext('2d');
    } catch {
      measurer = null;
    }
  }
  if (measurer === null) return null;
  // The `font` shorthand reads back empty in some engines; build it.
  const face = getComputedStyle(box);

  measurer.font = `${face.fontStyle} ${face.fontWeight} ${face.fontSize} ${face.fontFamily}`;
  return measurer.measureText(text).width;
}

/**
 * The parts of a line that cut their words with an ellipsis, in the order
 * they give way: a name's head and the words after it first, the words
 * before the name only once those have gone as far as they go.
 */
const CUT_TIERS = ['.name-cut-head, .name-cut-rest', '.name-cut-text'] as const;

/**
 * Narrows a cut box (a name's head, or the words around the name) to the
 * whole characters that fit before its ellipsis, and the ellipsis: the box
 * the line's flex gives it is no whole number of characters, and a box
 * squeezed to its floor is wider than the one character and ellipsis it
 * shows, so a blank would stand after the ellipsis, which reads as a space
 * before the next part. The blank goes to the line's end instead. A box
 * shown whole, or one with nothing to measure, keeps the width the line
 * gives it. Each box is measured with the snap of every earlier tier
 * already held (`useSnappedCuts`).
 */
function snapCut(box: HTMLElement): void {
  const text = box.firstChild;
  const room = box.clientWidth;

  if (!(text instanceof Text) || box.scrollWidth <= room) return;

  const dots = textWidth(box, ELLIPSIS);

  if (dots === null) return;

  // Words that end in a space before the name (and its opening quote,
  // which the cut hides with it) keep a space after their ellipsis, so the
  // cut words do not run into the name. The space comes out of their own
  // room, never out of the parts that give way after them.
  const space =
    box.classList.contains('name-cut-text') && /\s\p{P}?$/u.test(text.data)
      ? (textWidth(box, ' ') ?? 0)
      : 0;
  const fitsIn = room - space;
  const range = document.createRange();
  const prefix = (count: number): number => {
    range.setStart(text, 0);
    range.setEnd(text, count);
    return range.getBoundingClientRect().width;
  };
  // The most characters that, with the ellipsis, fit the room.
  let fits = 0;
  let over = text.length;

  while (over - fits > 1) {
    const middle = Math.floor((fits + over) / 2);

    if (prefix(middle) + dots <= fitsIn) fits = middle;
    else over = middle;
  }
  if (fits === 0) return;

  // Half a pixel more than the characters and the ellipsis: the engine
  // lays boxes out in fractions of a pixel and would round a width set to
  // the exact sum below it, then drop one more character.
  const width = Math.min(prefix(fits) + dots + 0.5, fitsIn);

  if (width === room) return;

  // Held at that width, under the floor the stylesheet keeps for any face:
  // nothing on the line grows, so the room it gives up stands at the
  // line's end.
  box.style.width = `${width}px`;
  box.style.minWidth = `${width}px`;
  box.style.flexShrink = '0';
  if (space > 0) box.style.marginInlineEnd = `${space}px`;
}

/**
 * Keeps each cut box in `line` a whole number of characters wide
 * (`snapCut`) as its box resizes and its parts change. Nothing to do
 * where the engine has no ResizeObserver (jsdom).
 */
function useSnappedCuts(line: RefObject<HTMLElement | null>, parts: readonly CutPart[]): void {
  useLayoutEffect(() => {
    const element = line.current;

    if (element === null || typeof ResizeObserver === 'undefined') return;

    // Every box is let go first, so each is measured against the line as
    // the stylesheet lays it out; then a tier is snapped only once the
    // tier before it holds, since a held box hands back room to the next.
    const snap = (): void => {
      const tiers = CUT_TIERS.map((tier) => [...element.querySelectorAll<HTMLElement>(tier)]);

      for (const box of tiers.flat()) {
        for (const property of ['width', 'min-width', 'flex-shrink', 'margin-inline-end']) {
          box.style.removeProperty(property);
        }
      }
      for (const box of tiers.flat()) snapCut(box);
    };
    const observer = new ResizeObserver(snap);

    observer.observe(element);
    return () => observer.disconnect();
  }, [line, parts]);
}

/** Props for {@link NameCut}. */
export interface NameCutProps {
  /** The line in parts (`labelParts`, `nameParts`). */
  readonly parts: readonly CutPart[];
  /** The box's own class, which sets its type, colour, and size where it is drawn. */
  readonly className?: string;
}

/**
 * A cut name's head and tail, in the order they are seen. A left-to-right
 * name shows its head, then its tail. A right-to-left name is seen the
 * other way round inside the line: its tail (its end) on the left, its
 * head (its start) on the right, then its closing quote, so the quotes
 * still close around it; each box cuts on the side that gives way.
 */
function cutName(head: string, tail: string): ReactElement {
  if (!RIGHT_TO_LEFT.test(head + tail)) {
    return (
      <>
        {head !== '' && <span className="name-cut-head">{head}</span>}
        {/* The box runs right to left for its ellipsis; the name inside
            keeps its own order, as the head does. */}
        <span className="name-cut-tail">
          <bdi dir="ltr">{tail}</bdi>
        </span>
      </>
    );
  }

  const quote = CLOSING_QUOTE.exec(tail)?.[0] ?? '';
  const end = tail.slice(0, tail.length - quote.length);

  return (
    <>
      <span className="name-cut-tail rtl">
        <bdi dir="rtl">{end}</bdi>
      </span>
      {head !== '' && (
        <span className="name-cut-head rtl" dir="rtl">
          {head}
        </span>
      )}
      {quote !== '' && <span className="name-cut-quote">{quote}</span>}
    </>
  );
}

/**
 * A line that names a file, cut so the name keeps its end (`labelParts`,
 * `nameParts`): a long name's head gives way with an ellipsis, the words
 * after the name give way at their end alongside it, the words before it
 * give way at their end only once both have gone as far as they go, and
 * the name's tail, at its front, only once those words have too, so the
 * line always ends in view. A cut head, and cut words around the name, are
 * snapped to whole characters, so an ellipsis meets the next part with no
 * blank between them. A line with a cut name is drawn in parts for
 * sight only, and assistive technology reads it whole once; a line of words
 * alone is drawn and read as it is. The tooltip carries the complete line,
 * including the words around the name. Styled by the `.name-cut` rules;
 * `className` sets the line's type and colour where it is drawn.
 */
export function NameCut({ parts, className }: NameCutProps): ReactElement {
  // Split spans can be read as separate runs, so a cut line is read from
  // one hidden copy; words alone are one span already.
  const cut = parts.some((part) => part.kind === 'name');
  const text = partsText(parts);
  const box = useRef<HTMLSpanElement>(null);

  useSnappedCuts(box, parts);

  return (
    <span className={className ? `name-cut ${className}` : 'name-cut'} ref={box} {...tooltip(text)}>
      {cut && <span className="visually-hidden">{text}</span>}
      <span aria-hidden={cut || undefined} className="name-cut-line">
        {parts.map((part, index) =>
          // A line's parts are fixed in order; their place is their identity.
          part.kind === 'text' ? (
            <span
              // The words that end the line give way alongside a name's
              // head; the words before a name only after both have.
              className={index === parts.length - 1 ? 'name-cut-rest' : 'name-cut-text'}
              key={index}
            >
              {part.text}
            </span>
          ) : (
            // Head and tail sit in the line itself, so its flex sizes them
            // against the words around them.
            <Fragment key={index}>{cutName(part.head, part.tail)}</Fragment>
          )
        )}
      </span>
    </span>
  );
}
