/**
 * The file viewer over an in-memory reader: a TypeScript file in the text
 * view (highlighted in the viewer's worker, with line numbers, wrapping,
 * and copy), a binary file in hex (Go to Offset, selection, Copy Hex), and a
 * picture drawn on a canvas in the theme's tokens in the image view (fit,
 * actual size, zoom). The last file says it changed on disk, so the notice
 * and Reload show.
 */

import { useEffect, useMemo, useState, type CSSProperties } from 'react';

import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';
import {
  ViewerWindow,
  type ViewerContentKind,
  type ViewerFileChange,
  type ViewerFileInfo,
  type ViewerReader
} from '@bigpixelrocket/uiok/viewer';

/** A file the demo serves: its name, bytes, kind, and where a native view loads it from. */
interface DemoFile {
  readonly name: string;
  readonly bytes: Uint8Array;
  readonly kind: ViewerContentKind;
  readonly mimeType: string;
  readonly mediaUrl: string;
  readonly change: ViewerFileChange;
}

/** A source file long enough to scroll: a store of sessions, repeated with numbered handlers. */
const SOURCE = [
  '// A small session store, kept in memory.',
  "import { randomUUID } from 'node:crypto';",
  '',
  'export interface Session {',
  '  readonly id: string;',
  '  readonly user: string;',
  '  readonly startedAt: Date;',
  '}',
  '',
  'const sessions = new Map<string, Session>();',
  '',
  ...Array.from({ length: 60 }, (_, index) => [
    `/** Opens session ${index + 1} for \`user\`, replacing any it held. */`,
    `export function open${index + 1}(user: string): Session {`,
    '  const session = { id: randomUUID(), user, startedAt: new Date() };',
    `  sessions.set(\`\${user}:${index + 1}\`, session);`,
    '  return session;',
    '}',
    ''
  ]).flat()
].join('\n');

/** Bytes with a header, text, and a run of every byte value, as a binary file holds. */
const BINARY = (() => {
  const bytes = new Uint8Array(4096);
  bytes.set(new TextEncoder().encode('UIOK\u0001\u0000demo archive\u0000'), 0);
  for (let index = 32; index < bytes.length; index += 1) bytes[index] = (index * 37) % 256;
  return bytes;
})();

/** A 640 × 400 picture painted in the theme's accent and grounds, as a PNG data URL. */
function paintPicture(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 640;
  canvas.height = 400;
  const context = canvas.getContext('2d');
  if (context === null) return '';
  const style = getComputedStyle(document.documentElement);
  const token = (name: string): string => style.getPropertyValue(name).trim();

  context.fillStyle = token('--surface');
  context.fillRect(0, 0, 640, 400);
  context.fillStyle = token('--accent');
  context.fillRect(40, 40, 260, 320);
  context.fillStyle = token('--success');
  context.beginPath();
  context.arc(470, 200, 120, 0, Math.PI * 2);
  context.fill();

  return canvas.toDataURL('image/png');
}

/** A data URL's bytes, so the hex view of the picture shows the PNG it is. */
function dataUrlBytes(url: string): Uint8Array {
  const base64 = url.slice(url.indexOf(',') + 1);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/** A reader over one in-memory file, answering as a host would. */
function memoryReader(file: DemoFile): ViewerReader {
  const info: ViewerFileInfo = {
    generation: 0,
    name: file.name,
    sizeBytes: file.bytes.length,
    modifiedMs: new Date(2026, 10, 2, 9, 30).getTime(),
    content: { kind: file.kind, mimeType: file.mimeType },
    change: file.change,
    mediaUrl: file.mediaUrl
  };
  const ok = <T,>(value: T) => Promise.resolve({ ok: true as const, value });

  return {
    inspect: () => ok(info),
    reload: () => ok({ ...info, change: 'none' }),
    readRange: ({ offset, length }) =>
      ok({
        generation: 0,
        offset,
        bytes: file.bytes.slice(offset, offset + length),
        endOfFile: offset + length >= file.bytes.length
      }),
    lineNumber: ({ offset }) => {
      let line = 1;
      for (let index = 0; index < offset && index < file.bytes.length; index += 1) {
        if (file.bytes[index] === 0x0a) line += 1;
      }
      return ok({ generation: 0, offset, line });
    }
  };
}

const FILES = ['Source', 'Binary', 'Picture'] as const;
type FileChoice = (typeof FILES)[number];

/** The viewer's box on the page: a window's height, framed. */
const FRAME: CSSProperties = {
  height: '460px',
  overflow: 'hidden',
  border: 'var(--line) solid var(--border-strong)',
  borderRadius: 'var(--radius-md)'
};

export function ViewerDemo() {
  const [choice, setChoice] = useState<FileChoice>('Source');
  const [picture, setPicture] = useState<string | null>(null);

  useEffect(() => setPicture(paintPicture()), []);

  const reader = useMemo((): ViewerReader | null => {
    if (choice === 'Source') {
      return memoryReader({
        name: 'sessions.ts',
        bytes: new TextEncoder().encode(SOURCE),
        kind: 'text',
        mimeType: 'text/plain',
        mediaUrl: 'about:blank',
        change: 'none'
      });
    }
    if (choice === 'Binary') {
      return memoryReader({
        name: 'archive.bin',
        bytes: BINARY,
        kind: 'binary',
        mimeType: 'application/octet-stream',
        mediaUrl: 'about:blank',
        change: 'none'
      });
    }
    if (picture === null) return null;
    return memoryReader({
      name: 'shapes.png',
      bytes: dataUrlBytes(picture),
      kind: 'image',
      mimeType: 'image/png',
      mediaUrl: picture,
      change: 'modified'
    });
  }, [choice, picture]);

  return (
    <div className="demo-stack">
      <span className="demo-row">
        <span id="viewer-demo-file">File</span>
        <SegmentedChoice
          choices={FILES}
          labelId="viewer-demo-file"
          onChange={setChoice}
          render={(file) => file}
          value={choice}
        />
      </span>
      <div style={FRAME}>
        {reader === null ? null : (
          <ViewerWindow key={choice} onClose={() => undefined} reader={reader} />
        )}
      </div>
    </div>
  );
}
