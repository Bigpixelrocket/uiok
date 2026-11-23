import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactElement
} from 'react';

import { Button } from '../button/Button.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import { useLabels } from '../labels/UiokProvider.js';
import {
  canPan,
  fitLayout,
  formatScale,
  panBy,
  placeImage,
  stepScale,
  wheelZoomFactor,
  zoomAbout,
  type ImageLayout,
  type Size
} from './ImageZoom.logic.js';
import { useElementSize } from './useElementSize.js';
import type { ViewerViewProps } from './ViewerViews.js';
import { isViewerEvent } from './ViewerScope.js';

/** How far an arrow key moves a zoomed image. */
const ARROW_PAN_PX = 48;

/** A wheel delta in lines (rare on macOS) as pixels. */
const LINE_PX = 16;

/** Fitted to the window (and refitted as it resizes), or placed by a zoom or a pan. */
type Zoom = { readonly mode: 'fit' } | { readonly mode: 'free'; readonly layout: ImageLayout };

const FIT: Zoom = { mode: 'fit' };

const ARROWS: Readonly<Record<string, readonly [number, number]>> = {
  ArrowUp: [0, ARROW_PAN_PX],
  ArrowDown: [0, -ARROW_PAN_PX],
  ArrowLeft: [ARROW_PAN_PX, 0],
  ArrowRight: [-ARROW_PAN_PX, 0]
};

/** Whether `options` turn the decoded `image` into a bitmap; the bitmap is released at once. */
const rasterizes = (image: HTMLImageElement, options: ImageBitmapOptions): Promise<boolean> =>
  createImageBitmap(image, options).then(
    (bitmap) => {
      bitmap.close();
      return true;
    },
    () => false
  );

/**
 * Whether Chromium gives a decoded SVG natural dimensions, asked of Chromium
 * rather than read from the markup. A size-less SVG (a viewBox alone, or
 * percentages) still reports a natural size, the default object size of 300
 * px wide at its aspect ratio, so the numbers cannot tell. Chromium refuses to
 * rasterize one without both resize dimensions, though: a 1 px wide bitmap is
 * refused and a 1 × 1 one is not. An SVG too large to rasterize at all
 * refuses both, and keeps the size it reported. Each bitmap is one pixel
 * wide, so asking costs a paint of the SVG, never the memory of a full
 * raster.
 */
async function hasNaturalSize(image: HTMLImageElement): Promise<boolean> {
  if (await rasterizes(image, { resizeWidth: 1 })) return true;

  return !(await rasterizes(image, { resizeWidth: 1, resizeHeight: 1 }));
}

/**
 * The image view: Chromium decodes the file straight from its media URL
 * (`info.mediaUrl`) into an `<img>`, so animated GIF, APNG, and
 * WebP play, and nothing here parses the format. An SVG shows the same way,
 * and as an image Chromium runs none of its scripts and loads nothing it
 * references. It opens fitted to the window, over a checkerboard that shows
 * through transparency. ⌘+ and ⌘- step the zoom about the centre, ⌘0 shows
 * actual size, ⌘9 fits again; Command with the wheel, or a pinch, zooms
 * about the pointer; a drag, the wheel, or the arrows pan an image larger
 * than the window. The status bar
 * gives the pixel dimensions, read from the decoded image, and the zoom.
 * An SVG with no size of its own says so instead, and fits by filling the
 * window, since it has no actual size to keep. A file Chromium cannot decode
 * hands the window to its fallback view with a note: hex, or an SVG's source.
 */
