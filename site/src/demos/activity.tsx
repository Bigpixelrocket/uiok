/**
 * A determinate bar under a slider, and the stripes of work with no
 * fraction, moving and standing still. Each bar draws its own track and fill.
 */

import { useState } from 'react';

import { ActivityBar } from '@bigpixelrocket/uiok/activity';
import { Button } from '@bigpixelrocket/uiok/button';

/** The activity page's demo. */
export function ActivityDemo() {
  const [percent, setPercent] = useState(40);
  const [moving, setMoving] = useState(true);
  return (
    <div className="demo-stack">
      <label className="demo-row">
        <span className="demo-label">Done</span>
        <input
          max={100}
          min={0}
          onChange={(event) => setPercent(Number(event.target.value))}
          type="range"
          value={percent}
        />
        <code className="demo-readout">{percent}%</code>
      </label>
      <ActivityBar fraction={percent / 100} label="Uploading 3 files" moving />
      <div className="demo-row">
        <span className="demo-label">No fraction</span>
        <Button onClick={() => setMoving((value) => !value)} size="small">
          {moving ? 'Pause' : 'Resume'}
        </Button>
        <code className="demo-readout">{moving ? 'moving' : 'standing still'}</code>
      </div>
      <ActivityBar fraction={null} label="Indexing" moving={moving} />
    </div>
  );
}
