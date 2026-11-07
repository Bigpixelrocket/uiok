/** One choice of several, with the arrow keys moving the choice. */

import { useId, useState } from 'react';

import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';

const VIEWS = ['list', 'grid', 'columns'] as const;
const VIEW_WORDS: Readonly<Record<(typeof VIEWS)[number], string>> = {
  list: 'List',
  grid: 'Grid',
  columns: 'Columns'
};
const SIZES = ['s', 'm', 'l', 'xl'] as const;

/** The segmented choice page's demo. */
export function SegmentedDemo() {
  const viewLabel = useId();
  const sizeLabel = useId();
  const [view, setView] = useState<(typeof VIEWS)[number]>('list');
  const [size, setSize] = useState<(typeof SIZES)[number]>('m');
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <span className="demo-label" id={viewLabel}>
          View
        </span>
        <SegmentedChoice
          choices={VIEWS}
          labelId={viewLabel}
          onChange={setView}
          render={(choice) => VIEW_WORDS[choice]}
          value={view}
        />
      </div>
      <div className="demo-row">
        <span className="demo-label" id={sizeLabel}>
          Size
        </span>
        <SegmentedChoice
          choices={SIZES}
          labelId={sizeLabel}
          onChange={setSize}
          render={(choice) => choice.toUpperCase()}
          value={size}
        />
      </div>
      <code className="demo-readout">
        view: {view} · size: {size}
      </code>
    </div>
  );
}