function ImageView({ info, onFallback }: ViewerViewProps): ReactElement {
  const labels = useLabels().viewer;
  const svg = info.content.kind === 'svg';
  // Why the view gives way: Chromium could not decode the bytes as the image
  // they claim to be (hex), or could not render an SVG (malformed XML, or not
  // SVG at all), which shows its source.
  const fallbackNote = svg ? labels.image.fallbackSvg : labels.image.fallbackDecode;
  const [canvasRef, viewport] = useElementSize();
  const canvas = useRef<HTMLDivElement | null>(null);
  const setCanvas = useCallback(
    (element: HTMLDivElement | null): void => {
      canvas.current = element;
      canvasRef(element);
    },
    [canvasRef]
  );
  const [natural, setNatural] = useState<Size | null>(null);
  // An SVG with no natural dimensions: `natural` is Chromium's default object size.
  const [sizeless, setSizeless] = useState(false);
  const maxFitScale = sizeless ? Infinity : 1;
  const [zoom, setZoom] = useState<Zoom>(FIT);
  const [dragging, setDragging] = useState(false);
  const dragFrom = useRef<{ x: number; y: number } | null>(null);
  // Counts loads and the unmount, so an SVG size check that settles after
  // the view is gone (a switch to hex or source, a reload's new generation)
  // or after a newer load changes nothing, and least of all falls back.
  const loadCount = useRef(0);

  useEffect(
    () => () => {
      loadCount.current += 1;
    },
    []
  );

  const layout =
    natural && viewport
      ? zoom.mode === 'fit'
        ? fitLayout(natural, viewport, maxFitScale)
        : placeImage(zoom.layout, natural, viewport)
      : null;

  // The latest geometry, for listeners that outlive a render.
  const geometry = useRef({ natural, viewport, sizeless, maxFitScale });
  geometry.current = { natural, viewport, sizeless, maxFitScale };

  /** Applies `change` to the layout as shown now; a no-op until the image and the window are measured. */
  const relayout = useCallback(
    (change: (current: ImageLayout, image: Size, room: Size) => ImageLayout | null): void => {
      setZoom((previous) => {
        const { natural: image, viewport: room, maxFitScale: maxFit } = geometry.current;
        if (!image || !room) return previous;

        const current =
          previous.mode === 'fit'
            ? fitLayout(image, room, maxFit)
            : placeImage(previous.layout, image, room);
        const next = change(current, image, room);

        return next === null ? previous : { mode: 'free', layout: next };
      });
    },
    []
  );

  const zoomTo = useCallback(
    (scale: (current: number) => number, anchor?: { x: number; y: number }): void => {
      relayout((current, image, room) =>
        zoomAbout(
          current,
          scale(current.scale),
          anchor ?? { x: room.width / 2, y: room.height / 2 },
          image,
          room
        )
      );
    },
    [relayout]
  );

  const pan = useCallback(
    (dx: number, dy: number): void => {
      relayout((current, image, room) =>
        canPan(current, image, room) ? panBy(current, dx, dy, image, room) : null
      );
    },
    [relayout]
  );

  const fit = useCallback(() => setZoom(FIT), []);
  // A size-less SVG has no actual size: its natural size is only Chromium's default.
  const actualSize = useCallback(() => {
    if (!geometry.current.sizeless) zoomTo(() => 1);
  }, [zoomTo]);

  // The zoom chords and arrows answer anywhere in the viewer, or with nothing
  // focused; a control of the page beside it keeps its own keys, and a key a
  // control in the viewer already handled (the mode switch's arrows) does
  // nothing more.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.defaultPrevented || !isViewerEvent(event)) return;
      const command = event.metaKey && !event.ctrlKey && !event.altKey;
      const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
      const arrow = Object.hasOwn(ARROWS, event.key) ? ARROWS[event.key] : undefined;

      if (command && (event.code === 'Equal' || event.key === '+')) zoomTo((s) => stepScale(s, 1));
      else if (command && event.code === 'Minus') zoomTo((s) => stepScale(s, -1));
      else if (command && event.code === 'Digit0') actualSize();
      else if (command && event.code === 'Digit9') fit();
      else if (plain && arrow) pan(arrow[0], arrow[1]);
      else return;

      event.preventDefault();
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actualSize, fit, pan, zoomTo]);

  // A native listener, since React's wheel listener is passive and could
  // not stop the page from scrolling. A pinch arrives as a wheel with
  // Control held.
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;

    const onWheel = (event: WheelEvent): void => {
      event.preventDefault();
      const unit = event.deltaMode === WheelEvent.DOM_DELTA_LINE ? LINE_PX : 1;

      if (event.ctrlKey || event.metaKey) {
        const box = element.getBoundingClientRect();
        zoomTo((s) => s * wheelZoomFactor(event.deltaY * unit), {
          x: event.clientX - box.left,
          y: event.clientY - box.top
        });
      } else {
        pan(-event.deltaX * unit, -event.deltaY * unit);
      }
    };

    element.addEventListener('wheel', onWheel, { passive: false });

    return () => element.removeEventListener('wheel', onWheel);
  }, [pan, zoomTo]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || !layout || !natural || !viewport) return;
    if (!canPan(layout, natural, viewport)) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragFrom.current = { x: event.clientX, y: event.clientY };
    setDragging(true);
  };

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const from = dragFrom.current;
    if (!from) return;

    dragFrom.current = { x: event.clientX, y: event.clientY };
    pan(event.clientX - from.x, event.clientY - from.y);
  };

  const endDrag = (): void => {
    dragFrom.current = null;
    setDragging(false);
  };

  const pannable =
    layout !== null && natural !== null && viewport !== null && canPan(layout, natural, viewport);

  return (
    <div className="image-view">
      <div
        className="image-canvas"
        data-dragging={dragging}
        data-pannable={pannable}
        onPointerCancel={endDrag}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        ref={setCanvas}
      >
        <img
          alt={info.name}
          decoding="async"
          draggable={false}
          onError={() => onFallback(fallbackNote)}
          onLoad={(event) => {
            const image = event.currentTarget;
            const { naturalWidth: width, naturalHeight: height } = image;

            if (svg) {
              loadCount.current += 1;
              const load = loadCount.current;

              void hasNaturalSize(image).then((intrinsic) => {
                if (load !== loadCount.current) return;

                if (!intrinsic) {
                  // Chromium rounds the default size of a very wide or tall
                  // viewBox to 0 on its short side; one pixel keeps a box to
                  // fill, and the SVG still draws at its own aspect ratio in it.
                  setSizeless(true);
                  setNatural({ width: Math.max(width, 1), height: Math.max(height, 1) });
                } else if (width > 0 && height > 0) {
                  setNatural({ width, height });
                } else {
                  onFallback(fallbackNote);
                }
              });
            } else if (width > 0 && height > 0) {
              setNatural({ width, height });
            } else {
              onFallback(fallbackNote);
            }
          }}
          src={info.mediaUrl}
          style={
            layout && natural
              ? {
                  width: natural.width * layout.scale,
                  height: natural.height * layout.scale,
                  transform: `translate(${layout.x}px, ${layout.y}px)`
                }
              : { visibility: 'hidden' }
          }
        />
      </div>
      <footer className="viewer-status image-status">
        <span className="image-facts">
          {/* An SVG that sets no size of its own (a viewBox alone, or percentages) says so. */}
          {natural
            ? sizeless
              ? labels.image.noIntrinsicSize
              : labels.image.pixelSize(labels.number(natural.width), labels.number(natural.height))
            : labels.image.loading}
          {layout && !sizeless ? <span>{formatScale(layout.scale, labels)}</span> : null}
        </span>
        <Button
          disabled={zoom.mode === 'fit'}
          onClick={fit}
          size="small"
          {...tooltip(labels.image.fitTooltip, '⌘9')}
        >
          {labels.image.fit}
        </Button>
        <Button
          disabled={layout === null || sizeless || (zoom.mode === 'free' && layout.scale === 1)}
          onClick={actualSize}
          size="small"
          {...tooltip(labels.image.actualSize, '⌘0')}
        >
          {labels.image.actualSize}
        </Button>
      </footer>
    </div>
  );
}

export default ImageView;
