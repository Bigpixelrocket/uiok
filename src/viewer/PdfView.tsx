import type { ReactElement } from 'react';

import type { ViewerFileInfo } from './types.js';

import type { ViewerViewProps } from './ViewerViews.js';

/**
 * Where the PDF view loads the document: the file's media URL with its name
 * as a last segment, which Chromium's PDF viewer shows as the toolbar's
 * title (a document's own title metadata wins). The reader's media URL must
 * therefore serve the file whatever segment follows it (`ViewerFileInfo`'s
 * `mediaUrl`); a `blob:` URL cannot, since its path is fixed.
 */
export function pdfDocumentUrl(info: ViewerFileInfo): string {
  return `${info.mediaUrl}/${encodeURIComponent(info.name)}`;
}

/**
 * The PDF view: the browser's built-in PDF viewer, in a frame loaded from
 * the file's media URL (`pdfDocumentUrl`). In Chromium that viewer brings
 * page thumbnails, continuous scroll, go to page, zoom and fit, and text
 * selection and copy, and its own message for a file it cannot open;
 * nothing here parses or renders PDF. Whether its toolbar's Download may
 * save a file is the host's decision, not the view's. The frame is not
 * sandboxed (the PDF viewer does not run in one), so the reader's URL must
 * answer only with the PDF itself (`docs/components/viewer.md`).
 */
function PdfView({ info }: ViewerViewProps): ReactElement {
  return (
    <div className="pdf-view">
      <iframe className="pdf-view-document" src={pdfDocumentUrl(info)} title={info.name} />
    </div>
  );
}

export default PdfView;
