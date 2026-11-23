import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ViewerReader, ViewerFileInfo } from './types.js';

import ImageView from './ImageView.js';

const IMAGE_DECODE_FALLBACK = 'Could not decode this image, so it shows in hex.';
const SVG_RENDER_FALLBACK = 'Could not render this SVG, so it shows its source.';
const SVG_NO_INTRINSIC_SIZE = 'No intrinsic size';

const MEDIA_URL = `viewer-media://file/${'a'.repeat(64)}`;

const info: ViewerFileInfo = {
  generation: 0,
  name: 'photo.png',
  sizeBytes: 1_000_000,
  modifiedMs: 0,
  content: { kind: 'image', mimeType: 'image/png' },
  change: 'none',
  mediaUrl: MEDIA_URL
};

/** The view never reads through its reader: Chromium loads the image from the media URL. */
const reader = {} as ViewerReader;

/** Reports every observed element as an 800 × 600 box, as the window's canvas would be. */
class FixedResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}

  observe(): void {
    this.callback(
      [{ contentRect: { width: 800, height: 600 } } as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }

  disconnect(): void {}

  unobserve(): void {}
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FixedResizeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Renders the view and lets the image "decode" at `width` × `height`. */
const renderLoaded = (width: number, height: number, file: ViewerFileInfo = info) => {
  const onFallback = vi.fn();
  render(<ImageView reader={reader} info={file} onFallback={onFallback} />);
  const image = screen.getByAltText(file.name) as HTMLImageElement;

  Object.defineProperty(image, 'naturalWidth', { value: width });
  Object.defineProperty(image, 'naturalHeight', { value: height });
  fireEvent.load(image);

  return { image, onFallback };
};

const press = (init: KeyboardEventInit): void => {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { cancelable: true, ...init }));
  });
};

