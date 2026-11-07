/** Every button variant and size, and icon buttons named on hover. */

import { Download, Plus, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button, IconButton } from '@bigpixelrocket/uiok/button';
import { chordGlyphs } from '@bigpixelrocket/uiok/keyboard';
import { tooltip } from '@bigpixelrocket/uiok/tooltip';

/** The button page's demo. */
export function ButtonDemo() {
  const [pressed, setPressed] = useState('nothing yet');
  const press = (what: string) => () => setPressed(what);
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <Button onClick={press('Save')} variant="primary">
          Save
        </Button>
        <Button onClick={press('Install')} variant="tonal">
          Install
        </Button>
        <Button onClick={press('Cancel')}>Cancel</Button>
        <Button disabled variant="primary">
          Disabled
        </Button>
      </div>
      <div className="demo-row">
        <Button onClick={press('small Save')} size="small" variant="primary">
          Save
        </Button>
        <Button onClick={press('small Install')} size="small" variant="tonal">
          Install
        </Button>
        <Button onClick={press('small Delete')} size="small">
          Delete
        </Button>
      </div>
      <div className="demo-row">
        <IconButton
          aria-label="New"
          onClick={press('New')}
          {...tooltip('New', chordGlyphs({ key: 'n', meta: true }))}
        >
          <Plus size={14} />
        </IconButton>
        <IconButton
          aria-label="Refresh"
          onClick={press('Refresh')}
          {...tooltip('Refresh', chordGlyphs({ key: 'r', meta: true }))}
        >
          <RefreshCw size={14} />
        </IconButton>
        <IconButton aria-label="Download" onClick={press('Download')} {...tooltip('Download')}>
          <Download size={14} />
        </IconButton>
        <IconButton
          aria-label="Settings"
          onClick={press('Settings')}
          size="small"
          {...tooltip('Settings')}
        >
          <Settings size={12} />
        </IconButton>
        <IconButton aria-label="Delete" disabled size="small" {...tooltip('Delete')}>
          <Trash2 size={12} />
        </IconButton>
      </div>
      <code className="demo-readout">pressed: {pressed}</code>
    </div>
  );
}
