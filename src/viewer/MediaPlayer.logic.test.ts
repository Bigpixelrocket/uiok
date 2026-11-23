import { describe, expect, it } from 'vitest';

import {
  formatMediaTime,
  mediaFallbackNote,
  mediaKeyAction,
  seekTarget,
  type MediaKey
} from './MediaPlayer.logic.js';
import { DEFAULT_VIEWER_LABELS as L } from '../labels/viewer.js';

const key = (name: string, modifiers: Partial<MediaKey> = {}): MediaKey => ({
  key: name,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...modifiers
});

describe('formatMediaTime', () => {
  it('reads minutes and seconds, and hours once the file runs an hour', () => {
    expect(formatMediaTime(0, 185)).toBe('0:00');
    expect(formatMediaTime(65.9, 185)).toBe('1:05');
    expect(formatMediaTime(65, 3600)).toBe('0:01:05');
    expect(formatMediaTime(3725, 7200)).toBe('1:02:05');
    // A playhead past an hour with no known duration still shows its hours.
    expect(formatMediaTime(3725, Infinity)).toBe('1:02:05');
  });

  it('shows a blank clock for a time not known yet', () => {
    expect(formatMediaTime(NaN, NaN)).toBe('--:--');
    expect(formatMediaTime(Infinity, Infinity)).toBe('--:--');
  });
});

describe('mediaKeyAction', () => {
  it('maps Space, the side arrows, Home, End, and F', () => {
    expect(mediaKeyAction(key(' '))).toEqual({ kind: 'toggle' });
    expect(mediaKeyAction(key('ArrowLeft'))).toEqual({ kind: 'seek', by: -5 });
    expect(mediaKeyAction(key('ArrowRight'))).toEqual({ kind: 'seek', by: 5 });
    expect(mediaKeyAction(key('Home'))).toEqual({ kind: 'jump', to: 'start' });
    expect(mediaKeyAction(key('End'))).toEqual({ kind: 'jump', to: 'end' });
    expect(mediaKeyAction(key('f'))).toEqual({ kind: 'fullscreen' });
    expect(mediaKeyAction(key('F'))).toEqual({ kind: 'fullscreen' });
  });

  it('leaves modified keys, other keys, and inherited names alone', () => {
    expect(mediaKeyAction(key(' ', { metaKey: true }))).toBeNull();
    expect(mediaKeyAction(key('ArrowLeft', { shiftKey: true }))).toBeNull();
    expect(mediaKeyAction(key('ArrowRight', { altKey: true }))).toBeNull();
    expect(mediaKeyAction(key('Home', { ctrlKey: true }))).toBeNull();
    expect(mediaKeyAction(key('f', { metaKey: true, ctrlKey: true }))).toBeNull();
    expect(mediaKeyAction(key('ArrowUp'))).toBeNull();
    expect(mediaKeyAction(key('constructor'))).toBeNull();
  });
});

describe('seekTarget', () => {
  it('moves by the step and stops at either end of a known duration', () => {
    expect(seekTarget(10, 5, 60)).toBe(15);
    expect(seekTarget(2, -5, 60)).toBe(0);
    expect(seekTarget(58, 5, 60)).toBe(60);
  });

  it('stops only at the start while the duration is unknown', () => {
    expect(seekTarget(58, 5, NaN)).toBe(63);
    expect(seekTarget(58, 5, Infinity)).toBe(63);
    expect(seekTarget(1, -5, NaN)).toBe(0);
  });
});

describe('mediaFallbackNote', () => {
  it('says why the media gave way to hex, by the MediaError code', () => {
    expect(mediaFallbackNote('audio', 4, L)).toBe(
      'Could not play this audio format, so it shows in hex.'
    );
    expect(mediaFallbackNote('audio', 3, L)).toBe(
      'Could not decode this audio, so it shows in hex.'
    );
    expect(mediaFallbackNote('video', 2, L)).toBe('Could not play this video, so it shows in hex.');
    expect(mediaFallbackNote('audio', null, L)).toBe(
      'Could not play this audio, so it shows in hex.'
    );
  });
});
