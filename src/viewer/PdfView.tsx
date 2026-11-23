import type { ReactElement } from 'react';

import type { ViewerFileInfo } from './types.js';

import type { ViewerViewProps } from './ViewerViews.js';

/**
 * Where the PDF view loads the document: the file's media URL with its name
 * as a last segment, which Chromium's PDF viewer shows as the toolbar's
 * title (a document's own title metadata wins). The media scheme ignores
 * the segment, so it names nothing a page could load, and the page already
 * holds the name.
 */
export function pdfDocumentUrl(info: ViewerFileInfo): string {
  return `${info.mediaUrl}/${encodeURIComponent(info.name)}`;
}

/**
 * The PDF view: Chromium's built-in PDF viewer, in a frame loaded from the
 * read-only media scheme. The viewer brings Preview-style browsing (page
 * thumbnails, continuous scroll, the page number and go to page, zoom and
 * fit, text selection and copy) and its own message for a file it cannot
 * open; nothing here parses or renders PDF. Its toolbar's Download is
 * refused by the viewer session (`ViewerWindows.ts`), so nothing writes a
 * file.
 */
function PdfView({ info }: ViewerViewProps): ReactElement {
  return (
    <div className="pdf-view">
      <iframe className="pdf-view-document" src={pdfDocumentUrl(info)} title={info.name} />
    </div>
  );
}

export default PdfView;
