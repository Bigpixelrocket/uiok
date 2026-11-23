import { use, useCallback, useEffect, useRef, useState } from 'react';

import { useLabels } from '../labels/UiokProvider.js';

import {
  HIGHLIGHT_MAX_LINE_BYTES,
  highlightStatus,
  type HighlightNote,
  type HighlightPlan
} from './SyntaxLanguage.logic.js';
import { SyntaxWorkerContext, type SyntaxPort } from './SyntaxService.js';
import type { RowHighlight, SyntaxStyle, SyntaxToken } from './SyntaxSession.logic.js';
import type { TextLayout } from './TextEncoding.logic.js';
import type { TextChunk } from './TextRows.logic.js';
import type { TextScreen } from './useTextDocument.js';

/** Rows whose highlighting the page keeps, so scrolling back draws them without asking. */
const MAX_CACHED_ROWS = 5000;

/** The highlighting the text view draws: each row's tokens, their styles, and the status bar's word. */
export interface SyntaxHighlight {
  readonly styles: readonly SyntaxStyle[];
  /** The tokens of the row starting at byte `start`; null while it has none, or shows plain. */
  readonly tokensFor: (start: number) => readonly SyntaxToken[] | null;
  /** The language and any reason text shows plain; null for a file with no known language. */
  readonly status: string | null;
}

const NO_STYLES: readonly SyntaxStyle[] = [];

/**
 * Highlights the text view's screen in a worker, per `plan`. The worker is
 * started for the plan's language and file generation and stopped with the
 * view. Each screen asks the worker once for its rows, sending the bytes the
 * screen was drawn from when the worker does not hold them yet; while it
 * answers, newer screens only wait, and the newest is asked next, so a
 * fling never queues up work. Answers are kept by row, so a row drawn
 * before draws again at once. A row answered from an approximate state is
 * asked again when a new screen shows it, in case a known state now reaches
 * it.
 */
export function useSyntaxHighlight(
  plan: HighlightPlan,
  generation: number,
  layout: TextLayout | null,
  screen: TextScreen | null
): SyntaxHighlight {
  const labels = useLabels().viewer;
  const openWorker = use(SyntaxWorkerContext);
  const language = plan.kind === 'highlight' && openWorker !== null ? plan.language : null;
  const [styles, setStyles] = useState<readonly SyntaxStyle[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [rows, setRows] = useState<ReadonlyMap<number, RowHighlight>>(new Map());

  const port = useRef<SyntaxPort | null>(null);
  const cache = useRef(new Map<number, RowHighlight>());
  const sent = useRef<TextChunk | null>(null);
  const asking = useRef(false);
  const latest = useRef<{ screen: TextScreen | null; layout: TextLayout | null }>({
    screen,
    layout
  });

  /** Asks for the newest screen's rows that have no answer, and with `again`, the approximate ones too. */
  const ask = useCallback((again: boolean): void => {
    const worker = port.current;
    const { screen: shown, layout: textLayout } = latest.current;
    if (worker === null || shown === null || textLayout === null || asking.current) return;

    const wanted = shown.rows.some((row) => {
      const known = cache.current.get(row.start);
      return known === undefined || (again && !known.exact && known.plain !== 'long');
    });
    if (!wanted) return;

    if (sent.current !== shown.source) {
      const { offset, bytes, eof } = shown.source;
      const copy = bytes.slice();
      worker.postMessage({ type: 'chunk', offset, bytes: copy, eof, layout: textLayout }, [
        copy.buffer
      ]);
      sent.current = shown.source;
    }

    asking.current = true;
    worker.postMessage({
      type: 'highlight',
      rows: shown.rows.map(({ start, kind }) => ({ start, kind }))
    });
  }, []);

  useEffect(() => {
    if (language === null || openWorker === null) return;

    let worker: SyntaxPort;
    try {
      worker = openWorker();
    } catch {
      // A page that cannot start the worker shows the text plain, and says so.
      setFailed(true);
      return () => setFailed(false);
    }
    port.current = worker;
    cache.current = new Map();
    sent.current = null;
    asking.current = false;

    worker.onmessage = ({ data }) => {
      switch (data.type) {
        case 'ready':
          setStyles(data.styles);
          ask(true);
          return;
        case 'failed':
          setFailed(true);
          return;
        case 'rows': {
          const known = cache.current;
          for (const row of data.rows) {
            known.delete(row.start);
            known.set(row.start, row);
          }
          for (const start of known.keys()) {
            if (known.size <= MAX_CACHED_ROWS) break;
            known.delete(start);
          }

          asking.current = false;
          setRows(new Map(known));
          ask(false);
          return;
        }
      }
    };
    worker.onerror = () => setFailed(true);
    worker.postMessage({ type: 'open', language, maxLineBytes: HIGHLIGHT_MAX_LINE_BYTES });

    return () => {
      worker.terminate();
      port.current = null;
      setStyles(null);
      setFailed(false);
      setRows(new Map());
    };
  }, [ask, generation, language, openWorker]);

  useEffect(() => {
    latest.current = { screen, layout };
    if (styles !== null) ask(true);
  }, [ask, layout, screen, styles]);

  const tokensFor = useCallback(
    (start: number): readonly SyntaxToken[] | null => rows.get(start)?.tokens ?? null,
    [rows]
  );

  let note: HighlightNote = null;
  if (plan.kind === 'too-large') note = 'too-large';
  else if (failed) note = 'unavailable';
  else if (screen?.rows.some((row) => rows.get(row.start)?.plain === 'long')) note = 'long-lines';

  return {
    styles: styles ?? NO_STYLES,
    tokensFor,
    status:
      plan.kind === 'none' || openWorker === null
        ? null
        : highlightStatus(plan.language, note, labels)
  };
}
