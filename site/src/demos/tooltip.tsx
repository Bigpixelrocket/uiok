/**
 * Tooltips with and without a chord (drawn with the legends' key glyphs),
 * one long enough to wrap, and one that describes more than the name.
 */

import { Copy, FolderOpen, Info, Plus, Search } from 'lucide-react';

import { IconButton } from '@bigpixelrocket/uiok/button';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { describedTooltip, tooltip } from '@bigpixelrocket/uiok/tooltip';

/** The tooltip page's demo. */
export function TooltipDemo() {
  return (
    <div className="demo-stack">
      <div className="demo-row">
        <IconButton aria-label="New Tab" {...tooltip('New Tab', { key: 't', meta: true })}>
          <Plus size={ICON_MD} />
        </IconButton>
        <IconButton aria-label="Find" {...tooltip('Find', { key: 'f', meta: true })}>
          <Search size={ICON_MD} />
        </IconButton>
        <IconButton
          aria-label="Copy Path"
          {...tooltip('Copy Path', { key: 'c', meta: true, alt: true })}
        >
          <Copy size={ICON_MD} />
        </IconButton>
        <IconButton aria-label="Open" {...tooltip('Open')}>
          <FolderOpen size={ICON_MD} />
        </IconButton>
        <IconButton
          aria-label="Copy Home Path"
          {...tooltip(
            'Copies the full path of the selected file, with the home folder written as ~, so it can be pasted into a terminal on another machine with the same layout.',
            { key: 'c', meta: true, shift: true }
          )}
        >
          <Info size={ICON_MD} />
        </IconButton>
      </div>
      <p className="demo-row">
        Rest the pointer on
        <span
          className="demo-described"
          {...describedTooltip('/Users/me/projects/site/src/components/Header.tsx', {
            value: true
          })}
        >
          Header.tsx
        </span>
        to read its whole path.
      </p>
    </div>
  );
}
