import {
  useLayoutEffect,
  useRef,
  type CSSProperties,
  type ReactElement,
  type ReactNode
} from 'react';

import { logSourceColour, logSourceIndexes, logSourceWidth } from './LogWell.logic.js';

/** One line of a log. */
export interface LogLine {
  /** Names the line among the log's; its place in the list where lines only ever append. */
  readonly key: string | number;
  /** What wrote it (a process's name, `queue.2`); none for a line of the log's own. */
  readonly source?: string | null;
  /** The line's words, as written. */
  readonly text: ReactNode;
  /** A line the host marks: a failure (`danger`), a warning, or one of the log's own quiet notes (`dim`). */
  readonly tone?: 'danger' | 'warning' | 'dim';
}

/** Props for {@link LogWell}. */
export interface LogWellProps {
  readonly lines: readonly LogLine[];
  /** The log's accessible name ("Combined log"). */
  readonly label: string;
  /** The sources in the order their colours go, so each keeps its colour; any other takes the next in turn. */
  readonly sources?: readonly string[];
  /** Keeps the newest line in view while the reader is at the foot; a reader scrolled up stays put. */
  readonly follow?: boolean;
  /** The words shown while the log has no line. */
  readonly empty?: string;
}

/** How near the foot, in pixels, still counts as reading the newest line. */
const FOOT_SLACK = 8;

/**
 * A log in a well: each line in the code face, its source first in a
 * column as wide as the longest source and in that source's own colour
 * (`--log-source-*`, legible as text), a bar, then the words; a line the
 * host marks takes its tone. The words can be selected and copied. With
 * `follow`, a new line scrolls into view while the reader is at the foot.
 * It is a `log` region, so a screen reader hears new lines without being
 * moved; it takes the focus so the keys scroll it.
 */
export function LogWell({
  lines,
  label,
  sources = [],
  follow = true,
  empty
}: LogWellProps): ReactElement {
  const well = useRef<HTMLDivElement>(null);
  const atFoot = useRef(true);
  const names = lines.map((line) => line.source);
  const indexes = logSourceIndexes(names, sources);
  const width = logSourceWidth(names);
  const last = lines.at(-1)?.key;

  useLayoutEffect(() => {
    const element = well.current;

    if (follow && atFoot.current && element) {
      element.scrollTop = element.scrollHeight;
    }
  }, [follow, last, lines.length]);

  return (
    <div
      aria-label={label}
      className="log-well selectable"
      onScroll={(event) => {
        const element = event.currentTarget;

        atFoot.current =
          element.scrollHeight - element.scrollTop - element.clientHeight <= FOOT_SLACK;
      }}
      ref={well}
      role="log"
      style={{ '--log-source-width': `${width}ch` } as CSSProperties}
      tabIndex={0}
    >
      {lines.length === 0 && empty !== undefined ? <p className="log-empty">{empty}</p> : null}
      {lines.map((line) => {
        const source = line.source ?? null;
        const index = source === null ? undefined : indexes.get(source);

        return (
          <div className="log-line" data-tone={line.tone} key={line.key}>
            {width > 0 ? (
              <span
                className="log-source"
                style={
                  index === undefined
                    ? undefined
                    : ({ '--log-source': logSourceColour(index) } as CSSProperties)
                }
              >
                {source}
              </span>
            ) : null}
            {width > 0 ? (
              <span aria-hidden className="log-bar">
                |
              </span>
            ) : null}
            <span className="log-text">{line.text}</span>
          </div>
        );
      })}
    </div>
  );
}
