import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  settleRead,
  type ViewerReader,
  type ViewerByteRange,
  type ViewerFileInfo,
  type ViewerResult
} from './types.js';
import { useLabels } from '../labels/UiokProvider.js';

import type { HexColumn } from './HexRows.logic.js';
import {
  copyRange,
  hexCopy,
  hexSelectionTooLarge,
  textCopy,
  type HexSelection
} from './HexSelection.logic.js';
import {
  clampTop,
  covers,
  endAfterRead,
  readWindowFor,
  rowsFrom,
  type HexChunk,
  type HexRow
} from './HexViewport.logic.js';
import { latestRead, type LatestRead } from './LatestRead.logic.js';
import type { ViewerCopy } from './ViewerClipboard.js';

/** The screen the hex view draws: its top row, the rows from there, and where the readable bytes end. */
export interface HexScreen {
  readonly top: number;
  readonly rows: readonly HexRow[];
  /** The opened size, or less once a read found the file shrunk. */
  readonly end: number;
}

/** The hex view's file state: what is on screen, and the calls that move it. */
export interface HexDocument {
  readonly screen: HexScreen | null;
  /** Why the file could not be read, in the reader's copy. */
  readonly failure: string | null;
  /** Shows the screen whose top row is `row`, kept between the first row and the last screen. */
  readonly go: (row: number) => void;
  /** Moves `rows` rows from the newest target, so moves made while a read is in flight add up. */
  readonly scroll: (rows: number) => void;
  /** The selected bytes in hex or as text, read in one bounded read when the view does not hold them; or why not. */
  readonly copy: (selection: HexSelection, as: HexColumn) => ViewerCopy;
}

/** The document's settings that change without a new file: the screen's height. */
export interface HexDocumentView {
  /** Rows drawn, the last of which may show only in part. */
  readonly screenRows: number;
  /** Rows that fit whole, so the end of the file shows its last row fully. */
  readonly fullRows: number;
}

const chunkOf = ({ offset, bytes, endOfFile }: ViewerByteRange): HexChunk => ({
  offset,
  bytes,
  eof: endOfFile
});

/**
 * Reads the window's file for the hex view: each screen comes from the bytes
 * already held or from one bounded read around it, the newest target
 * winning. A read about another generation of the file (one in flight across
 * a reload) is dropped. A read that finds the file shrunk ends the view at
 * the new end for as long as the view lives, pulling the screen back when it
 * was past it; a read that lands wholly past the new end asks the file's size
 * once, so the screen comes back in one more read however far it was.
 */
export function useHexDocument(
  reader: ViewerReader,
  info: ViewerFileInfo,
  view: HexDocumentView
): HexDocument {
  const labels = useLabels();
  const noAnswer = labels.viewer.noAnswer;
  const [screen, setScreen] = useState<HexScreen | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const chunk = useRef<HexChunk | null>(null);
  // Where the readable bytes end: the opened size, lowered when the file is
  // found shorter. A reload remounts the view, so it never rises.
  const end = useRef(info.sizeBytes);
  const viewRef = useRef(view);
  const requests = useRef<LatestRead<number> | null>(null);
  const current = useRef(0);

  const clamp = useCallback(
    (row: number): number => clampTop(row, end.current, viewRef.current.fullRows),
    []
  );

  const show = useCallback(
    (target: number): void => {
      const held = chunk.current;
      if (held === null) return;

      const top = clamp(target);
      current.current = top;

      // The file shrank under the screen: show the last screen there is.
      if (top !== target) {
        requests.current?.request(top);
        return;
      }

      setScreen({
        top,
        end: end.current,
        rows: rowsFrom(held, top, viewRef.current.screenRows, end.current)
      });
    },
    [clamp]
  );

  useEffect(() => {
    let disposed = false;

    // The size the file has now, for a read that found it shorter without
    // saying by how much.
    const measure = (): void => {
      void settleRead(noAnswer, () => reader.inspect()).then((result) => {
        if (disposed) return;
        if (!result.ok) {
          setFailure(result.error.message);
          return;
        }
        if (result.value.generation !== info.generation) return;

        end.current = Math.min(end.current, result.value.sizeBytes);
        current.current = clamp(current.current);
        requests.current?.request(current.current);
      });
    };

    const byteReader = latestRead<number, ViewerResult<ViewerByteRange>>({
      covered: (target) => covers(chunk.current, clamp(target), viewRef.current.screenRows),
      read: (target) =>
        settleRead(noAnswer, () =>
          reader.readRange(readWindowFor(clamp(target), viewRef.current.screenRows))
        ),
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
        const nextEnd = endAfterRead(next, end.current);
        if (nextEnd === null) {
          measure();
          return false;
        }

        end.current = nextEnd;
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
  }, [noAnswer, reader, clamp, info.generation, show]);

  // A taller window redraws from the same row.
  useEffect(() => {
    viewRef.current = view;
    requests.current?.request(current.current);
  }, [view]);

  const go = useCallback(
    (row: number): void => {
      current.current = clamp(row);
      requests.current?.request(current.current);
    },
    [clamp]
  );

  const scroll = useCallback(
    (rows: number): void => {
      if (rows !== 0) go(current.current + rows);
    },
    [go]
  );

  const copy = useCallback<HexDocument['copy']>(
    (selection, as) => {
      const range = copyRange(selection, end.current);
      const format = as === 'hex' ? hexCopy : textCopy;

      if (range === null) return { error: hexSelectionTooLarge(labels.viewer) };
      if (range.length === 0) return { text: '' };

      const held = chunk.current;
      if (
        held !== null &&
        held.offset <= range.offset &&
        held.offset + held.bytes.length >= range.offset + range.length
      ) {
        const from = range.offset - held.offset;
        return { text: format(held.bytes.subarray(from, from + range.length)) };
      }

      return {
        pending: settleRead(noAnswer, () => reader.readRange(range)).then((result) => {
          if (!result.ok) throw new Error(result.error.message);
          if (result.value.generation !== info.generation) {
            throw new Error(labels.viewer.hex.copyReloaded);
          }
          return format(result.value.bytes);
        })
      };
    },
    [labels.viewer, noAnswer, reader, info.generation]
  );

  return useMemo(
    () => ({ screen, failure, go, scroll, copy }),
    [screen, failure, go, scroll, copy]
  );
}
