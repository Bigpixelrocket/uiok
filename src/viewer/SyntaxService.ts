/**
 * The text view's highlighting worker and the messages it takes. The worker
 * cannot reach the viewer's reader, so the page keeps reading the file and
 * hands the worker the chunk of bytes it holds, then asks for a screen of
 * rows by their starting bytes; the worker answers with each row's tokens.
 * Grammar states never leave the worker.
 */

import { createContext } from 'react';

import type { SyntaxLanguageId } from './SyntaxLanguage.logic.js';
import {
  createSyntaxSession,
  type LineTokenizer,
  type RowHighlight,
  type SyntaxSession,
  type SyntaxStyle
} from './SyntaxSession.logic.js';
import type { TextLayout } from './TextEncoding.logic.js';
import type { RowStart } from './TextRows.logic.js';

/** What the page asks of the worker. */
type SyntaxRequest =
  /** Load the grammar and theme; answered with `ready` or `failed`. */
  | {
      readonly type: 'open';
      readonly language: SyntaxLanguageId;
      readonly maxLineBytes: number;
    }
  /** The bytes the page holds now, replacing the last chunk. */
  | {
      readonly type: 'chunk';
      readonly offset: number;
      readonly bytes: Uint8Array;
      readonly eof: boolean;
      readonly layout: TextLayout;
    }
  /** Highlight these rows of the last chunk; answered with `rows`. */
  | { readonly type: 'highlight'; readonly rows: readonly RowStart[] };

/** What the worker answers. */
type SyntaxResponse =
  | { readonly type: 'ready'; readonly styles: readonly SyntaxStyle[] }
  | { readonly type: 'failed' }
  | { readonly type: 'rows'; readonly rows: readonly RowHighlight[] };

/** The page's end of the worker. */
export interface SyntaxPort {
  readonly postMessage: (message: SyntaxRequest, transfer?: Transferable[]) => void;
  onmessage: ((event: MessageEvent<SyntaxResponse>) => void) | null;
  onerror: ((event: Event) => void) | null;
  readonly terminate: () => void;
}

/** The worker's end: where requests arrive and answers go. */
export interface SyntaxScope {
  readonly postMessage: (message: SyntaxResponse) => void;
  onmessage: ((event: MessageEvent<SyntaxRequest>) => void) | null;
}

/** Starts a highlighting worker; one per text view and file generation. */
export type SyntaxWorkerFactory = () => SyntaxPort;

/**
 * Starts the viewer's own highlighting worker: Shiki on its JavaScript
 * regex engine, loaded from the module beside this one, so a bundler emits
 * the worker and each grammar as chunks of their own that load only when a
 * text file in a known language opens.
 */
export const openSyntaxWorker: SyntaxWorkerFactory = () =>
  new Worker(new URL('./SyntaxWorker.js', import.meta.url), {
    type: 'module',
    name: 'Syntax highlighting'
  }) as SyntaxPort;

/**
 * The worker factory the text view starts highlighting with; null turns
 * highlighting off. `ViewerWindow` provides it from its `syntaxWorker` prop.
 */
export const SyntaxWorkerContext = createContext<SyntaxWorkerFactory | null>(openSyntaxWorker);

/**
 * Answers the page's requests in `scope`, tokenizing with what `load`
 * returns for the language `open` names. Requests other than `open` wait
 * for the page to have seen `ready`, so none arrive before a session exists.
 */
export function serveSyntax<State>(
  scope: SyntaxScope,
  load: (language: SyntaxLanguageId) => Promise<LineTokenizer<State>>
): void {
  let session: SyntaxSession | null = null;

  scope.onmessage = ({ data }) => {
    switch (data.type) {
      case 'open':
        load(data.language).then(
          (tokenizer) => {
            session = createSyntaxSession(tokenizer, data.maxLineBytes);
            scope.postMessage({ type: 'ready', styles: tokenizer.styles });
          },
          () => scope.postMessage({ type: 'failed' })
        );
        return;
      case 'chunk':
        session?.setChunk({ offset: data.offset, bytes: data.bytes, eof: data.eof }, data.layout);
        return;
      case 'highlight':
        if (session !== null)
          scope.postMessage({ type: 'rows', rows: session.highlight(data.rows) });
        return;
    }
  };
}
