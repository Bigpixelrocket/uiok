/** A pager over 1,240 rows, fifty to a page, in each of its looks. */

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
    </div>
  );
}
