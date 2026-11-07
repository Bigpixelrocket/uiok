/** Tooltips with and without a chord, and one that describes more than the name. */

import { Copy, FolderOpen, Plus, Search } from 'lucide-react';

import { IconButton } from '@bigpixelrocket/uiok/button';
import { chordGlyphs } from '@bigpixelrocket/uiok/keyboard';
import { describedTooltip, tooltip } from '@bigpixelrocket/uiok/tooltip';

/** The tooltip page's demo. */
export function TooltipDemo() {
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <IconButton
          aria-label="New Tab"
          {...tooltip('New Tab', chordGlyphs({ key: 't', meta: true }))}
        >
          <Plus size={14} />
        </IconButton>
        <IconButton aria-label="Find" {...tooltip('Find', chordGlyphs({ key: 'f', meta: true }))}>
          <Search size={14} />
        </IconButton>
        <IconButton
          aria-label="Copy Path"
          {...tooltip('Copy Path', chordGlyphs({ key: 'c', meta: true, alt: true }))}
        >
          <Copy size={14} />
        </IconButton>
        <IconButton aria-label="Open" {...tooltip('Open')}>
          <FolderOpen size={14} />
        </IconButton>
      </div>
      <p className="demo-row">
        Rest the pointer on
        <span
          className="demo-described"
          {...describedTooltip('/Users/me/projects/site/src/components/Header.tsx')}
        >
          Header.tsx
        </span>
        to read its whole path.
      </p>
    </div>
  );
}
