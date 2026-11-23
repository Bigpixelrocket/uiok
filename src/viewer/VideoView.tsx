import { useEffect, useState, type ReactElement } from 'react';
import { AudioLines } from 'lucide-react';

import { useLabels } from '../labels/UiokProvider.js';
import MediaControls from './MediaControls.js';
import { mediaFallbackNote } from './MediaPlayer.logic.js';
import { useMediaElement } from './useMediaElement.js';
import type { ViewerViewProps } from './ViewerViews.js';

/** The stage's sound mark, larger than any control glyph: it stands in for a picture. */
const STAGE_GLYPH = 64;

/**
 * What the file's metadata says about its picture: not read yet, none (an
 * audio-only file in a video container), or its size in pixels.
 */
type Picture =
  | { readonly kind: 'unknown' }
  | { readonly kind: 'none' }
  | { readonly kind: 'size'; readonly width: number; readonly height: number };

const UNKNOWN: Picture = { kind: 'unknown' };

/** The element's picture as it reports it now. */
const pictureOf = (video: HTMLVideoElement): Picture => {
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) return UNKNOWN;

  return video.videoWidth > 0 && video.videoHeight > 0
    ? { kind: 'size', width: video.videoWidth, height: video.videoHeight }
    : { kind: 'none' };
};

/** The element's events after which its picture may differ: metadata in, a new frame size, a source dropped. */
const PICTURE_EVENTS = ['loadedmetadata', 'resize', 'emptied'] as const;

/**
 * The video view: Chromium plays the file straight from its media URL
 * (`info.mediaUrl`) in a `<video>` fitted to the window with its
 * aspect kept, under the player's control bar (`MediaControls`), and nothing
 * here decodes or demuxes a format. Only the metadata loads when the window
 * opens, and nothing plays until the user asks; a seek reads from the new
 * position through a range request, so a video of many gigabytes costs no
 * more to open than a short one. The bar gives the picture's pixel size
 * once the metadata is in, and F shows the player full screen. A file whose
 * picture Chromium cannot show but whose sound it plays shows the audio
 * view's mark and says so, instead of an empty frame. A file Chromium cannot
 * play at all (a container or codecs it lacks, a decode failure) hands the
 * window to hex with a note.
 */
function VideoView({ info, onFallback }: ViewerViewProps): ReactElement {
  const labels = useLabels().viewer;
  const [videoRef, video] = useMediaElement<HTMLVideoElement>(info.mediaUrl);
  const [player, setPlayer] = useState<HTMLDivElement | null>(null);
  const [picture, setPicture] = useState<Picture>(UNKNOWN);

  useEffect(() => {
    if (!video) return;

    const update = (): void => setPicture(pictureOf(video));

    for (const type of PICTURE_EVENTS) video.addEventListener(type, update);

    return () => {
      for (const type of PICTURE_EVENTS) video.removeEventListener(type, update);
    };
  }, [video]);

  return (
    <div className="video-view" ref={setPlayer}>
      <div className="video-stage" data-picture={picture.kind}>
        {picture.kind === 'none' && (
          <div className="video-no-picture">
            <AudioLines absoluteStrokeWidth aria-hidden size={STAGE_GLYPH} />
            {/* Sound and no picture Chromium can show: an audio-only file in a
                video container, or a video track in a codec Chromium drops while
                it plays the sound (ProRes with PCM audio). The two look the same
                from the element, so the copy fits both. */}
            <p>{labels.media.noPicture}</p>
          </div>
        )}
        <video
          aria-label={info.name}
          onError={(event) =>
            onFallback(mediaFallbackNote('video', event.currentTarget.error?.code ?? null, labels))
          }
          preload="metadata"
          ref={videoRef}
        />
      </div>
      <MediaControls fullscreen media={video} player={player}>
        {picture.kind === 'size' && (
          <span className="media-facts">
            {labels.media.pixelSize(labels.number(picture.width), labels.number(picture.height))}
          </span>
        )}
      </MediaControls>
    </div>
  );
}

export default VideoView;
