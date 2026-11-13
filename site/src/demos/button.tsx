/**
 * Every button tier (primary, tonal, danger, neutral) at the regular size and
 * then the small one, with one disabled button (every tier fades the same
 * way); icon buttons at both sizes, with one disabled; and buttons with an
 * icon beside their label. Icon buttons are named on hover. Then a
 * disclosure: a triangle and a label that shows or hides a section, and
 * every tier at the 20px size a row or a strip takes.
 */

import { Download, Plus, RefreshCw, Settings, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button, IconButton, type ButtonVariant } from '@bigpixelrocket/uiok/button';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { tooltip } from '@bigpixelrocket/uiok/tooltip';

const TIERS: ReadonlyArray<{ readonly variant: ButtonVariant; readonly word: string }> = [
  { variant: 'primary', word: 'Save' },
  { variant: 'tonal', word: 'Install' },
  { variant: 'danger', word: 'Delete' },
  { variant: 'neutral', word: 'Cancel' }
];

/** The button page's demo. */
export function ButtonDemo() {
  const [pressed, setPressed] = useState('nothing yet');
  const [open, setOpen] = useState(false);
  const press = (what: string) => () => setPressed(what);
  return (
    <div className="demo-stack">
      {(['regular', 'small'] as const).map((size) => (
        <div className="demo-row" key={size}>
          {TIERS.map(({ variant, word }) => (
            <Button key={variant} onClick={press(`${size} ${word}`)} size={size} variant={variant}>
              {word}
            </Button>
          ))}
          {size === 'regular' && <Button disabled>Disabled</Button>}
        </div>
      ))}
      <div className="demo-row">
        {/* The glyph takes the button's size (14px, 12px when small) whatever the icon is given. */}
        <IconButton
          aria-label="New"
          onClick={press('New')}
          {...tooltip('New', { key: 'n', meta: true })}
        >
          <Plus />
        </IconButton>
        <IconButton
          aria-label="Refresh"
          onClick={press('Refresh')}
          {...tooltip('Refresh', { key: 'r', meta: true })}
        >
          <RefreshCw />
        </IconButton>
        <IconButton aria-label="Download" disabled {...tooltip('Download')}>
          <Download />
        </IconButton>
        <IconButton
          aria-label="Settings"
          onClick={press('Settings')}
          size="small"
          {...tooltip('Settings')}
        >
          <Settings />
        </IconButton>
        <IconButton
          aria-label="Delete"
          onClick={press('Delete')}
          size="small"
          {...tooltip('Delete')}
        >
          <Trash2 />
        </IconButton>
      </div>
      <div className="demo-row">
        <Button onClick={press('Add Folder')} variant="tonal">
          <Plus size={ICON_MD} />
          Add Folder
        </Button>
        <Button onClick={press('Refresh')} size="small">
          <RefreshCw />
          Refresh
        </Button>
        <button
          aria-controls="demo-extra-options"
          aria-expanded={open}
          className="disclosure"
          onClick={() => setOpen(!open)}
          type="button"
        >
          Extra options
        </button>
      </div>
      {open ? (
        <p className="field-note" id="demo-extra-options">
          Rows per page, sort order, and the columns shown.
        </p>
      ) : null}
      {/* The 20px size a row or a strip takes, below the others so the
          rows above keep their place. */}
      <div className="demo-row">
        {TIERS.map(({ variant, word }) => (
          <Button key={variant} onClick={press(`xs ${word}`)} size="xs" variant={variant}>
            {word}
          </Button>
        ))}
      </div>
      <code className="demo-readout">pressed: {pressed}</code>
    </div>
  );
}
