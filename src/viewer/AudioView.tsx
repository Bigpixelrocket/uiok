import { useState, type ReactElement } from 'react';
import { AudioLines } from 'lucide-react';

import { useLabels } from '../labels/UiokProvider.js';
import MediaControls from './MediaControls.js';
import { mediaFallbackNote } from './MediaPlayer.logic.js';
import { useMediaElement } from './useMediaElement.js';
import type { ViewerViewProps } from './ViewerViews.js';

/** The stage's sound mark, larger than any control glyph: it stands in for a picture. */
const STAGE_GLYPH = 64;

/**
 * The audio view: Chromium plays the file straight from its media URL
 * (`info.mediaUrl`) in an `<audio>` element, under the player's
 * control bar (`MediaControls`), and nothing here decodes a format. Only
 * the metadata loads when the window opens, and nothing plays until the
 * user asks; a seek reads from the new position through a range request,
 * never the whole file first. A file Chromium cannot play (a codec it
 * lacks, a decode failure) hands the window to hex with a note saying why.
 */
function AudioView({ info, onFallback }: ViewerViewProps): ReactElement {
  const labels = useLabels().viewer;
  const [audioRef, audio] = useMediaElement<HTMLAudioElement>(info.mediaUrl);
  const [player, setPlayer] = useState<HTMLDivElement | null>(null);

  return (
    <div className="audio-view" ref={setPlayer}>
      <div className="audio-stage">
        <AudioLines absoluteStrokeWidth aria-hidden size={STAGE_GLYPH} />
        <audio
          aria-label={info.name}
          onError={(event) =>
            onFallback(mediaFallbackNote('audio', event.currentTarget.error?.code ?? null, labels))
          }
          preload="metadata"
          ref={audioRef}
        />
      </div>
      <MediaControls media={audio} player={player} />
    </div>
  );
}

export default AudioView;
