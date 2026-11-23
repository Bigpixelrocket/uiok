import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react';
import { Maximize, Minimize, Pause, Play, Volume2, VolumeX } from 'lucide-react';

import { IconButton } from '../button/IconButton.js';
import { tooltip } from '../tooltip/Tooltip.logic.js';
import { ICON_MD } from '../icon/index.js';
import { useLabels } from '../labels/UiokProvider.js';
import { formatMediaTime, mediaKeyAction, seekTarget } from './MediaPlayer.logic.js';

/** What the bar shows, read from the element on each of its events. */
interface PlayerState {
  /** Metadata is in: the duration (if the file states one) and the first seek are possible. */
  readonly ready: boolean;
  readonly paused: boolean;
  readonly currentTime: number;
  readonly duration: number;
  readonly volume: number;
  readonly muted: boolean;
}

const EMPTY: PlayerState = {
  ready: false,
  paused: true,
  currentTime: 0,
  duration: NaN,
  volume: 1,
  muted: false
};

const snapshot = (media: HTMLMediaElement): PlayerState => ({
  ready: media.readyState >= HTMLMediaElement.HAVE_METADATA,
  paused: media.paused,
  currentTime: media.currentTime,
  duration: media.duration,
  volume: media.volume,
  muted: media.muted
});

/** The element's events that change anything the bar shows. */
const STATE_EVENTS = [
  'loadedmetadata',
  'durationchange',
  'emptied',
  'play',
  'pause',
  'ended',
  'timeupdate',
  'seeking',
  'seeked',
  'volumechange'
] as const;

/**
 * Starts playback, which only a user's click or key ever calls. A refused
 * start (a file that fails to decode, or a pause that interrupts it) needs
 * no handling here: the element's error event hands the view to hex, and a
 * pause is what was asked for.
 */
const play = (media: HTMLMediaElement): void => {
  void media.play().catch(() => undefined);
};

/**
 * The share of a slider's trough uiok's `.range` fills in the accent, from
 * the value's share of its span; a span not known yet fills none.
 */
const rangeFill = (share: number): CSSProperties =>
  ({
    '--range-fill': `${Number.isFinite(share) ? Math.min(Math.max(share, 0), 1) * 100 : 0}%`
  }) as CSSProperties;

/** Elements that act on Space or the arrows themselves while they have focus. */
const OPERABLE = 'button, input, select, textarea, a[href], [contenteditable]';

/**
 * Whether the player answers a key aimed at `target`: anything inside the
 * player, or a target no key operates (the page, a stage). A focused control
 * outside the player (the mode switcher, Reload) keeps its own keys, so
 * Space presses it as it would anywhere else.
 */
const isPlayerKeyTarget = (target: EventTarget | null, player: HTMLElement | null): boolean =>
  !(target instanceof Element) ||
  (player?.contains(target) ?? false) ||
  target.closest(OPERABLE) === null;

interface MediaControlsProps {
  /** The element the view renders, null until it mounts. */
  readonly media: HTMLMediaElement | null;
  /** The view's whole player (its stage and this bar), null until it mounts. */
  readonly player: HTMLElement | null;
  /** Offers F and a Full Screen button, which show `player` full screen. */
  readonly fullscreen?: boolean;
  /** Facts about the file (a video's pixel size), shown after the duration. */
  readonly children?: ReactNode;
}

/**
 * The media player's control bar, under the audio and video views: play and
 * pause, the elapsed time, a seek bar, the duration, any facts the view
 * adds, mute and volume, and for a video full screen. Every control drives
 * `media`, the element the view renders, and the bar shows what the element
 * reports, so Chromium does all the playing and seeking (through range
 * requests on the media scheme). Nothing starts playback but the user. The
 * player's keys (Space, ← and →, Home and End, and F for a video:
 * `mediaKeyAction`) work while focus is inside the player or on nothing a
 * key operates, except that the volume slider keeps its own arrows, Home,
 * and End. Escape leaves full screen, as Chromium does on its own.
 */
