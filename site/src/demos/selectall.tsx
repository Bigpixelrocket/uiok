/** A checked list with a select-all footer; Shift-click checks a range. */

import { useState } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { checkedAfterClick, SelectAllBar } from '@bigpixelrocket/uiok/selectall';

import { FILES } from './data';

const SHOWN = FILES.slice(0, 8);
const IDS = SHOWN.map((file) => file.id);

/** The select-all page's demo. */
export function SelectAllDemo() {
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set(['f1', 'f2']));
  const [anchor, setAnchor] = useState<string | null>(null);
  const [said, setSaid] = useState('');
  return (
    <div className="demo-stack">
      <ul className="check-list">
        {SHOWN.map((file) => (
          <li key={file.id}>
            <label>
              <input
                checked={checked.has(file.id)}
                onChange={() => undefined}
                onClick={(event) => {
                  setChecked(checkedAfterClick(checked, IDS, anchor, file.id, event.shiftKey));
                  setAnchor(file.id);
                }}
                type="checkbox"
              />
              <span>{file.name}</span>
            </label>
          </li>
        ))}
      </ul>
      <SelectAllBar
        checked={checked.size}
        onCheckAll={(on) => setChecked(on ? new Set(IDS) : new Set())}
        total={IDS.length}
      >
        <Button
          disabled={checked.size === 0}
          onClick={() => setSaid(`Archived ${checked.size}`)}
          size="small"
        >
          Archive
        </Button>
        <Button
          disabled={checked.size === 0}
          onClick={() => setSaid(`Deleted ${checked.size}`)}
          size="small"
        >
          Delete
        </Button>
      </SelectAllBar>
      {said === '' ? null : <code className="demo-readout">{said}</code>}
    </div>
  );
}
