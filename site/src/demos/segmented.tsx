/**
 * One choice of several, with the arrow keys moving the choice, at each
 * control height beside a button of the same height; segments with an icon
 * beside their words; and a choice that cannot be taken now.
 */

import { Columns3, LayoutGrid, List } from 'lucide-react';
import { useId, useState, type CSSProperties } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { SegmentedChoice } from '@bigpixelrocket/uiok/segmented';

const VIEWS = ['list', 'grid', 'columns'] as const;
const VIEW_WORDS: Readonly<Record<(typeof VIEWS)[number], string>> = {
  list: 'List',
  grid: 'Grid',
  columns: 'Columns'
};
const VIEW_ICONS = { list: List, grid: LayoutGrid, columns: Columns3 } as const;
const SIZES = ['s', 'm', 'l', 'xl'] as const;

/** A row that sets the segmented choice's height, as a form of regular controls does. */
const REGULAR = { '--segmented-height': 'var(--control-height)' } as CSSProperties;
const DENSE = { '--segmented-height': 'var(--control-height-xs)' } as CSSProperties;

/** The segmented choice page's demo. */
export function SegmentedDemo() {
  const viewLabel = useId();
  const regularLabel = useId();
  const sizeLabel = useId();
  const iconLabel = useId();
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
        <Button size="small">Apply</Button>
      </div>
      <div className="demo-row" style={REGULAR}>
        <span className="demo-label" id={regularLabel}>
          Regular
        </span>
        <SegmentedChoice
          choices={VIEWS}
          labelId={regularLabel}
          onChange={setView}
          render={(choice) => VIEW_WORDS[choice]}
          value={view}
        />
        <Button>Apply</Button>
      </div>
      <div className="demo-row">
        <span className="demo-label" id={iconLabel}>
          Icons
        </span>
        <SegmentedChoice
          choices={VIEWS}
          labelId={iconLabel}
          onChange={setView}
          render={(choice) => {
            const Icon = VIEW_ICONS[choice];
            return (
              <>
                <Icon />
                {VIEW_WORDS[choice]}
              </>
            );
          }}
          value={view}
        />
      </div>
      <div className="demo-row" style={DENSE}>
        <span className="demo-label" id={sizeLabel}>
          Size
        </span>
        <SegmentedChoice
          choices={SIZES}
          disabledChoices={['xl']}
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
