import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  settleRead,
  type ViewerReader,
  type ViewerByteRange,
  type ViewerFileInfo,
  type ViewerResult
} from './types.js';
import { useLabels } from '../labels/UiokProvider.js';

import { latestRead, type LatestRead } from './LatestRead.logic.js';
import { detectEncoding, textDecoder, type TextLayout } from './TextEncoding.logic.js';
import { rowsFrom, type RowStart, type TextChunk } from './TextRows.logic.js';
import {
  copyRange,
  orderedSelection,
  selectedText,
  selectionTooLarge,
  type TextSelection
} from './TextSelection.logic.js';
import {
  covers,
  lineFromAnchor,
  numberRows,
  readWindowFor,
  resolveViewport,
  type LineAnchor,
  type ViewTarget
} from './TextViewport.logic.js';
import type { ViewerCopy } from './ViewerClipboard.js';

/** One row on screen: its place in the file, its text, and its line number when known. */
export interface ScreenRow {
  readonly start: number;
  readonly end: number;
  readonly kind: RowStart['kind'];
  readonly text: string;
  /** The row's line number; null on a row that continues a line, or while the index has not reached it. */
  readonly line: number | null;
}

/** The screen the view draws. */
export interface TextScreen {
  readonly top: RowStart;
  readonly rows: readonly ScreenRow[];
  /** The line holding the first row, once the line index has reached the screen; until then the gutter shows byte offsets. */
  readonly topLine: number | null;
  /** False while a move longer than a page is still on its way; the view lands it on the screen where it ends. */
  readonly settled: boolean;
  /** Where the readable bytes end: the opened size, or less once a read found the file shrunk. */
  readonly end: number;
  /** The bytes the rows were drawn from, which highlighting tokenizes too. */
  readonly source: TextChunk;
}

/** The text view's file state: what is on screen, and the calls that move it. */
export interface TextDocument {
  readonly layout: TextLayout | null;
  /** The file's first line (its first 256 bytes at most), once read; it names a script's interpreter. */
  readonly firstLine: string | null;
  readonly screen: TextScreen | null;
  /** True once the file turned out to hold no text. */
  readonly empty: boolean;
  /** Why the file could not be read, in the reader's copy. */
  readonly failure: string | null;
  /** Shows `target`, reading at most once, and only for the newest target. */
  readonly go: (target: ViewTarget) => void;
  /** Moves `rows` rows from the newest target, so moves made while a read is in flight add up. */
  readonly scroll: (rows: number) => void;
  /** The selected text, read in one bounded read when the screen does not hold it; or why not. */
  readonly copy: (selection: TextSelection) => ViewerCopy;
}

/** The document's settings that change without a new file: screen height and wrapping. */
export interface TextDocumentView {
  /** Rows drawn, the last of which may show only in part. */
  readonly screenRows: number;
  /** Rows that fit whole, so the end of the file pulls its last row fully into view. */
  readonly fullRows: number;
  readonly wrap: boolean;
}

const chunkOf = ({ offset, bytes, endOfFile }: ViewerByteRange): TextChunk => ({
  offset,
  bytes,
  eof: endOfFile
});

/** How much of the head the first line is read from. */
const FIRST_LINE_BYTES = 256;

/**
 * Where the readable bytes end after a read: lowered to the end of a read
 * that reached the end of the file; null for a read that found nothing past
 * a shrunk end, which says the file is shorter but not by how much.
 */
function endAfterRead(chunk: TextChunk, end: number): number | null {
  if (!chunk.eof) return end;
  if (chunk.bytes.length === 0 && chunk.offset > 0) return null;

  return Math.min(end, chunk.offset + chunk.bytes.length);
}

/**
 * Reads the window's file for the text view, the way `less` does: the first
 * read finds the encoding and the first screen, and each later screen comes
 * from bytes already held or from one bounded read, the newest target
 * winning. Line numbers come from the reader's line count, asked
 * only for the top row and carried down the screen; a read or an answer
 * about another generation of the file (one in flight across a reload) is
 * dropped. A read that finds the file shrunk ends the view at the new end
 * for as long as the view lives; a read that lands wholly past it asks the
 * file's size once, so the screen comes back in one more read however far
 * past the end it was.
 */
