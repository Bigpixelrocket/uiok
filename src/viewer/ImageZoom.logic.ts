/**
 * Pure geometry behind the image view: the scale that fits an image in the
 * window, the zoom steps, zooming about a point, and panning, all clamped so
 * an image smaller than the window sits centred and a larger one never
 * leaves a gap at an edge. Sizes and positions are CSS pixels; one image
 * pixel per CSS pixel is actual size.
 */

import type { ViewerLabels } from '../labels/viewer.js';

/** A width and a height in pixels. */
export interface Size {
  readonly width: number;
  readonly height: number;
}

/** Where the image sits: its scale, and its top-left corner in the viewport. */
export interface ImageLayout {
  readonly scale: number;
  readonly x: number;
  readonly y: number;
}

/** The deepest zoom: an image pixel 64 screen points wide. */
export const MAX_SCALE = 64;

/** The farthest zoom out, unless fitting a huge image takes it farther. */
export const MIN_SCALE = 1 / 64;

/**
 * The scales ⌘+ and ⌘- step through, as the percentages people expect.
 * Fit and a wheel or pinch can land between them; a step goes to the next
 * one past the current scale.
 */
export const ZOOM_STEPS: readonly number[] = [
  1 / 64,
  1 / 32,
  1 / 16,
  1 / 12,
  1 / 8,
  1 / 6,
  1 / 4,
  1 / 3,
  1 / 2,
  2 / 3,
  1,
  1.5,
  2,
  3,
  4,
  6,
  8,
  12,
  16,
  24,
  32,
  48,
  64
];

/**
 * The scale that shows the whole image in the viewport: shrunk to fit, but
 * never enlarged past `maxScale`. That is actual size by default, so an icon
 * opens crisp rather than blown up; an SVG with no size of its own has no
 * actual size, and passes Infinity to fill the viewport. 1 while either size
 * is unknown.
 */
export function fitScale(image: Size, viewport: Size, maxScale = 1): number {
  if (image.width <= 0 || image.height <= 0 || viewport.width <= 0 || viewport.height <= 0) {
    return 1;
  }

  return Math.min(maxScale, viewport.width / image.width, viewport.height / image.height);
}

/** The zoom range for this image in this viewport: fitting a huge image may go below `MIN_SCALE`. */
export function clampScale(scale: number, image: Size, viewport: Size): number {
  return Math.min(MAX_SCALE, Math.max(Math.min(MIN_SCALE, fitScale(image, viewport)), scale));
}

/** One axis: centred when the image is narrower than the viewport, else no gap at either edge. */
const clampAxis = (position: number, extent: number, room: number): number =>
  extent <= room
    ? Math.round((room - extent) / 2)
    : Math.round(Math.min(0, Math.max(room - extent, position)));

/** The layout with its scale in range and its position clamped to the viewport. */
export function placeImage(layout: ImageLayout, image: Size, viewport: Size): ImageLayout {
  const scale = clampScale(layout.scale, image, viewport);

  return {
    scale,
    x: clampAxis(layout.x, image.width * scale, viewport.width),
    y: clampAxis(layout.y, image.height * scale, viewport.height)
  };
}

/** The whole image, fitted and centred, enlarged at most to `maxScale` (see `fitScale`). */
export function fitLayout(image: Size, viewport: Size, maxScale = 1): ImageLayout {
  return placeImage({ scale: fitScale(image, viewport, maxScale), x: 0, y: 0 }, image, viewport);
}

/**
 * Rescales to `scale` about `anchor` (a point in the viewport), so the image
 * pixel under the anchor stays under it, as far as the edges allow.
 */
export function zoomAbout(
  layout: ImageLayout,
  scale: number,
  anchor: { readonly x: number; readonly y: number },
  image: Size,
  viewport: Size
): ImageLayout {
  const next = clampScale(scale, image, viewport);
  const ratio = next / layout.scale;

  return placeImage(
    {
      scale: next,
      x: anchor.x - (anchor.x - layout.x) * ratio,
      y: anchor.y - (anchor.y - layout.y) * ratio
    },
    image,
    viewport
  );
}

/**
 * The next zoom step past `scale` in `direction` (1 in, -1 out), or the end
 * of the ladder. Past the end a step stays put: a huge image fitted below
 * `MIN_SCALE` has no step out, and must not jump in.
 */
export function stepScale(scale: number, direction: 1 | -1): number {
  // A scale within a hair of a step counts as on it, so ⌘+ from 100% goes to 150%.
  const tolerance = 1e-6;

  if (direction === 1) {
    return ZOOM_STEPS.find((step) => step > scale * (1 + tolerance)) ?? MAX_SCALE;
  }

  return (
    [...ZOOM_STEPS].reverse().find((step) => step < scale * (1 - tolerance)) ??
    Math.min(scale, MIN_SCALE)
  );
}

/** The scale factor for one wheel or pinch event: a pinch moves a little, a notch about 1.4×. */
export function wheelZoomFactor(deltaY: number): number {
  return 2 ** (-Math.max(-50, Math.min(50, deltaY)) / 100);
}

/** Moves the image by (dx, dy), clamped so it never leaves a gap at an edge. */
export function panBy(
  layout: ImageLayout,
  dx: number,
  dy: number,
  image: Size,
  viewport: Size
): ImageLayout {
  return placeImage({ ...layout, x: layout.x + dx, y: layout.y + dy }, image, viewport);
}

/** Whether the image is larger than the viewport along either axis, so a drag or an arrow moves it. */
export function canPan(layout: ImageLayout, image: Size, viewport: Size): boolean {
  return (
    image.width * layout.scale > viewport.width || image.height * layout.scale > viewport.height
  );
}

/** The scale as a whole percentage: "25%", "100%", "1600%"; under 1% keeps one decimal. */
export function formatScale(scale: number, labels: ViewerLabels): string {
  const percent = scale * 100;

  return labels.image.scale(percent < 1 ? percent.toFixed(1) : String(Math.round(percent)));
}
