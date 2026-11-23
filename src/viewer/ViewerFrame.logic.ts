/**
 * Pure decisions behind the viewer window's frame: which modes a kind of
 * content offers and in what order, what the frame says about the file, and
 * what it says when the file changes on disk.
 */

import type {
  ViewerContentKind,
  ViewerContentType,
  ViewerFileChange,
  ViewerFileInfo
} from './types.js';
import type { ViewerLabels, ViewerModeLabels } from '../labels/viewer.js';

/**
 * The views a file can be shown in. Each content kind offers some of them as
 * modes; the view registry (`ViewerViews.tsx`) maps each to its component.
 */
export type ViewerViewId = 'text' | 'hex' | 'image' | 'audio' | 'video' | 'pdf';

/** One entry of the mode switcher: the view it shows and the name it goes by there. */
export interface ViewerMode {
  readonly view: ViewerViewId;
  /** Which of the `viewer.modes` labels names it. */
  readonly label: keyof ViewerModeLabels;
}

const mode = (view: ViewerViewId, label: keyof ViewerModeLabels): ViewerMode => ({ view, label });

const HEX = mode('hex', 'hex');

/**
 * The modes each kind offers, the one it opens in first. Every kind can fall
 * back to hex; a binary file has nothing else. An SVG opens in the image
 * view, which the browser renders it in as an `<img>`, and its source is the
 * text view.
 */
export const VIEWER_MODES: Readonly<Record<ViewerContentKind, readonly ViewerMode[]>> = {
  text: [mode('text', 'text'), HEX],
  binary: [HEX],
  image: [mode('image', 'image'), HEX],
  svg: [mode('image', 'image'), mode('text', 'source'), HEX],
  audio: [mode('audio', 'player'), HEX],
  video: [mode('video', 'player'), HEX],
  pdf: [mode('pdf', 'document'), HEX]
};

/**
 * The view to show after the content was (re)detected: the current one when
 * the kind still offers it, else the kind's first.
 */
export function viewForKind(kind: ViewerContentKind, current: ViewerViewId | null): ViewerViewId {
  const modes = VIEWER_MODES[kind];

  return modes.find((mode) => mode.view === current)?.view ?? modes[0]?.view ?? 'hex';
}

/**
 * The view a native view hands the window to when the browser cannot show the
 * file. An SVG is markup, so a broken one (malformed XML, or text that only
 * carries the name) shows its source, where the fault can be read; any other
 * kind shows hex.
 */
export function fallbackViewFor(kind: ViewerContentKind): ViewerViewId {
  return kind === 'svg' ? 'text' : 'hex';
}

/** Format names for the media types the detection reports, as people say them; never translated. */
const FORMAT_NAMES: Readonly<Record<string, string>> = {
  'image/png': 'PNG',
  'image/apng': 'APNG',
  'image/jpeg': 'JPEG',
  'image/gif': 'GIF',
  'image/webp': 'WebP',
  'image/avif': 'AVIF',
  'image/bmp': 'BMP',
  'image/x-icon': 'ICO',
  'audio/mpeg': 'MP3',
  'audio/mp4': 'MPEG-4',
  'audio/aac': 'AAC',
  'audio/wav': 'WAV',
  'audio/flac': 'FLAC',
  'audio/ogg': 'Ogg',
  'audio/webm': 'WebM',
  'audio/x-matroska': 'Matroska',
  'video/mp4': 'MPEG-4',
  'video/quicktime': 'QuickTime',
  'video/webm': 'WebM',
  'video/ogg': 'Ogg',
  'video/x-matroska': 'Matroska'
};

/** The content in a word or two: "Text", "PNG image", "QuickTime video", "PDF document". */
export function contentLabel(content: ViewerContentType, labels: ViewerLabels): string {
  // The media type is the file's, so a type such as `toString` names nothing.
  const format = Object.hasOwn(FORMAT_NAMES, content.mimeType)
    ? FORMAT_NAMES[content.mimeType]
    : undefined;

  switch (content.kind) {
    case 'text':
      return labels.content.text;
    case 'binary':
      return labels.content.binary;
    case 'svg':
      return labels.content.svg;
    case 'pdf':
      return labels.content.pdf;
    case 'image':
      return labels.content.image(format ?? null);
    case 'audio':
      return labels.content.audio(format ?? null);
    case 'video':
      return labels.content.video(format ?? null);
  }
}

/**
 * The frame's line about the file: the archive or the server it came from,
 * when it came from one, first, so a narrow window cuts the date before it;
 * then size, content, and when it was last modified.
 */
export function fileFacts(info: ViewerFileInfo, labels: ViewerLabels): string {
  const modified = labels.dateTime(info.modifiedMs);

  return [
    info.origin && labels.inArchive(info.origin.archiveName),
    labels.size(info.sizeBytes),
    contentLabel(info.content, labels),
    modified && labels.modified(modified)
  ]
    .filter(Boolean)
    .join(' · ');
}

/** The exact size for the facts' tooltip: "1,234,567 bytes". */
export function exactSize(sizeBytes: number, labels: ViewerLabels): string {
  return labels.exactSize(sizeBytes);
}

/**
 * The facts' tooltip: the exact size, and for a file from an archive or a
 * server, where there the file is and that the window shows a read-only copy.
 */
export function factsTitle(info: ViewerFileInfo, labels: ViewerLabels): string {
  const size = exactSize(info.sizeBytes, labels);

  return info.origin
    ? `${size}\n${labels.readOnlyCopy(info.origin.entryPath, info.origin.archiveName)}`
    : size;
}

/**
 * What the frame says when the file on disk is no longer the one the window
 * shows, and whether Reload can bring it in; null while nothing changed. A
 * removed file has nothing to reload, so the window keeps what it opened.
 */
export function changeNotice(
  change: ViewerFileChange,
  labels: ViewerLabels
): { readonly text: string; readonly canReload: boolean } | null {
  switch (change) {
    case 'none':
      return null;
    case 'modified':
      return { text: labels.change.modified, canReload: true };
    case 'replaced':
      return { text: labels.change.replaced, canReload: true };
    case 'removed':
      return { text: labels.change.removed, canReload: false };
  }
}
