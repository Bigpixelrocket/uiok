/** Paths with the characters a fuzzy query hit tinted in place. */

import { useState } from 'react';

import { matchQuery } from '@bigpixelrocket/uiok/menu';
import { MarkedText } from '@bigpixelrocket/uiok/text';

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
          className="demo-input"
          onChange={(event) => setQuery(event.target.value)}
          spellCheck={false}
          value={query}
        />
      </label>
      <ul className="marked-list">
        {rows.map((row) => (
          <li key={row.id}>
            <MarkedText positions={row.positions} text={row.name} />
            <span className="demo-readout">{row.score}</span>
          </li>
        ))}
        {rows.length === 0 ? <li className="demo-readout">nothing matches</li> : null}
      </ul>
    </div>
  );
}
