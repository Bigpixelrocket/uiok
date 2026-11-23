import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';

import type { ViewerReader, ViewerFileInfo } from './types.js';

import AudioView from './AudioView.js';

const MEDIA_URL = `viewer-media://file/${'b'.repeat(64)}`;

const info: ViewerFileInfo = {
  generation: 0,
  name: 'song.mp3',
  sizeBytes: 4_000_000,
  modifiedMs: 0,
  content: { kind: 'audio', mimeType: 'audio/mpeg' },
  change: 'none',
  mediaUrl: MEDIA_URL
};

/** The view never reads through its reader: Chromium plays the file from the media URL. */
const reader = {} as ViewerReader;

// jsdom plays nothing: these stand in for Chromium's element methods.
let play: Mock<() => Promise<void>>;

beforeEach(() => {
  play = vi.fn(() => Promise.resolve());
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined);
  vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined);
});

afterEach(() => {
  // Unmount while the stand-ins are still in place: the view pauses and unloads on the way out.
  cleanup();
  vi.restoreAllMocks();
});

const renderView = () => {
  const onFallback = vi.fn();
  const view = render(<AudioView reader={reader} info={info} onFallback={onFallback} />);
  const audio = view.container.querySelector('audio') as HTMLAudioElement;

  return { ...view, audio, onFallback };
};

/**
 * Lets the element report `duration` seconds of metadata, as Chromium does
 * after its first range read, and plays and pauses it as Chromium would.
 */
const loadMetadata = (audio: HTMLAudioElement, duration: number): void => {
  let paused = true;

  Object.defineProperties(audio, {
    readyState: { configurable: true, get: () => HTMLMediaElement.HAVE_METADATA },
    duration: { configurable: true, get: () => duration },
    paused: { configurable: true, get: () => paused }
  });
  play.mockImplementation(() => {
    paused = false;
    audio.dispatchEvent(new Event('play'));
    return Promise.resolve();
  });
  vi.mocked(HTMLMediaElement.prototype.pause).mockImplementation(() => {
    paused = true;
    audio.dispatchEvent(new Event('pause'));
  });

  act(() => {
    audio.dispatchEvent(new Event('loadedmetadata'));
  });
};

