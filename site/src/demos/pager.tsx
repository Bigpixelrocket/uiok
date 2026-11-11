/**
 * A pager over 1,240 rows, fifty to a page, in each of its looks; then the
 * edges: the last page, and a list whose end is not known yet.
 */

import { useState } from 'react';

import { pageCount, pageSlice, Pager } from '@bigpixelrocket/uiok/pager';

const ROWS = Array.from({ length: 1240 }, (_, index) => `row ${index + 1}`);
const SIZE = 50;

/** The pager page's demo. */
export function PagerDemo() {
  const [page, setPage] = useState(0);
  const pages = pageCount(ROWS.length, SIZE);
  const shown = pageSlice(ROWS, page, SIZE);
  return (
    <div className="demo-stack">
      <Pager kind="rows" onPage={setPage} page={page} pages={pages} />
      <Pager kind="rows" look="text" onPage={setPage} page={page} pages={pages} />
      <Pager kind="rows" look="both" onPage={setPage} page={page} pages={pages} />
      <code className="demo-readout">
        showing {shown[0]} to {shown.at(-1)} of {ROWS.length}
      </code>
      <h3 className="demo-subhead">Edges</h3>
      <div className="demo-row">
        <span className="demo-label">Last page</span>
        <Pager kind="rows" look="both" onPage={() => undefined} page={pages - 1} pages={pages} />
      </div>
      <div className="demo-row">
        <span className="demo-label">End unknown</span>
        <Pager
          endKnown={false}
          kind="rows"
          look="both"
          onPage={() => undefined}
          page={3}
          pages={8}
        />
      </div>
      <div className="demo-row">
        <span className="demo-label">Stopped</span>
        <Pager forward={false} kind="rows" onPage={() => undefined} page={3} pages={8} />
      </div>
    </div>
  );
}
