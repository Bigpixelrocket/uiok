/**
 * Pure decisions behind the viewer's media player (`MediaControls.tsx`):
 * how a time reads, what a key asks of the player, where a seek lands, and
 * what the window says when Chromium cannot play the file. Nothing here
 * touches a media element.
 */

import type { ViewerLabels } from '../labels/viewer.js';

/** How far ← and → move the playhead. */
export const MEDIA_SEEK_STEP_SECONDS = 5;

/** A time on the player's clock: `1:05`, or `1:02:05` when the file runs an hour or more. */
export function formatMediaTime(seconds: number, duration: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '--:--';

  const whole = Math.floor(seconds);
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = String(whole % 60).padStart(2, '0');

  return hours > 0 || (Number.isFinite(duration) && duration >= 3600)
    ? `${hours}:${String(minutes).padStart(2, '0')}:${secs}`
    : `${minutes}:${secs}`;
}

/**
 * What a key asks of the player: play or pause, move the playhead by
 * seconds, go to an end, or enter or leave full screen (a video's player only).
 */
export type MediaKeyAction =
  | { readonly kind: 'toggle' }
  | { readonly kind: 'seek'; readonly by: number }
  | { readonly kind: 'jump'; readonly to: 'start' | 'end' }
  | { readonly kind: 'fullscreen' };

/** The parts of a keystroke the player reads. */
export interface MediaKey {
  readonly key: string;
  readonly metaKey: boolean;
  readonly ctrlKey: boolean;
  readonly altKey: boolean;
  readonly shiftKey: boolean;
}

const KEY_ACTIONS: Readonly<Record<string, MediaKeyAction>> = {
  ' ': { kind: 'toggle' },
  ArrowLeft: { kind: 'seek', by: -MEDIA_SEEK_STEP_SECONDS },
  ArrowRight: { kind: 'seek', by: MEDIA_SEEK_STEP_SECONDS },
  Home: { kind: 'jump', to: 'start' },
  End: { kind: 'jump', to: 'end' },
  // Caps Lock reports the letter in capitals without Shift.
  f: { kind: 'fullscreen' },
  F: { kind: 'fullscreen' }
};

/**
 * The player's keys, all bare: Space plays or pauses, ← and → seek five
 * seconds, Home and End go to the start and the end, and F enters or leaves
 * full screen. Any modifier leaves the key to the window, so the system's
 * chords and the native menu keep theirs.
 */
export function mediaKeyAction(event: MediaKey): MediaKeyAction | null {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return null;

  return Object.hasOwn(KEY_ACTIONS, event.key) ? (KEY_ACTIONS[event.key] ?? null) : null;
}

/**
 * Where a seek from `current` by `by` seconds lands: never before the start,
 * nor past the end when the duration is known (a stream still being read
 * may not know it yet).
 */
export function seekTarget(current: number, by: number, duration: number): number {
  const target = Math.max(0, current + by);

  return Number.isFinite(duration) ? Math.min(target, duration) : target;
}

/** `MediaError.code` values (the DOM constants, kept here so the module stays pure). */
const MEDIA_ERR_DECODE = 3;
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4;

/**
 * Why a media view gave way to hex, from the `MediaError` code Chromium
 * reported (null when it reported none): a format it does not play, a file
 * it could not decode, or any other failure to play.
 */
export function mediaFallbackNote(
  noun: 'audio' | 'video',
  code: number | null,
  labels: ViewerLabels
): string {
  switch (code) {
    case MEDIA_ERR_SRC_NOT_SUPPORTED:
      return labels.media.fallbackFormat(noun);
    case MEDIA_ERR_DECODE:
      return labels.media.fallbackDecode(noun);
    default:
      return labels.media.fallbackPlay(noun);
  }
}