const press = (init: KeyboardEventInit, target: EventTarget = window): KeyboardEvent => {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

describe('AudioView', () => {
  it('loads only the metadata from the media URL and never starts on its own', () => {
    const { audio } = renderView();

    expect(audio.getAttribute('src')).toBe(MEDIA_URL);
    expect(audio.getAttribute('preload')).toBe('metadata');
    expect(audio.hasAttribute('autoplay')).toBe(false);
    expect(audio.hasAttribute('controls')).toBe(false);
    expect(audio.autoplay).toBe(false);

    loadMetadata(audio, 185);

    expect(play).not.toHaveBeenCalled();
    expect(screen.getByText('0:00')).toBeTruthy();
    expect(screen.getByText('3:05')).toBeTruthy();
    expect((screen.getByRole('slider', { name: 'Seek' }) as HTMLInputElement).max).toBe('185');
  });

  it('waits for metadata before offering play and the seek bar', () => {
    renderView();

    expect((screen.getByRole('button', { name: 'Play' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('slider', { name: 'Seek' }) as HTMLInputElement).disabled).toBe(true);
    expect(screen.getAllByText('--:--')).toHaveLength(2);
  });

  it('plays and pauses from the button and from Space, wherever focus is in the player', () => {
    const { audio } = renderView();
    loadMetadata(audio, 185);

    fireEvent.click(screen.getByRole('button', { name: 'Play' }));
    expect(play).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Pause' })).toBeTruthy();

    // Space on the focused button toggles once, and never clicks it as well.
    const pause = screen.getByRole('button', { name: 'Pause' });
    pause.focus();
    expect(press({ key: ' ', code: 'Space' }, pause).defaultPrevented).toBe(true);
    expect(audio.pause).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Play' })).toBeTruthy();

    press({ key: ' ', code: 'Space' });
    expect(play).toHaveBeenCalledTimes(2);

    // A held Space does not flutter.
    press({ key: ' ', code: 'Space', repeat: true });
    expect(audio.pause).toHaveBeenCalledTimes(1);
  });

  it('leaves Space and the arrows to a focused control outside the player', () => {
    const outside = document.body.appendChild(document.createElement('button'));
    const { audio } = renderView();
    loadMetadata(audio, 185);

    outside.focus();
    expect(press({ key: ' ', code: 'Space' }, outside).defaultPrevented).toBe(false);
    expect(press({ key: 'ArrowRight' }, outside).defaultPrevented).toBe(false);
    expect(play).not.toHaveBeenCalled();
    expect(audio.currentTime).toBe(0);

    // Nothing focused, or the player's own stage, is still the player's.
    outside.blur();
    expect(press({ key: ' ', code: 'Space' }, document.body).defaultPrevented).toBe(true);
    expect(play).toHaveBeenCalledTimes(1);
    outside.remove();
  });

  it('offers no full screen for audio', () => {
    const { audio } = renderView();
    loadMetadata(audio, 185);

    expect(screen.queryByRole('button', { name: 'Full Screen' })).toBeNull();
    expect(press({ key: 'f' }).defaultPrevented).toBe(false);
  });

  it('seeks five seconds with the arrows, and to either end with Home and End', () => {
    const { audio } = renderView();
    loadMetadata(audio, 185);

    press({ key: 'ArrowRight' });
    expect(audio.currentTime).toBe(5);
    press({ key: 'ArrowRight' });
    expect(audio.currentTime).toBe(10);
    expect(screen.getByText('0:10')).toBeTruthy();
    press({ key: 'ArrowLeft' });
    expect(audio.currentTime).toBe(5);

    press({ key: 'End' });
    expect(audio.currentTime).toBe(185);
    press({ key: 'ArrowRight' });
    expect(audio.currentTime).toBe(185);
    press({ key: 'Home' });
    expect(audio.currentTime).toBe(0);
    press({ key: 'ArrowLeft' });
    expect(audio.currentTime).toBe(0);

    // A chord with a modifier is not the player's.
    expect(press({ key: 'ArrowRight', metaKey: true }).defaultPrevented).toBe(false);
    expect(audio.currentTime).toBe(0);
  });

  it('seeks from the seek bar', () => {
    const { audio } = renderView();
    loadMetadata(audio, 3725);

    fireEvent.change(screen.getByRole('slider', { name: 'Seek' }), { target: { value: '3600' } });

    expect(audio.currentTime).toBe(3600);
    expect(screen.getByText('1:00:00')).toBeTruthy();
    expect(screen.getByText('1:02:05')).toBeTruthy();
  });

  it('mutes and sets the volume, and leaves the volume slider its own arrows', () => {
    const { audio } = renderView();
    loadMetadata(audio, 185);
    const volume = screen.getByRole('slider', { name: 'Volume' }) as HTMLInputElement;

    fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
    expect(audio.muted).toBe(true);
    expect(volume.value).toBe('0');

    fireEvent.change(volume, { target: { value: '0.5' } });
    expect(audio.volume).toBe(0.5);
    expect(audio.muted).toBe(false);

    expect(press({ key: 'ArrowLeft' }, volume).defaultPrevented).toBe(false);
    expect(audio.currentTime).toBe(0);
  });

  it('hands the window to hex with the reason when Chromium cannot play the file', () => {
    const { audio, onFallback } = renderView();

    Object.defineProperty(audio, 'error', { configurable: true, value: { code: 4 } });
    fireEvent.error(audio);

    expect(onFallback).toHaveBeenCalledWith(
      'Could not play this audio format, so it shows in hex.'
    );
  });

  it('stops and lets go of the file when the view goes away', () => {
    const { audio, unmount } = renderView();
    loadMetadata(audio, 185);
    fireEvent.click(screen.getByRole('button', { name: 'Play' }));

    unmount();

    expect(audio.pause).toHaveBeenCalled();
    expect(audio.hasAttribute('src')).toBe(false);
    expect(audio.load).toHaveBeenCalled();
  });
});
