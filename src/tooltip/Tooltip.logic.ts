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
}

/**
 * Gives an element a tooltip: a short title and, for a verb the keyboard also
 * runs, its chord. Pass the chord itself (`{ key: 't', meta: true }`) and the
 * tooltip draws it with the same key glyphs as a legend's caps; a chord
 * already written as text ("⌘T") is printed as given. Spread the result onto
 * the element; without a label the element gets no tooltip. Every hover
 * tooltip goes through here, never the `title` attribute.
 */
export function tooltip(
  label: string | null | undefined,
  shortcut?: string | Chord | null
): TooltipAttributes {
  if (!label) {
    return {};
  }

  if (!shortcut) {
    return { 'data-tooltip': label };
  }

  return typeof shortcut === 'string'
    ? { 'data-tooltip': label, 'data-tooltip-shortcut': shortcut }
    : {
        'data-tooltip': label,
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
 * taller than its box. Without a label the element gets no tooltip.
 */
export function cutTooltip(label: string | null | undefined): TooltipAttributes {
  return label ? { 'data-tooltip': label, 'data-tooltip-cut': '' } : {};
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
 * and reaches a screen reader too.
 */
export function describedTooltip(
  text: string | null | undefined
): TooltipAttributes & { readonly 'aria-description'?: string } {
  return text ? { ...tooltip(text), 'aria-description': text } : {};
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

/**
 * Places a tooltip under its control, centred on it. A control wider than
 * its tooltip (a strip of empty ground) centres the tooltip on the pointer
 * instead, without letting it run past the control's ends, so the tooltip
 * opens where the eye is. It opens above when the window ends too soon below
 * and there is room above, and it slides sideways to stay inside the window.
 */
export function placeTooltip(
  anchor: TooltipAnchorBox,
  tip: TooltipExtent,
  viewport: TooltipExtent,
  pointerX: number
): TooltipPosition {
  const below = anchor.top + anchor.height + GAP;
  const above = anchor.top - GAP - tip.height;
  const fitsBelow = below + tip.height <= viewport.height - MARGIN;
  const half = tip.width / 2;
  const centre =
    anchor.width > tip.width
      ? Math.max(anchor.left + half, Math.min(pointerX, anchor.left + anchor.width - half))
      : anchor.left + anchor.width / 2;

  return {
    left: Math.max(MARGIN, Math.min(centre - half, viewport.width - tip.width - MARGIN)),
    top: fitsBelow || above < MARGIN ? below : above
  };
}
