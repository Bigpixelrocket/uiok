import { describe, expect, it } from 'vitest';

import type { ViewerContentKind, ViewerFileInfo } from './types.js';

import {
  changeNotice,
  contentLabel,
  exactSize,
  factsTitle,
  fallbackViewFor,
  fileFacts,
  VIEWER_MODES,
  viewForKind
} from './ViewerFrame.logic.js';
import { VIEWER_VIEWS } from './ViewerViews.js';
import { DEFAULT_VIEWER_LABELS as L } from '../labels/viewer.js';

const VIEWER_CONTENT_KINDS: readonly ViewerContentKind[] = [
  'text',
  'binary',
  'image',
  'svg',
  'audio',
  'video',
  'pdf'
];

describe('VIEWER_MODES', () => {
  it('offers every kind its own view first and hex as the fallback, each with a registered view', () => {
    for (const kind of VIEWER_CONTENT_KINDS) {
      const modes = VIEWER_MODES[kind];

      expect(modes.at(-1)?.view, kind).toBe('hex');
      for (const mode of modes) expect(VIEWER_VIEWS[mode.view], mode.view).toBeDefined();
    }

    expect(VIEWER_MODES.binary.map((mode) => L.modes[mode.label])).toEqual(['Hex']);
    expect(VIEWER_MODES.svg.map((mode) => L.modes[mode.label])).toEqual(['Image', 'Source', 'Hex']);
  });
});

describe('viewForKind', () => {
  it('keeps the chosen view when the kind still offers it, else opens on the first', () => {
    expect(viewForKind('text', null)).toBe('text');
    expect(viewForKind('image', 'hex')).toBe('hex');
    expect(viewForKind('binary', 'text')).toBe('hex');
    expect(viewForKind('svg', 'text')).toBe('text');
    expect(viewForKind('svg', null)).toBe('image');
  });
});

describe('fallbackViewFor', () => {
  it("sends a broken SVG to its source, and every other kind's failure to hex", () => {
    for (const kind of VIEWER_CONTENT_KINDS) {
      const view = fallbackViewFor(kind);

      expect(view, kind).toBe(kind === 'svg' ? 'text' : 'hex');
      expect(
        VIEWER_MODES[kind].some((mode) => mode.view === view),
        kind
      ).toBe(true);
    }
  });
});

describe('the file facts', () => {
  const info: ViewerFileInfo = {
    generation: 0,
    name: 'photo.png',
    sizeBytes: 1_468_006,
    modifiedMs: new Date(2026, 9, 5, 14, 3).getTime(),
    content: { kind: 'image', mimeType: 'image/png' },
    change: 'none',
    mediaUrl: 'viewer-media://file/0000000000000000000000000000000000000000000000000000000000000000'
  };

  it('reads as size, content, and modification date', () => {
    expect(fileFacts(info, L)).toBe('1.4 MB · PNG image · Modified 2026-10-05 14:03');
    expect(exactSize(info.sizeBytes, L)).toBe('1,468,006 bytes');
    expect(exactSize(1, L)).toBe('1 byte');
    expect(factsTitle(info, L)).toBe('1,468,006 bytes');
  });

  it('names the archive a copy came from first, and where inside it on hover', () => {
    const copy = { ...info, origin: { archiveName: 'photos.zip', entryPath: '2026/photo.png' } };

    expect(fileFacts(copy, L)).toBe(
      'in photos.zip · 1.4 MB · PNG image · Modified 2026-10-05 14:03'
    );
    expect(factsTitle(copy, L)).toBe(
      '1,468,006 bytes\nA read-only copy of 2026/photo.png in photos.zip'
    );
  });

  it('names the content by format where one is known', () => {
    expect(contentLabel({ kind: 'video', mimeType: 'video/quicktime' }, L)).toBe('QuickTime video');
    expect(contentLabel({ kind: 'audio', mimeType: 'audio/x-unknown' }, L)).toBe('Audio');
    expect(contentLabel({ kind: 'binary', mimeType: 'application/octet-stream' }, L)).toBe(
      'Binary'
    );
    expect(contentLabel({ kind: 'pdf', mimeType: 'application/pdf' }, L)).toBe('PDF document');
  });

  it('names no format for a media type that is an inherited key', () => {
    expect(contentLabel({ kind: 'image', mimeType: 'toString' }, L)).toBe('Image');
    expect(contentLabel({ kind: 'video', mimeType: '__proto__' }, L)).toBe('Video');
    expect(contentLabel({ kind: 'audio', mimeType: 'constructor' }, L)).toBe('Audio');
  });
});

describe('changeNotice', () => {
  it('stays quiet while nothing changed and offers Reload only where there is a file to reload', () => {
    expect(changeNotice('none', L)).toBeNull();
    expect(changeNotice('modified', L)).toEqual({
      text: 'The file changed on disk.',
      canReload: true
    });
    expect(changeNotice('replaced', L)?.canReload).toBe(true);
    expect(changeNotice('removed', L)?.canReload).toBe(false);
  });
});
