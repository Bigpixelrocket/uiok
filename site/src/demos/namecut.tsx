/**
 * Lines that keep a long name's end in view as their box narrows: a name in
 * a sentence, a name that opens its line, and a right-to-left name, cut
 * from its own start's other end.
 */

import { useState } from 'react';

import { labelParts, NameCut, nameParts } from '@bigpixelrocket/uiok/namecut';

/** The name cut page's demo. */
export function NameCutDemo() {
  const [width, setWidth] = useState(420);
  return (
    <div className="demo-stack">
      <label className="demo-row">
        <span className="demo-label">Width</span>
        <input
          max={720}
          min={80}
          onChange={(event) => setWidth(Number(event.target.value))}
          type="range"
          value={width}
        />
        <code className="demo-readout">{width}px</code>
      </label>
      <div className="namecut-box" style={{ width }}>
        <NameCut
          parts={labelParts(
            'Copying "Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv" to "Seedbox"'
          )}
        />
      </div>
      <div className="namecut-box" style={{ width }}>
        <NameCut
          parts={nameParts([
            '"',
            { name: 'quarterly-report-final-v3-reviewed.xlsx' },
            '" already exists'
          ])}
        />
      </div>
      <div className="namecut-box" style={{ width }}>
        <NameCut
          parts={labelParts('Copying "סיכום-פגישת-הצוות-השבועית-הסופי.docx" to "Seedbox"')}
        />
      </div>
    </div>
  );
}
