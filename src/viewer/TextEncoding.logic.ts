/**
 * The text view's encoding detection: a byte order mark first, then whether
 * the head of the file is valid UTF-8, else Latin-1. Detection reads only the
 * head the view already read for its first screen; no decoder beyond the
 * platform's `TextDecoder` is involved.
 */

import type { ViewerTextEncoding } from './types.js';
import type { ViewerLabels } from '../labels/viewer.js';

/** How much of the head the UTF-8 check decodes: enough to meet a stray Latin-1 byte early. */
export const ENCODING_SNIFF_BYTES = 64 * 1024;

/** A detected encoding and where the text begins, past any byte order mark. */
export interface TextLayout {
  readonly encoding: ViewerTextEncoding;
  /** Bytes of the byte order mark the file starts with; the text starts after them. */
  readonly contentStart: number;
}

/**
 * The encoding of a file from its first bytes. A UTF-8 mark gives UTF-8, a
 * UTF-16 mark gives UTF-16 in its byte order; without a mark, a head that
 * decodes as UTF-8 gives UTF-8 and anything else Latin-1. A character cut
 * off where the sample stops is fine, unless `wholeFile` says the head runs
 * to the end of the file and the sample holds all of it: then the cut-off
 * bytes are the file's last, and not UTF-8. UTF-16 without a mark is not
 * detected: it sniffs as binary before it reaches the text view.
 */
export function detectEncoding(head: Uint8Array, wholeFile = false): TextLayout {
  if (head[0] === 0xef && head[1] === 0xbb && head[2] === 0xbf) {
    return { encoding: 'utf-8', contentStart: 3 };
  }
  if (head[0] === 0xff && head[1] === 0xfe) return { encoding: 'utf-16le', contentStart: 2 };
  if (head[0] === 0xfe && head[1] === 0xff) return { encoding: 'utf-16be', contentStart: 2 };

  const sample = head.subarray(0, ENCODING_SNIFF_BYTES);

  try {
    new TextDecoder('utf-8', { fatal: true }).decode(sample, {
      stream: !wholeFile || sample.length < head.length
    });
    return { encoding: 'utf-8', contentStart: 0 };
  } catch {
    return { encoding: 'latin-1', contentStart: 0 };
  }
}

/** The encoding as the status bar names it. */
export function encodingLabel(
  { encoding, contentStart }: TextLayout,
  labels: ViewerLabels
): string {
  switch (encoding) {
    case 'utf-8':
      return contentStart > 0 ? labels.text.utf8Bom : 'UTF-8';
    case 'utf-16le':
      return 'UTF-16 LE';
    case 'utf-16be':
      return 'UTF-16 BE';
    case 'latin-1':
      return 'Latin-1';
  }
}

/**
 * A decoder for the encoding that keeps a mark in the middle of the text as
 * a character and turns an invalid sequence into U+FFFD instead of failing.
 * The platform's `latin1` label decodes as Windows-1252, the superset every
 * browser uses for it, so 80 to 9F show as printable characters.
 */
export function textDecoder(encoding: ViewerTextEncoding): TextDecoder {
  return new TextDecoder(encoding === 'latin-1' ? 'latin1' : encoding, { ignoreBOM: true });
}
