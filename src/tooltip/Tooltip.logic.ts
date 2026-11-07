/** The attributes that give an element a tooltip; `TooltipLayer` reads them on hover. */
export interface TooltipAttributes {
  readonly 'data-tooltip'?: string;
  readonly 'data-tooltip-shortcut'?: string;
}

/**
 * Gives an element a tooltip: a short title and, for a verb the keyboard also
 * runs, its chord as text ("⌘T"). Spread the result onto the element; without
 * a label the element gets no tooltip. Every hover tooltip goes through
 * here, never the `title` attribute.
 */
export function tooltip(
  label: string | null | undefined,
  shortcut?: string | null
): TooltipAttributes {
  if (!label) {
    return {};
  }

  return shortcut
    ? { 'data-tooltip': label, 'data-tooltip-shortcut': shortcut }
    : { 'data-tooltip': label };
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
