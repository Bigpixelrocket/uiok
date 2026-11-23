import { describe, expect, it } from 'vitest';

import {
  detectEncoding,
  encodingLabel,
  ENCODING_SNIFF_BYTES,
  textDecoder
} from './TextEncoding.logic.js';
import { DEFAULT_VIEWER_LABELS as L } from '../labels/viewer.js';

const bytes = (...values: number[]): Uint8Array => new Uint8Array(values);

describe('detectEncoding', () => {
  it('reads a byte order mark first and starts the text after it', () => {
    expect(detectEncoding(bytes(0xef, 0xbb, 0xbf, 0x61))).toEqual({
      encoding: 'utf-8',
      contentStart: 3
    });
    expect(detectEncoding(bytes(0xff, 0xfe, 0x61, 0x00))).toEqual({
      encoding: 'utf-16le',
      contentStart: 2
    });
    expect(detectEncoding(bytes(0xfe, 0xff, 0x00, 0x61))).toEqual({
      encoding: 'utf-16be',
      contentStart: 2
    });
  });

  it('takes valid UTF-8 as UTF-8, even with a character cut off at the end of the head', () => {
    expect(detectEncoding(new TextEncoder().encode('plain ascii'))).toEqual({
      encoding: 'utf-8',
      contentStart: 0
    });
    expect(detectEncoding(bytes(0x63, 0x61, 0x66, 0xc3, 0xa9, 0xe2, 0x82))).toMatchObject({
      encoding: 'utf-8'
    });
  });

  it('falls back to Latin-1 for bytes that are not UTF-8', () => {
    expect(detectEncoding(bytes(0x63, 0x61, 0x66, 0xe9, 0x20))).toEqual({
      encoding: 'latin-1',
      contentStart: 0
    });
  });

  it('takes a lead byte the file ends on as Latin-1, but not one where only the head ends', () => {
    const cafe = bytes(0x63, 0x61, 0x66, 0xe9);

    expect(detectEncoding(cafe, true).encoding).toBe('latin-1');
    expect(detectEncoding(cafe, false).encoding).toBe('utf-8');
    expect(detectEncoding(bytes(0x63, 0x61, 0x66, 0xc3, 0xa9), true).encoding).toBe('utf-8');
  });

  it('decides from the head only, so a stray byte past it does not count', () => {
    const head = new Uint8Array(ENCODING_SNIFF_BYTES + 1).fill(0x61);
    head[ENCODING_SNIFF_BYTES] = 0xff;

    expect(detectEncoding(head).encoding).toBe('utf-8');
    expect(detectEncoding(head, true).encoding).toBe('utf-8');
  });
});

describe('the encoding in words and in a decoder', () => {
  it('names each encoding for the status bar', () => {
    expect(encodingLabel({ encoding: 'utf-8', contentStart: 0 }, L)).toBe('UTF-8');
    expect(encodingLabel({ encoding: 'utf-8', contentStart: 3 }, L)).toBe('UTF-8 with BOM');
    expect(encodingLabel({ encoding: 'utf-16le', contentStart: 2 }, L)).toBe('UTF-16 LE');
    expect(encodingLabel({ encoding: 'utf-16be', contentStart: 2 }, L)).toBe('UTF-16 BE');
    expect(encodingLabel({ encoding: 'latin-1', contentStart: 0 }, L)).toBe('Latin-1');
  });

  it('decodes Latin-1 and keeps a mark in the middle of the text', () => {
    expect(textDecoder('latin-1').decode(bytes(0x63, 0x61, 0x66, 0xe9))).toBe('café');
    expect(textDecoder('utf-16le').decode(bytes(0xff, 0xfe, 0x61, 0x00))).toBe('﻿a');
  });
});
