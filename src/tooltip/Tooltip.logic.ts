import type { Chord } from '../keyboard/Keyboard.logic.js';
import { chordGlyphs } from '../keyboard/KeyChord.logic.js';

/** The attributes that give an element a tooltip; `TooltipLayer` reads them on hover. */
export interface TooltipAttributes {
  readonly 'data-tooltip'?: string;
  /** The chord as text ("⌘T"), for a reader that does not draw key glyphs. */
  readonly 'data-tooltip-shortcut'?: string;
  /** The chord as data, which `TooltipLayer` draws with the key glyphs of every legend. */
  readonly 'data-tooltip-chord'?: string;
  /** Present when the tooltip only shows while the element cuts its own text. */
  readonly 'data-tooltip-cut'?: string;
  /** Present when the text is a value (a path, a name), set in monospace. */
  readonly 'data-tooltip-value'?: string;
  /** The side the tooltip opens on, when not below or above its element. */
  readonly 'data-tooltip-side'?: TooltipSide;
}

/**
 * A side a tooltip may open on instead of below or above: `end` is the
 * inline end of the element (right in a left-to-right page), `start` the
 * other. A tool rail on a window's edge opens its tooltips toward the
 * content so they never cover the next tool.
 */
export type TooltipSide = 'start' | 'end';

/** How a tooltip is drawn and placed, beyond what it says. */
export interface TooltipOptions {
  /**
   * The text is a value the user could type or copy (a path, a name, a
   * command): it is set in monospace, as the value is everywhere else.
   */
  readonly value?: boolean;
  /** Open beside the element instead of below it. */
  readonly side?: TooltipSide;
}

const optionAttributes = (options: TooltipOptions | undefined): TooltipAttributes => ({
  ...(options?.value ? { 'data-tooltip-value': '' } : {}),
  ...(options?.side ? { 'data-tooltip-side': options.side } : {})
});

/**
 * Gives an element a tooltip: a short title and, for a verb the keyboard also
 * runs, its chord. Pass the chord itself (`{ key: 't', meta: true }`) and the
 * tooltip draws it with the same key glyphs as a legend's caps; a chord
 * already written as text ("⌘T") is printed as given. Spread the result onto
 * the element; without a label the element gets no tooltip. Every hover
 * tooltip goes through here, never the `title` attribute. `options` may set
 * the text in monospace (`value`) or open it beside the element (`side`).
 */
export function tooltip(
  label: string | null | undefined,
  shortcut?: string | Chord | null,
  options?: TooltipOptions
): TooltipAttributes {
  if (!label) {
    return {};
  }

  const shown = { 'data-tooltip': label, ...optionAttributes(options) };

  if (!shortcut) {
    return shown;
  }

  return typeof shortcut === 'string'
    ? { ...shown, 'data-tooltip-shortcut': shortcut }
    : {
        ...shown,
        'data-tooltip-shortcut': chordGlyphs(shortcut),
        'data-tooltip-chord': JSON.stringify(shortcut)
      };
}

/**
 * Reads back a chord `tooltip()` wrote as data, or null when the attribute
 * is missing or is not a chord, in which case the text form is shown.
 */
export function tooltipChord(data: string | null): Chord | null {
  if (data === null) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(data);
    const chord = parsed as Partial<Record<keyof Chord, unknown>> | null;

    return chord !== null &&
      typeof chord === 'object' &&
      typeof chord.key === 'string' &&
      (['ctrl', 'alt', 'shift', 'meta'] as const).every(
        (mod) => chord[mod] === undefined || typeof chord[mod] === 'boolean'
      )
      ? (chord as Chord)
      : null;
  } catch {
    return null;
  }
}

/**
 * An element's own text as its tooltip, shown only while the element cuts
 * that text (an ellipsis on a name too long for its column), so a tooltip
 * never repeats words that are already in full view. The element itself
 * must be the box that clips (`overflow: hidden` with an ellipsis):
 * `TooltipLayer` opens it only while the element's content is wider or
 * taller than its box. Without a label the element gets no tooltip. The
 * tooltip takes the element's face: an element set in monospace (a name, a
 * status line) gets a monospace tooltip.
 */
export function cutTooltip(label: string | null | undefined): TooltipAttributes {
  return label ? { 'data-tooltip': label, 'data-tooltip-cut': '' } : {};
}

/**
 * Whether a computed `font-family` list is a monospace stack (its generic
 * family is `monospace`), so a tooltip completing that text keeps its face.
 */
