/**
 * What the viewer reads its one file through, and what the reads return.
 * The viewer never holds a path: every call acts on the file its reader is
 * bound to, so an app can hand it a bridge that resolves the file from the
 * calling window, a fetch over a server, or an in-memory buffer alike. The
 * shapes are plain data, so an app's own schema-checked types fit them as
 * long as they carry these fields.
 */

/**
 * What a file holds, as far as the viewer cares: the view it opens in.
 * `image`, `svg`, `audio`, `video`, and `pdf` are formats a browser shows
 * natively; `text` was sniffed as text; `binary` is everything else, shown
 * in hex.
 */
export type ViewerContentKind = 'text' | 'binary' | 'image' | 'svg' | 'audio' | 'video' | 'pdf';

/**
 * The detected content: its kind and the media type it was detected as
 * (`image/png`, `text/plain`), which a media view hands to the browser and
 * the frame names in its facts ("PNG image").
 */
export interface ViewerContentType {
  readonly kind: ViewerContentKind;
  readonly mimeType: string;
}

/**
 * How the file at its source differs from the one the viewer opened:
 * `none`; `modified` (same file, new size or date); `replaced` (the source
 * now names a different file, as an atomic save leaves it); `removed`
 * (nothing is there). The viewer keeps showing what it opened in every case,
 * and offers Reload unless the file was removed.
 */
export type ViewerFileChange = 'none' | 'modified' | 'replaced' | 'removed';

/**
 * Where a file came from when the viewer shows a copy of it: the container
 * that holds it (an archive, a server), by name, and the file's place there
 * (`src/report.txt`, `/var/log/app.log`). The frame names the container and
 * says, on hover, that the window shows a read-only copy.
 */
export interface ViewerFileOrigin {
  readonly archiveName: string;
  readonly entryPath: string;
}

/**
 * One inspection of the viewer's file. `generation` counts the reloads that
 * reopened it (0 as first opened), so a read in flight across a reload can
 * be told from one of the new file; `sizeBytes` and `modifiedMs` describe
 * the open file; `content` is the kind detected when this generation opened;
 * `change` compares the source with the open file; `mediaUrl` is where a
 * native view (image, audio, video, PDF) has the browser load the file from,
 * good for this generation only; `origin` is set only for a copy.
 */
export interface ViewerFileInfo {
  readonly generation: number;
  readonly name: string;
  readonly sizeBytes: number;
  readonly modifiedMs: number;
  readonly content: ViewerContentType;
  readonly change: ViewerFileChange;
  readonly mediaUrl: string;
  readonly origin?: ViewerFileOrigin | undefined;
}

/**
 * Largest byte range one read asks for: a screenful of text or hex with
 * plenty to spare. A reader may refuse anything larger.
 */
export const VIEWER_MAX_READ_BYTES = 1024 * 1024;

/** A byte range to read: `length` bytes from `offset`, at least 1 and at most `VIEWER_MAX_READ_BYTES`. */
export interface ViewerReadRangeRequest {
  readonly offset: number;
  readonly length: number;
}

/**
 * The bytes a read found at `offset`: fewer than asked for, or none, when
 * the range runs past the end. `endOfFile` is true when the range reaches
 * the file's current end; `generation` names the file the bytes came from,
 * so the viewer drops a read that a reload overtook.
 */
export interface ViewerByteRange {
  readonly generation: number;
  readonly offset: number;
  readonly bytes: Uint8Array;
  readonly endOfFile: boolean;
}

/**
 * The text encodings the text view decodes: UTF-8 with or without its byte
 * order mark, UTF-16 in either byte order (only with its mark), and Latin-1
 * for a file that is not valid UTF-8.
 */
export type ViewerTextEncoding = 'utf-8' | 'utf-16le' | 'utf-16be' | 'latin-1';

/** Asks for the number of the line holding byte `offset`, counting line breaks as `encoding` spells them. */
export interface ViewerLineNumberRequest {
  readonly offset: number;
  readonly encoding: ViewerTextEncoding;
}

/**
 * The 1-based number of the line holding byte `offset` of the file
 * `generation` names; null when the reader gave up on this ask (a newer ask
 * replaced it, or the count stopped).
 */
export interface ViewerLineNumber {
  readonly generation: number;
  readonly offset: number;
  readonly line: number | null;
}

/** Why a read failed, in finished copy the viewer shows as it is. */
export interface ViewerReadFailure {
  readonly message: string;
}

/**
 * A reader call's outcome: the value, or why there is none. A promise that
 * rejects instead is shown as the `noAnswer` label, so a reader need not
 * catch its own transport failures.
 */
export type ViewerResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: ViewerReadFailure };

/**
 * How the viewer reaches its one file. The app supplies it; the viewer asks
 * nothing else of the app. Every method acts on the same file.
 */
export interface ViewerReader {
  /** Size, date, and detected kind of the open file, and how its source has changed since. */
  readonly inspect: () => Promise<ViewerResult<ViewerFileInfo>>;
  /** One bounded byte range of the open file; a range past the end returns what exists. */
  readonly readRange: (request: ViewerReadRangeRequest) => Promise<ViewerResult<ViewerByteRange>>;
  /**
   * Reopens the file from its source, so a changed file shows as it is now.
   * A reload that fails keeps the file the viewer had.
   */
  readonly reload: () => Promise<ViewerResult<ViewerFileInfo>>;
  /**
   * The line holding a byte. Until it answers, the text view shows byte
   * offsets in its gutter; a reader that cannot count lines answers with a
   * null line and the gutter keeps offsets.
   */
  readonly lineNumber: (
    request: ViewerLineNumberRequest
  ) => Promise<ViewerResult<ViewerLineNumber>>;
}

/**
 * Runs a reader call and guarantees the promise resolves: a result passes
 * through, and a rejection or a synchronous throw becomes a failure saying
 * `noAnswer`.
 */
export async function settleRead<T>(
  noAnswer: string,
  call: () => Promise<ViewerResult<T>>
): Promise<ViewerResult<T>> {
  try {
    return await call();
  } catch {
    return { ok: false, error: { message: noAnswer } };
  }
}
