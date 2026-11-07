/**
 * Web links in terminal text: finding `http(s)` URLs in a line and joining
 * soft-wrapped rows back into the logical line a URL may span.
 */

/** A URL found in a line, as UTF-16 offsets into it. */
export interface TerminalLinkMatch {
  readonly text: string;
  readonly start: number;
  readonly end: number;
}

/** The view of a terminal row link detection needs. */
export interface TerminalBufferLineLike {
  /** Whether this row continues the previous one after a soft wrap. */
  readonly isWrapped?: boolean;
  translateToString(trimRight?: boolean): string;
}

/** One row's slice of a wrapped logical line. */
interface WrappedTerminalLinkLineSegment {
  readonly bufferLineNumber: number;
  readonly text: string;
  readonly startIndex: number;
  readonly endIndex: number;
}

/** A logical line rebuilt from its soft-wrapped rows. */
export interface WrappedTerminalLinkLine {
  readonly text: string;
  readonly segments: ReadonlyArray<WrappedTerminalLinkLineSegment>;
}

const URL_PATTERN = /https?:\/\/[^\s"'`<>]+/giu;
const TRAILING_PUNCTUATION_PATTERN = /[.,;!?]+$/;

function trimClosingDelimiters(value: string): string {
  let output = value.replace(TRAILING_PUNCTUATION_PATTERN, '');
  if (output.length === 0) return output;

  const trimUnbalanced = (open: string, close: string) => {
    while (output.endsWith(close)) {
      const opens = output.split(open).length - 1;
      const closes = output.split(close).length - 1;
      if (opens >= closes) return;
      output = output.slice(0, -1);
    }
  };

  trimUnbalanced('(', ')');
  trimUnbalanced('[', ']');
  trimUnbalanced('{', '}');
  return output;
}

/** Every `http(s)` URL in a line, without trailing punctuation or unbalanced closing brackets. */
export function extractTerminalLinks(line: string): TerminalLinkMatch[] {
  const matches: TerminalLinkMatch[] = [];
  for (const rawMatch of line.matchAll(URL_PATTERN)) {
    const start = rawMatch.index;
    const trimmed = trimClosingDelimiters(rawMatch[0]);
    if (trimmed.length === 0) continue;
    matches.push({ text: trimmed, start, end: start + trimmed.length });
  }
  return matches;
}

/** Whether a link target is a web URL, whatever the scheme's case. */
export function isTerminalUrl(value: string): boolean {
  return /^https?:\/\//iu.test(value);
}

/**
 * Rebuilds the logical line around a 1-based row number by walking back to
 * its first row and forward through its soft-wrapped continuations; null
 * when a row it needs is unavailable.
 */
export function collectWrappedTerminalLinkLine(
  bufferLineNumber: number,
  getLine: (bufferLineIndex: number) => TerminalBufferLineLike | null | undefined
): WrappedTerminalLinkLine | null {
  const anchorLine = getLine(bufferLineNumber - 1);
  if (!anchorLine) return null;

  let startBufferLineNumber = bufferLineNumber;
  let startLine = anchorLine;

  while (startBufferLineNumber > 1 && startLine.isWrapped) {
    const previousLine = getLine(startBufferLineNumber - 2);
    if (!previousLine) return null;
    startBufferLineNumber -= 1;
    startLine = previousLine;
  }

  const segments: WrappedTerminalLinkLineSegment[] = [];
  let nextStartIndex = 0;
  let currentBufferLineNumber = startBufferLineNumber;

  while (true) {
    const currentLine = getLine(currentBufferLineNumber - 1);
    if (!currentLine) break;

    const nextLine = getLine(currentBufferLineNumber);
    const hasWrappedContinuation = nextLine?.isWrapped === true;
    const text = currentLine.translateToString(!hasWrappedContinuation);

    segments.push({
      bufferLineNumber: currentBufferLineNumber,
      text,
      startIndex: nextStartIndex,
      endIndex: nextStartIndex + text.length
    });
    nextStartIndex += text.length;

    if (!hasWrappedContinuation) break;
    currentBufferLineNumber += 1;
  }

  return {
    text: segments.map((segment) => segment.text).join(''),
    segments
  };
}
