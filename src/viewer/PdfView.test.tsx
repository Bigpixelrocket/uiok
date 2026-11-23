import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import type { ViewerReader, ViewerFileInfo } from './types.js';

import PdfView, { pdfDocumentUrl } from './PdfView.js';

const MEDIA_URL = `viewer-media://file/${'c'.repeat(64)}`;

const info: ViewerFileInfo = {
  generation: 0,
  name: 'Q3 report #2?.pdf',
  sizeBytes: 120_000,
  modifiedMs: 0,
  content: { kind: 'pdf', mimeType: 'application/pdf' },
  change: 'none',
  mediaUrl: MEDIA_URL
};

/** The view never reads through its reader: Chromium's PDF viewer loads the file from the media URL. */
const reader = {} as ViewerReader;

afterEach(cleanup);

describe('PdfView', () => {
  it("frames the file's media URL, named for the PDF viewer's title and nothing else", () => {
    render(<PdfView reader={reader} info={info} onFallback={() => undefined} />);
    const frame = screen.getByTitle('Q3 report #2?.pdf');

    expect(frame.tagName).toBe('IFRAME');
    expect(frame.getAttribute('src')).toBe(`${MEDIA_URL}/Q3%20report%20%232%3F.pdf`);
    // The name is one segment: a query or fragment character cannot cut it short.
    expect(new URL(pdfDocumentUrl(info)).pathname).toBe(
      `/${'c'.repeat(64)}/Q3%20report%20%232%3F.pdf`
    );
  });

  it.each([
    ['..', 'document.pdf'],
    ['.', 'document.pdf'],
    ['', 'document.pdf'],
    ['%2e%2e', '%252e%252e'],
    ['.%2e', '.%252e'],
    ['../../secret.pdf', '..%2F..%2Fsecret.pdf'],
    ['...', '...'],
    ['scan\uD800.pdf', 'document.pdf']
  ])('keeps the name %j one segment below the media URL', (name, segment) => {
    const url = new URL(pdfDocumentUrl({ ...info, name }));

    expect(url.pathname).toBe(`/${'c'.repeat(64)}/${segment}`);
    expect(url.search).toBe('');
    expect(url.hash).toBe('');
  });
});
