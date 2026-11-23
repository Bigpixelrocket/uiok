import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { ViewerReader, ViewerFileInfo } from './types.js';

import VideoView from './VideoView.js';

const NO_PICTURE = 'No picture to show';

const MEDIA_URL = `viewer-media://file/${'c'.repeat(64)}`;

const info: ViewerFileInfo = {
  generation: 0,
  name: 'clip.mp4',
  sizeBytes: 4_000_000_000,
  modifiedMs: 0,
  content: { kind: 'video', mimeType: 'video/mp4' },
  change: 'none',
  mediaUrl: MEDIA_URL
};

/** The view never reads through its reader: Chromium plays the file from the media URL. */
const reader = {} as ViewerReader;

// jsdom plays nothing and has no Fullscreen API: these stand in for Chromium's.
let play: Mock<() => Promise<void>>;
let fullscreenElement: Element | null;

const showFullscreen = (element: Element | null): Promise<void> => {
  fullscreenElement = element;
  document.dispatchEvent(new Event('fullscreenchange'));
  return Promise.resolve();
};

beforeEach(() => {
  play = vi.fn(() => Promise.resolve());
  fullscreenElement = null;
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
  Object.defineProperty(document, 'fullscreenElement', {
    configurable: true,
    get: () => fullscreenElement
  });
  Element.prototype.requestFullscreen = vi.fn(function (this: Element) {
    return showFullscreen(this);
  });
  document.exitFullscreen = vi.fn(() => showFullscreen(null));
});

afterEach(() => {
  // Unmount while the stand-ins are still in place: the view pauses and unloads on the way out.
  cleanup();
  vi.restoreAllMocks();
});

const renderView = () => {
  const onFallback = vi.fn();
  const view = render(<VideoView reader={reader} info={info} onFallback={onFallback} />);
  const video = view.container.querySelector('video') as HTMLVideoElement;

  return { ...view, video, onFallback };
};

/**
 * Lets the element report its metadata, as Chromium does after its first
 * range read: `duration` seconds and a `width` × `height` picture (zero for
 * none). It plays and pauses as Chromium would.
 */
const loadMetadata = (
  video: HTMLVideoElement,
  duration: number,
  [width, height]: readonly [number, number]
): void => {
  let paused = true;

  Object.defineProperties(video, {
    readyState: { configurable: true, get: () => HTMLMediaElement.HAVE_METADATA },
    duration: { configurable: true, get: () => duration },
    paused: { configurable: true, get: () => paused },
    videoWidth: { configurable: true, get: () => width },
    videoHeight: { configurable: true, get: () => height }
  });
  play.mockImplementation(() => {
    paused = false;
    video.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  vi.mocked(HTMLMediaElement.prototype.pause).mockImplementation(() => {
    paused = true;
    video.dispatchEvent(new Event('pause'));
  });

  act(() => {
    video.dispatchEvent(new Event('loadedmetadata'));
  });
};

const press = (init: KeyboardEventInit, target: EventTarget = window): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

describe('VideoView', () => {
  it('loads only the metadata from the media URL and never starts on its own', () => {
    const { video } = renderView();

    expect(video.getAttribute('src')).toBe(MEDIA_URL);
    expect(video.getAttribute('preload')).toBe('metadata');
    expect(video.hasAttribute('autoplay')).toBe(false);
    expect(video.hasAttribute('controls')).toBe(false);

    loadMetadata(video, 7325, [1920, 1080]);

    expect(play).not.toHaveBeenCalled();
    expect(screen.getByText('2:02:05')).toBeTruthy();
  });

  it('gives the picture size once the metadata is in, and follows a size change', () => {
    const { video } = renderView();

    expect(screen.queryByText(/ px$/)).toBeNull();

    loadMetadata(video, 60, [3840, 2160]);
    expect(screen.getByText('3,840 × 2,160 px')).toBeTruthy();

    Object.defineProperty(video, 'videoWidth', { configurable: true, get: () => 1280 });
    Object.defineProperty(video, 'videoHeight', { configurable: true, get: () => 720 });
    act(() => {
      video.dispatchEvent(new Event('resize'));
    });
    expect(screen.getByText('1,280 × 720 px')).toBeTruthy();
  });

  it('says there is no picture for a file with sound only, and still plays it', () => {
    const { container, video } = renderView();

    loadMetadata(video, 185, [0, 0]);

    expect(container.querySelector('.video-stage')?.getAttribute('data-picture')).toBe('none');
    expect(screen.getByText(NO_PICTURE)).toBeTruthy();
    expect(screen.queryByText(/ px$/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(play).toHaveBeenCalledTimes(1);
  });

  it('answers Space in the player and leaves it to a focused control outside', () => {
    const outside = document.body.appendChild(document.createElement('button'));
    const { video } = renderView();
    loadMetadata(video, 185, [640, 360]);

    // The mode switcher or Reload keeps its own Space.
    outside.focus();
    expect(press({ key: ' ', code: 'Space' }, outside).defaultPrevented).toBe(false);
    expect(press({ key: 'f' }, outside).defaultPrevented).toBe(false);
    expect(play).not.toHaveBeenCalled();
    expect(document.exitFullscreen).not.toHaveBeenCalled();

    // A button inside the player plays rather than pressing itself.
    const mute = screen.getByRole('button', { name: 'Mute' });
    mute.focus();
    expect(press({ key: ' ', code: 'Space' }, mute).defaultPrevented).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    expect(video.muted).toBe(false);

    // So does nothing in particular.
    mute.blur();
    expect(press({ key: ' ', code: 'Space' }, document.body).defaultPrevented).toBe(true);
    expect(video.pause).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('shows the player full screen with F or the button, and leaves it the same ways', () => {
    const { container, video } = renderView();
    loadMetadata(video, 185, [640, 360]);
    const player = container.querySelector('.video-view');

    expect(press({ key: 'f' }).defaultPrevented).toBe(true);
    expect(fullscreenElement).toBe(player);
    expect(screen.getByRole('button', { name: 'Exit Full Screen' })).toBeTruthy();

    // A held F does not flutter.
    press({ key: 'f', repeat: true });
    expect(document.exitFullscreen).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Exit Full Screen' }));
    expect(fullscreenElement).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Full Screen' }));
    expect(fullscreenElement).toBe(player);
    press({ key: 'F' });
    expect(fullscreenElement).toBeNull();
  });

  it('hands the window to hex with the reason when Chromium cannot play the file', () => {
    const { video, onFallback } = renderView();

    Object.defineProperty(video, 'error', { configurable: true, value: { code: 4 } });
    fireEvent.error(video);

    expect(onFallback).toHaveBeenCalledWith(
      'Could not play this video format, so it shows in hex.'
    );
  });

  it('stops and lets go of the file when the view goes away', () => {
    const { video, unmount } = renderView();
    loadMetadata(video, 185, [640, 360]);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    unmount();

    expect(video.pause).toHaveBeenCalled();
    expect(video.hasAttribute('src')).toBe(false);
    expect(video.load).toHaveBeenCalled();
  });
});