export function useTextDocument(
  reader: ViewerReader,
  info: ViewerFileInfo,
  view: TextDocumentView
): TextDocument {
  const labels = useLabels();
  const noAnswer = labels.viewer.noAnswer;
  const [layout, setLayout] = useState<TextLayout | null>(null);
  const [firstLine, setFirstLine] = useState<string | null>(null);
  const [screen, setScreen] = useState<TextScreen | null>(null);
  const [empty, setEmpty] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const chunk = useRef<TextChunk | null>(null);
  // Where the readable bytes end: the opened size, lowered when the file is
  // found shorter. A reload remounts the view, so it never rises.
  const readableEnd = useRef(info.sizeBytes);
  const layoutRef = useRef<TextLayout | null>(null);
  const viewRef = useRef(view);
  const requests = useRef<LatestRead<ViewTarget> | null>(null);
  const current = useRef<ViewTarget>({ anchor: 0, rows: 0 });
  const lineAnchor = useRef<LineAnchor | null>(null);
  const asked = useRef<number | null>(null);
  const decoder = useRef<TextDecoder | null>(null);

  const decode = useCallback((source: TextChunk, from: number, to: number): string => {
    const active = decoder.current;
    return active === null
      ? ''
      : active.decode(source.bytes.subarray(from - source.offset, to - source.offset));
  }, []);

  const show = useCallback(
    (target: ViewTarget): void => {
      const held = chunk.current;
      const textLayout = layoutRef.current;
      if (held === null || textLayout === null) return;

      const { screenRows, fullRows, wrap } = viewRef.current;
      const viewport = resolveViewport(held, textLayout, target, screenRows, wrap ? 1 : fullRows);

      current.current = viewport ? { anchor: viewport.top.start, rows: viewport.rest } : target;
      if (viewport === null) {
        setEmpty(true);
        setScreen(null);
        return;
      }

      const known = lineAnchor.current;
      const topLine =
        known === null ? null : lineFromAnchor(held, textLayout, known, viewport.top.start);
      const lines = topLine === null ? null : numberRows(viewport.rows, topLine);

      if (topLine !== null) {
        lineAnchor.current = { offset: viewport.top.start, line: topLine };
      }

      setEmpty(false);
      setScreen({
        top: viewport.top,
        topLine,
        settled: viewport.rest === 0,
        end: readableEnd.current,
        source: held,
        rows: viewport.rows.map((row, index) => ({
          start: row.start,
          end: row.end,
          kind: row.kind,
          text: decode(held, row.start, row.textEnd),
          line: lines?.[index] ?? null
        }))
      });

      // A move longer than a page goes on from this screen; only where it
      // ends does the line index get asked.
      if (viewport.rest !== 0) {
        requests.current?.request(current.current);
        return;
      }

      if (topLine === null && asked.current !== viewport.top.start) {
        const offset = viewport.top.start;
        asked.current = offset;

        void settleRead(noAnswer, () =>
          reader.lineNumber({ offset, encoding: textLayout.encoding })
        ).then((result) => {
          // Answered either way, so coming back to this row later asks again.
          if (asked.current === offset) asked.current = null;
          if (!result.ok || result.value.generation !== info.generation) return;
          if (result.value.line === null) return;

          lineAnchor.current = { offset, line: result.value.line };
          requests.current?.request(current.current);
        });
      }
    },
    [noAnswer, reader, decode, info.generation]
  );

  useEffect(() => {
    let disposed = false;

    // The size the file has now, for a read that found it shorter without
    // saying by how much: the target comes back within it.
    const measure = (): void => {
      void settleRead(noAnswer, () => reader.inspect()).then((result) => {
        if (disposed) return;
        if (!result.ok) {
          setFailure(result.error.message);
          return;
        }
        if (result.value.generation !== info.generation) return;

        readableEnd.current = Math.min(readableEnd.current, result.value.sizeBytes);
        // Bytes held past the new end are no longer the file's, so the
        // target is read again rather than drawn from them.
        const held = chunk.current;
        if (held !== null && held.offset + held.bytes.length > readableEnd.current) {
          chunk.current = null;
        }
        current.current = {
          anchor: Math.min(current.current.anchor, readableEnd.current),
          rows: current.current.rows
        };
        requests.current?.request(current.current);
      });
    };

    const byteReader = latestRead<ViewTarget, ViewerResult<ViewerByteRange>>({
      covered: (target) => covers(chunk.current, target, viewRef.current.screenRows),
      read: (target) => {
        const window = readWindowFor(target, viewRef.current.screenRows);
        return settleRead(noAnswer, () => reader.readRange(window));
      },
      store: (result) => {
        if (disposed) return false;
        if (!result.ok) {
          setFailure(result.error.message);
          return false;
        }
        // A read that was in flight across a reload belongs to the file
        // this view no longer shows.
        if (result.value.generation !== info.generation) return false;

        const next = chunkOf(result.value);
        const nextEnd = endAfterRead(next, readableEnd.current);
        if (nextEnd === null) {
          measure();
          return false;
        }

        if (layoutRef.current === null) {
          if (next.offset !== 0) return false;

          const detected = detectEncoding(next.bytes, next.eof);
          const head = next.bytes.subarray(detected.contentStart, FIRST_LINE_BYTES);
          layoutRef.current = detected;
          decoder.current = textDecoder(detected.encoding);
          setLayout(detected);
          setFirstLine(decoder.current.decode(head).split(/\r?\n/u, 1)[0] ?? '');
        }

        readableEnd.current = nextEnd;
        chunk.current = next;
        setFailure(null);
        return true;
      },
      show
    });

    requests.current = byteReader;
    byteReader.request(current.current);

    return () => {
      disposed = true;
      byteReader.dispose();
      requests.current = null;
    };
  }, [noAnswer, reader, info.generation, show]);

  // A taller window or a wrap toggle redraws the same place.
  useEffect(() => {
    viewRef.current = view;
    requests.current?.request(current.current);
  }, [view]);

  const go = useCallback((target: ViewTarget): void => {
    current.current = { anchor: Math.min(target.anchor, readableEnd.current), rows: target.rows };
    requests.current?.request(current.current);
  }, []);

  const scroll = useCallback(
    (rows: number): void => {
      if (rows !== 0) go({ anchor: current.current.anchor, rows: current.current.rows + rows });
    },
    [go]
  );

  const copy = useCallback<TextDocument['copy']>(
    (selection) => {
      const textLayout = layoutRef.current;
      const range = copyRange(selection, readableEnd.current);

      if (range === null) return { error: selectionTooLarge(labels.viewer) };
      if (textLayout === null || range.length === 0) return { text: '' };

      const [start, end] = orderedSelection(selection);
      const textFrom = (source: TextChunk): string =>
        selectedText(
          selection,
          rowsFrom(
            source,
            textLayout,
            { start: start.row, kind: start.kind },
            Number.MAX_SAFE_INTEGER
          )
            .rows.filter((row) => row.start <= end.row)
            .map((row) => ({
              start: row.start,
              end: row.end,
              kind: row.kind,
              text: decode(source, row.start, row.textEnd),
              lineBreak: decode(source, row.textEnd, row.end)
            }))
        );

      const held = chunk.current;
      if (
        held !== null &&
        held.offset <= range.offset &&
        (held.eof || held.offset + held.bytes.length >= range.offset + range.length)
      ) {
        return { text: textFrom(held) };
      }

      return {
        pending: settleRead(noAnswer, () => reader.readRange(range)).then((result) => {
          if (!result.ok) throw new Error(result.error.message);
          if (result.value.generation !== info.generation) {
            throw new Error(labels.viewer.text.copyReloaded);
          }
          return textFrom(chunkOf(result.value));
        })
      };
    },
    [labels.viewer, noAnswer, reader, decode, info.generation]
  );

  return useMemo(
    () => ({ layout, firstLine, screen, empty, failure, go, scroll, copy }),
    [layout, firstLine, screen, empty, failure, go, scroll, copy]
  );
}