function MediaControls({
  media,
  player,
  fullscreen = false,
  children
}: MediaControlsProps): ReactElement {
  const allLabels = useLabels();
  const labels = allLabels.viewer;
  const keyNames = allLabels.keys.names;
  const [state, setState] = useState<PlayerState>(EMPTY);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const volumeSlider = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!media) return;

    const update = (): void => setState(snapshot(media));

    update();
    for (const type of STATE_EVENTS) media.addEventListener(type, update);

    return () => {
      for (const type of STATE_EVENTS) media.removeEventListener(type, update);
    };
  }, [media]);

  const toggle = useCallback((): void => {
    if (!media) return;

    if (media.paused) play(media);
    else media.pause();
  }, [media]);

  useEffect(() => {
    if (!fullscreen || !player) return;

    const update = (): void => setIsFullscreen(document.fullscreenElement === player);

    update();
    document.addEventListener('fullscreenchange', update);

    return () => document.removeEventListener('fullscreenchange', update);
  }, [fullscreen, player]);

  // A refused request (the window cannot go full screen right now) leaves
  // the player as it was, which is all there is to say about it.
  const toggleFullscreen = useCallback((): void => {
    if (!player) return;

    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    else void player.requestFullscreen().catch(() => undefined);
  }, [player]);

  const seekTo = useCallback(
    (time: number): void => {
      if (!media) return;

      media.currentTime = time;
      setState(snapshot(media));
    },
    [media]
  );

  useEffect(() => {
    if (!media) return;

    const onKeyDown = (event: KeyboardEvent): void => {
      const action = mediaKeyAction(event);
      if (!action || !isPlayerKeyTarget(event.target, player)) return;
      if (action.kind === 'fullscreen' && !fullscreen) return;

      // The volume slider moves by its own arrows and ends.
      if (action.kind !== 'toggle' && event.target === volumeSlider.current) return;

      event.preventDefault();
      if (action.kind === 'toggle') {
        if (!event.repeat) toggle();
      } else if (action.kind === 'fullscreen') {
        if (!event.repeat) toggleFullscreen();
      } else if (action.kind === 'seek') {
        seekTo(seekTarget(media.currentTime, action.by, media.duration));
      } else if (action.to === 'start') {
        seekTo(0);
      } else if (Number.isFinite(media.duration)) {
        seekTo(media.duration);
      }
    };

    window.addEventListener('keydown', onKeyDown);

    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fullscreen, media, player, seekTo, toggle, toggleFullscreen]);

  const { ready, paused, currentTime, duration, volume, muted } = state;
  const seekable = ready && Number.isFinite(duration) && duration > 0;
  const elapsed = formatMediaTime(ready ? currentTime : NaN, duration);
  const total = formatMediaTime(ready ? duration : NaN, duration);
  const silent = muted || volume === 0;
  const playLabel = paused ? labels.media.play : labels.media.pause;
  const muteLabel = muted ? labels.media.unmute : labels.media.mute;
  const fullscreenLabel = isFullscreen ? labels.media.exitFullScreen : labels.media.enterFullScreen;

  return (
    <footer className="media-controls">
      <IconButton
        aria-label={playLabel}
        disabled={!ready}
        onClick={toggle}
        size="small"
        {...tooltip(playLabel, keyNames[' '] ?? ' ')}
      >
        {paused ? <Play size={ICON_MD} /> : <Pause size={ICON_MD} />}
      </IconButton>
      <span className="media-time">{elapsed}</span>
      <input
        aria-label={labels.media.seek}
        aria-valuetext={labels.media.seekValue(elapsed, total)}
        className="media-seek range"
        disabled={!seekable}
        max={seekable ? duration : 0}
        min={0}
        onChange={(event) => seekTo(Number(event.currentTarget.value))}
        step="any"
        style={rangeFill(seekable ? Math.min(currentTime, duration) / duration : 0)}
        type="range"
        value={seekable ? Math.min(currentTime, duration) : 0}
      />
      <span className="media-time">{total}</span>
      {children}
      <IconButton
        aria-label={muteLabel}
        disabled={!media}
        onClick={() => {
          if (media) media.muted = !media.muted;
        }}
        size="small"
        {...tooltip(muteLabel)}
      >
        {silent ? <VolumeX size={ICON_MD} /> : <Volume2 size={ICON_MD} />}
      </IconButton>
      <input
        aria-label={labels.media.volume}
        className="media-volume range"
        disabled={!media}
        max={1}
        min={0}
        onChange={(event) => {
          if (!media) return;

          media.volume = Number(event.currentTarget.value);
          media.muted = false;
        }}
        ref={volumeSlider}
        step={0.05}
        style={rangeFill(muted ? 0 : volume)}
        type="range"
        value={muted ? 0 : volume}
      />
      {fullscreen && (
        <IconButton
          aria-label={fullscreenLabel}
          disabled={!player}
          onClick={toggleFullscreen}
          size="small"
          {...tooltip(fullscreenLabel, 'F')}
        >
          {isFullscreen ? <Minimize size={ICON_MD} /> : <Maximize size={ICON_MD} />}
        </IconButton>
      )}
    </footer>
  );
}

export default MediaControls;
