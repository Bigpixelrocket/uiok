/**
 * Paths with the characters a fuzzy query hit tinted in place. Under them,
 * the same marks on listing rows in a narrow pane: on a plain row, on the
 * cursor row, on a selected row (where the wash is `--selection-hit`), and
 * in a name cut short, where the ellipsis replaces a whole mark. Last,
 * commands and paths inside a sentence as inline code, one long enough to
 * wrap.
 */

import { FileText } from 'lucide-react';
import { useState } from 'react';

import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { Listing, Row, RowCursorContext } from '@bigpixelrocket/uiok/listing';
import { matchQuery } from '@bigpixelrocket/uiok/menu';
import { Code, MarkedText } from '@bigpixelrocket/uiok/text';

import { useDemoCursor } from './cursor';
import { FILES } from './data';

/** The text page's demo. */
export function TextDemo() {
  const [query, setQuery] = useState('src tsx');
  const rows = FILES.flatMap((file) => {
    const name = file.path.replace('~/projects/site/', '');
    const match = matchQuery(name, query);
    return match === null ? [] : [{ id: file.id, name, ...match }];
  }).sort((a, b) => b.score - a.score);
  return (
    <div className="demo-stack listing-root">
      <label className="demo-row">
        <span className="demo-label">Query</span>
        <input
          className="field demo-input"
          onChange={(event) => setQuery(event.target.value)}
          spellCheck={false}
          value={query}
        />
      </label>
      <ul className="marked-list">
        {rows.map((row) => (
          <li key={row.id}>
            {/* MarkedText returns loose runs and marks; one box keeps them a single line. */}
            <span>
              <MarkedText positions={row.positions} text={row.name} />
            </span>
            <span className="demo-readout">{row.score}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="demo-readout">nothing matches</li> : null}
      </ul>
      <h3 className="demo-subhead">On listing rows</h3>
      <MarkedRows rows={rows.slice(0, 5)} />
      <h3 className="demo-subhead">Inline code</h3>
      <p>
        Installing adds the tap <Code>shivammathur/php</Code>, then runs{' '}
        <Code>brew install shivammathur/php/php@8.4</Code>. Its settings are in{' '}
        <Code>/opt/homebrew/etc/php/8.4/conf.d/ext-opcache-and-the-other-extensions.ini</Code>,
        which wraps where the line ends.
      </p>
    </div>
  );
}

/**
 * The first matches as rows of a narrow listing: the cursor on the first
 * (the arrows move it), the second selected, and long names cut short.
 */
function MarkedRows({
  rows
}: {
  readonly rows: readonly {
    readonly id: string;
    readonly name: string;
    readonly positions: readonly number[];
  }[];
}) {
  const { cursor, onKeyDown } = useDemoCursor(rows.map((row) => row.id));
  return (
    <div className="pane demo-pane demo-marked-pane">
      <div
        aria-label="Matches: arrows move"
        className="pane-list"
        onKeyDown={onKeyDown}
        tabIndex={0}
      >
        <RowCursorContext value={cursor}>
          <Listing
            columns={[]}
            empty={rows.length === 0 ? 'No match' : null}
            grid="var(--icon-column) minmax(0, 1fr)"
            title="Match"
          >
            {rows.map((row, index) => (
              <Row
                className={index === 1 ? 'selected' : undefined}
                key={row.id}
                mark={<FileText size={ICON_MD} />}
                name={<MarkedText positions={row.positions} text={row.name} />}
                rowKey={row.id}
              />
            ))}
          </Listing>
        </RowCursorContext>
      </div>
    </div>
  );
}