describe('ImageView', () => {
  it('loads the image from the media URL and fits it to the window, with its pixel size', () => {
    const { image } = renderLoaded(4000, 3000);

    expect(image.getAttribute('src')).toBe(MEDIA_URL);
    expect(image.style.width).toBe('800px');
    expect(image.style.height).toBe('600px');
    expect(screen.getByText('4,000 × 3,000 px')).toBeTruthy();
    expect(screen.getByText('20%')).toBeTruthy();
    expect((screen.getByRole('button', { name: 'Fit' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('keeps a small image at actual size, centred', () => {
    const { image } = renderLoaded(32, 32);

    expect(image.style.width).toBe('32px');
    expect(image.style.transform).toBe('translate(384px, 284px)');
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('shows actual size and fits again, from the buttons and from ⌘0 and ⌘9', () => {
    const { image } = renderLoaded(4000, 3000);

    fireEvent.click(screen.getByRole('button', { name: 'Actual Size' }));
    expect(image.style.width).toBe('4000px');
    expect(screen.getByText('100%')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Fit' }));
    expect(image.style.width).toBe('800px');

    press({ code: 'Digit0', key: '0', metaKey: true });
    expect(image.style.width).toBe('4000px');
    // Actual size about the centre of the window.
    expect(image.style.transform).toBe('translate(-1600px, -1200px)');

    press({ code: 'Digit9', key: '9', metaKey: true });
    expect(image.style.width).toBe('800px');
  });

  it('steps the zoom with ⌘+ and ⌘-, and pans a zoomed image with the arrows', () => {
    const { image } = renderLoaded(4000, 3000);

    press({ code: 'Equal', key: '=', metaKey: true });
    expect(screen.getByText('25%')).toBeTruthy();
    press({ code: 'Minus', key: '-', metaKey: true });
    expect(screen.getByText('17%')).toBeTruthy();
    press({ code: 'Minus', key: '-', metaKey: true });
    expect(screen.getByText('13%')).toBeTruthy();

    press({ code: 'Digit9', key: '9', metaKey: true });
    press({ code: 'Digit0', key: '0', metaKey: true });
    press({ code: 'ArrowRight', key: 'ArrowRight' });
    expect(image.style.transform).toBe('translate(-1648px, -1200px)');
  });

  it('zooms about the pointer with Command and the wheel, and pans with the wheel alone', () => {
    const { image } = renderLoaded(4000, 3000);
    const canvas = image.parentElement as HTMLElement;

    press({ code: 'Digit0', key: '0', metaKey: true });
    fireEvent.wheel(canvas, { deltaX: 0, deltaY: 100 });
    expect(image.style.transform).toBe('translate(-1600px, -1300px)');

    fireEvent.wheel(canvas, { deltaY: 100, metaKey: true, clientX: 0, clientY: 0 });
    expect(screen.getByText('71%')).toBeTruthy();
    // The pixel at the pointer, (1600, 1300), stays under it.
    expect(image.style.transform).toBe('translate(-1131px, -919px)');
  });

  it('hands the window to hex when Chromium cannot decode the file', () => {
    const onFallback = vi.fn();
    render(<ImageView reader={reader} info={info} onFallback={onFallback} />);

    fireEvent.error(screen.getByAltText('photo.png'));

    expect(onFallback).toHaveBeenCalledWith(IMAGE_DECODE_FALLBACK);
  });
});

describe('ImageView: SVG', () => {
  const svg: ViewerFileInfo = {
    ...info,
    name: 'logo.svg',
    content: { kind: 'svg', mimeType: 'image/svg+xml' }
  };

  /**
   * Chromium's answer to the view's bitmap probes: `natural` rasterizes at
   * one pixel wide, `sizeless` only with both resize dimensions given, and
   * `too-large` not at all.
   */
  const chromiumSees = (svgSize: 'natural' | 'sizeless' | 'too-large') => {
    const probe = vi.fn((_image: unknown, options: ImageBitmapOptions) =>
      svgSize === 'natural' || (svgSize === 'sizeless' && options.resizeHeight !== undefined)
        ? Promise.resolve({ close: vi.fn() })
        : Promise.reject(new DOMException('No bitmap', 'InvalidStateError'))
    );
    vi.stubGlobal('createImageBitmap', probe);
    return probe;
  };

  it('shows an SVG with a size of its own like any image, at its pixel size', async () => {
    chromiumSees('natural');
    const { image } = renderLoaded(120, 80, svg);

    expect(await screen.findByText('120 × 80 px')).toBeTruthy();
    expect(image.style.width).toBe('120px');
    expect(screen.getByText('100%')).toBeTruthy();
  });

  it('says an SVG has no intrinsic size, fills the window with it, and offers no actual size', async () => {
    const probe = chromiumSees('sizeless');
    // A viewBox of 4:1 alone, which Chromium lays out at its default 300 px width.
    const { image } = renderLoaded(300, 75, svg);

    expect(await screen.findByText(SVG_NO_INTRINSIC_SIZE)).toBeTruthy();
    expect(probe).toHaveBeenCalledWith(image, { resizeWidth: 1 });
    expect(image.style.width).toBe('800px');
    expect(image.style.height).toBe('200px');
    expect(image.style.transform).toBe('translate(0px, 200px)');
    expect(screen.queryByText(/%$/)).toBeNull();
    expect(
      (screen.getByRole('button', { name: 'Actual Size' }) as HTMLButtonElement).disabled
    ).toBe(true);

    press({ code: 'Digit0', key: '0', metaKey: true });
    expect(image.style.width).toBe('800px');

    // Zooming still works, and Fit fills the window again.
    press({ code: 'Equal', key: '=', metaKey: true });
    expect(image.style.width).toBe('900px');
    press({ code: 'Digit9', key: '9', metaKey: true });
    expect(image.style.width).toBe('800px');
  });

  it('fills the window with a size-less SVG so wide that Chromium rounds its height to 0', async () => {
    chromiumSees('sizeless');
    // A viewBox of 1000:1, which Chromium lays out 300 px wide and 0 px tall.
    const { image, onFallback } = renderLoaded(300, 0, svg);

    expect(await screen.findByText(SVG_NO_INTRINSIC_SIZE)).toBeTruthy();
    expect(image.style.width).toBe('800px');
    expect(onFallback).not.toHaveBeenCalled();
  });

  it('hands an SVG sized to nothing to its source, as nothing would show', async () => {
    // `width="0" height="0"`: no bitmap of any size, and no pixels to fit.
    chromiumSees('too-large');
    const { onFallback } = renderLoaded(0, 0, svg);

    await waitFor(() => expect(onFallback).toHaveBeenCalledWith(SVG_RENDER_FALLBACK));
    expect(screen.getByText('Loading…')).toBeTruthy();
  });

  it('ignores a size check that settles after the view is gone', async () => {
    // The probe for an SVG sized to nothing settles only when told to.
    let settle: () => void = () => undefined;
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn(
        () =>
          new Promise((_resolve, reject) => {
            settle = () => reject(new DOMException('No bitmap', 'InvalidStateError'));
          })
      )
    );
    const onFallback = vi.fn();
    const { unmount } = render(<ImageView reader={reader} info={svg} onFallback={onFallback} />);
    const image = screen.getByAltText('logo.svg');
    Object.defineProperty(image, 'naturalWidth', { value: 0 });
    Object.defineProperty(image, 'naturalHeight', { value: 0 });
    fireEvent.load(image);

    // The user switches to Hex, or reloads, before Chromium answers.
    unmount();
    // Chromium refuses both probes, as for an SVG sized to nothing.
    for (let probe = 0; probe < 2; probe += 1) {
      await act(async () => {
        settle();
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    expect(onFallback).not.toHaveBeenCalled();
  });

  it('keeps the size Chromium reports for an SVG too large to rasterize', async () => {
    chromiumSees('too-large');
    renderLoaded(200_000, 200_000, svg);

    expect(await screen.findByText('200,000 × 200,000 px')).toBeTruthy();
  });

  it('hands the window to the source when Chromium cannot render the SVG', () => {
    const onFallback = vi.fn();
    render(<ImageView reader={reader} info={svg} onFallback={onFallback} />);

    fireEvent.error(screen.getByAltText('logo.svg'));

    expect(onFallback).toHaveBeenCalledWith(SVG_RENDER_FALLBACK);
  });
});
