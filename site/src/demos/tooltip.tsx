/**
 * Tooltips with and without a chord (drawn with the legends' key glyphs),
 * one with a chord written as text, one long enough to wrap, one that describes more than the name, and a
 * tool rail whose tooltips open beside each tool instead of below it.
 */

import { Copy, FolderOpen, Info, Plus, RotateCw, Search, Settings } from 'lucide-react';

import { IconButton } from '@bigpixelrocket/uiok/button';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { describedTooltip, tooltip } from '@bigpixelrocket/uiok/tooltip';

import { DemoState, DemoStates } from '../DemoStates';

/** A vertical rail of tools, as a sidebar draws one. */
const RAIL = {
  display: 'inline-flex',
  flexDirection: 'column',
  gap: 'var(--space-2)'
} as const;

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
        <IconButton aria-label="Reload" {...tooltip('Reload', '⌘R')}>
          <RotateCw size={ICON_MD} />
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
      <DemoStates minCell="320px" title="Beside a tool rail">
        <DemoState label="Each tooltip opens at the end side, clear of the next tool">
          <div aria-label="Tools" aria-orientation="vertical" role="toolbar" style={RAIL}>
            <IconButton aria-label="Projects" {...tooltip('Projects', undefined, { side: 'end' })}>
              <FolderOpen size={ICON_MD} />
            </IconButton>
            <IconButton aria-label="Search" {...tooltip('Search', undefined, { side: 'end' })}>
              <Search size={ICON_MD} />
            </IconButton>
            <IconButton aria-label="Settings" {...tooltip('Settings', undefined, { side: 'end' })}>
              <Settings size={ICON_MD} />
            </IconButton>
          </div>
        </DemoState>
      </DemoStates>
    </div>
  );
}
