/**
 * A filter field over a listing, drawn by the library's `.filter-field`; the
 * esc cap and the Escape key both clear it. The mark lights while the field
 * holds the keys or a query.
 */

import { FileText } from 'lucide-react';
import { useState } from 'react';

import { FilterEscape, FilterIcon } from '@bigpixelrocket/uiok/filter';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { Cell, column, Listing, Row } from '@bigpixelrocket/uiok/listing';
import { matchQuery } from '@bigpixelrocket/uiok/menu';
import { MarkedText } from '@bigpixelrocket/uiok/text';

import { bytes, FILES } from './data';

/** The filter page's demo. */
export function FilterDemo() {
  const [query, setQuery] = useState('ts');
  const rows = FILES.flatMap((file) => {
    const match = matchQuery(file.name, query);
    return match === null ? [] : [{ file, positions: match.positions }];
  });
  return (
    <div className="demo-stack listing-root">
      <div className="pane demo-pane">
        <label className="filter-field">
          <FilterIcon />
          <input
            aria-label="Filter files"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            placeholder="Filter"
            spellCheck={false}
            value={query}
          />
          {query === '' ? null : (
            <FilterEscape label="Clear filter" onEscape={() => setQuery('')} />
          )}
        </label>
        <div className="pane-list demo-scroll short">
          <Listing
            columns={[{ label: 'Kind' }, { label: 'Size', align: 'right' }]}
            empty={rows.length === 0 ? `Nothing matches “${query}”.` : null}
            grid={`20px minmax(0, 1fr) ${column(10)} ${column(9)}`}
            title="Name"
          >
            {rows.map(({ file, positions }) => (
              <Row
                key={file.id}
                mark={<FileText size={ICON_MD} />}
                name={<MarkedText positions={positions} text={file.name} />}
                rowKey={file.id}
              >
                <Cell>{file.kind}</Cell>
                <Cell align="right">{bytes(file.size)}</Cell>
              </Row>
            ))}
          </Listing>
        </div>
      </div>
    </div>
  );
}
