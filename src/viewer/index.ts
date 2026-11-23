/**
 * The read-only file viewer: `ViewerWindow`, one file shown as text with
 * syntax highlighting, hex, image, audio, video, or PDF, read a bounded
 * range at a time through a `ViewerReader` the app supplies. Imported on its
 * own as `@bigpixelrocket/uiok/viewer`, never from the package root, so an
 * app that shows no viewer never bundles its highlighting worker; its look
 * is viewer.css, which the base stylesheet imports.
 */

export { ViewerWindow, type ViewerWindowProps } from './ViewerWindow.js';
export { isViewerCloseKey, type ViewerKeyStroke } from './ViewerKeys.js';
export { openSyntaxWorker, type SyntaxPort, type SyntaxWorkerFactory } from './SyntaxService.js';
export {
  VIEWER_MAX_READ_BYTES,
  type ViewerByteRange,
  type ViewerContentKind,
  type ViewerContentType,
  type ViewerFileChange,
  type ViewerFileInfo,
  type ViewerFileOrigin,
  type ViewerLineNumber,
  type ViewerLineNumberRequest,
  type ViewerReader,
  type ViewerReadFailure,
  type ViewerReadRangeRequest,
  type ViewerResult,
  type ViewerTextEncoding
} from './types.js';
