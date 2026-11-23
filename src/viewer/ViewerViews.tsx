/**
 * The viewer's view registry: one component per view the mode switcher can
 * show (`ViewerFrame.logic.ts` lists which views each content kind offers).
 * Adding a view means adding its entry here and nothing else; the frame
 * mounts whatever the entry names, keyed by the file's generation, so a
 * reload starts every view afresh.
 */

import type { ComponentType } from 'react';

import type { ViewerReader, ViewerFileInfo } from './types.js';

import type { ViewerViewId } from './ViewerFrame.logic.js';
import AudioView from './AudioView.js';
import HexView from './HexView.js';
import ImageView from './ImageView.js';
import PdfView from './PdfView.js';
import TextView from './TextView.js';
import VideoView from './VideoView.js';

/** What every view receives: the viewer's reader and the file as opened (or last reloaded). */
export interface ViewerViewProps {
  /** Reads bounded byte ranges of the window's one file. */
  readonly reader: ViewerReader;
  /** Size, content, modification date, and media URL when the window opened or last reloaded. */
  readonly info: ViewerFileInfo;
  /**
   * Hands the window to the kind's fallback view (`fallbackViewFor`: source
   * for an SVG, hex for anything else) with `note` saying why, for a native
   * view whose file Chromium could not show (an image that fails to decode,
   * audio or video it cannot play). The frame ignores a call from a view it
   * has since replaced on a reload, so a late error from the old file's
   * player never moves the new one to hex.
   */
  readonly onFallback: (note: string) => void;
}

/** Every view's component. */
export const VIEWER_VIEWS: Readonly<Record<ViewerViewId, ComponentType<ViewerViewProps>>> = {
  text: TextView,
  hex: HexView,
  image: ImageView,
  audio: AudioView,
  video: VideoView,
  pdf: PdfView
};