export function isMonospaceFamily(fontFamily: string): boolean {
  const families = fontFamily.split(',');

  return families[families.length - 1]?.trim().replace(/['"]/g, '') === 'monospace';
}

/** Whether an element marked with `cutTooltip` cuts its text now, and so may show it. */
export function cutsItsText(element: Element): boolean {
  return element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
}

/**
 * A tooltip that tells more than its element already says: more than a
 * control's name (a whole path, what a press will do), or more than a label's
 * text (what a pill stands for, a failure's raw detail). The pointer alone
 * opens a tooltip, so the same text is the element's accessible description
 * and reaches a screen reader too. Pass `{ value: true }` when the text is a
 * path or a name, so it is set in monospace; `side` opens it beside the
 * element.
 */
export function describedTooltip(
  text: string | null | undefined,
  options?: TooltipOptions
): TooltipAttributes & { readonly 'aria-description'?: string } {
  return text ? { ...tooltip(text, null, options), 'aria-description': text } : {};
}

/** How long the pointer rests on a control before its tooltip opens. */
export const TOOLTIP_DELAY_MS = 500;

/** The space between a control and its tooltip. */
const GAP = 6;
/** The closest a tooltip comes to the window's edge. */
const MARGIN = 6;

/** A control's box in the window, as `getBoundingClientRect` reports it. */
export interface TooltipAnchorBox {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

/** A width and a height: the tooltip's own box, or the window's. */
export interface TooltipExtent {
  readonly width: number;
  readonly height: number;
}

/** Where a tooltip's top left corner goes, in window coordinates. */
export interface TooltipPosition {
  readonly left: number;
  readonly top: number;
}

/** The physical side a tooltip opens on, once the page's direction is known. */
export type TooltipBeside = 'left' | 'right';

/**
 * Places a tooltip under its control. A tooltip wider than its control hangs
 * from the control's leading edge (the left, or the right in a right-to-left
 * page), as a desktop tooltip starts where the pointer is, so one on a short
 * label at the start of a row does not spread back over the pane beside it.
 * A glyph button keeps its tooltip centred under it: the caller says
 * which anchors are one (`glyph`, by what the anchor is: a control no wider
 * than it is tall), so a short label, a status line, or any other text
 * keeps the leading edge whatever its box; without `glyph` a box no wider
 * than it is tall is taken for one. A control wider than its tooltip (a strip of empty
 * ground) centres the tooltip on the pointer instead, without letting it run
 * past the control's ends, so the tooltip opens where the eye is. It opens
 * above when the window ends too soon below and there is room above, and it
 * slides sideways to stay inside the window.
 *
 * Given `beside`, it opens on that side of the control instead, centred on
 * its height and kept inside the window; on the other side when the window
 * ends too soon, and below as usual when neither side has room.
 */
export function placeTooltip(
  anchor: TooltipAnchorBox,
  tip: TooltipExtent,
  viewport: TooltipExtent,
  pointerX: number,
  beside?: TooltipBeside | null,
  rtl = false,
  glyph: boolean = anchor.width <= anchor.height
): TooltipPosition {
  if (beside) {
    const right = anchor.left + anchor.width + GAP;
    const left = anchor.left - GAP - tip.width;
    const fitsRight = right + tip.width <= viewport.width - MARGIN;
    const fitsLeft = left >= MARGIN;
    const x =
      beside === 'right'
        ? fitsRight
          ? right
          : fitsLeft
            ? left
            : null
        : fitsLeft
          ? left
          : fitsRight
            ? right
            : null;

    if (x !== null) {
      const middle = anchor.top + anchor.height / 2 - tip.height / 2;

      return {
        left: x,
        top: Math.max(MARGIN, Math.min(middle, viewport.height - tip.height - MARGIN))
      };
    }
  }

  const below = anchor.top + anchor.height + GAP;
  const above = anchor.top - GAP - tip.height;
  const fitsBelow = below + tip.height <= viewport.height - MARGIN;
  const half = tip.width / 2;
  const x =
    anchor.width > tip.width
      ? Math.max(anchor.left + half, Math.min(pointerX, anchor.left + anchor.width - half)) - half
      : glyph
        ? anchor.left + anchor.width / 2 - half
        : rtl
          ? anchor.left + anchor.width - tip.width
          : anchor.left;

  return {
    left: Math.max(MARGIN, Math.min(x, viewport.width - tip.width - MARGIN)),
    top: fitsBelow || above < MARGIN ? below : above
  };
}
