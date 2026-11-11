/**
 * The four icon sizes: the three that sit beside text, each with the text
 * size it belongs with, and the glyph alone over an empty state or a
 * failure; then the Spinner at each text size. Every icon keeps lucide's
 * default stroke, which the largest holds at 2px on screen.
 */

import { FolderOpen } from 'lucide-react';

import { ICON_LG, ICON_MD, ICON_SM, ICON_XL, Spinner } from '@bigpixelrocket/uiok/icon';

import { DemoState, DemoStates } from '../DemoStates';

const SIZES = [
  { name: 'ICON_SM', size: ICON_SM, text: 'var(--font-size-small)' },
  { name: 'ICON_MD', size: ICON_MD, text: 'var(--font-size-body)' },
  { name: 'ICON_LG', size: ICON_LG, text: 'var(--font-size-heading)' }
] as const;

/** The icon page's demo. */
export function IconDemo() {
  return (
    <div className="demo-stack">
      <DemoStates minCell="160px" title="Sizes">
        {SIZES.map(({ name, size, text }) => (
          <DemoState key={name} label={`${name}, ${size}px`}>
            <span
              style={{
                alignItems: 'center',
                display: 'inline-flex',
                fontSize: text,
                gap: 'var(--space-3)'
              }}
            >
              <FolderOpen aria-hidden="true" size={size} />
              Projects
            </span>
          </DemoState>
        ))}
        <DemoState label={`ICON_XL, ${ICON_XL}px, over a failure`}>
          <FolderOpen absoluteStrokeWidth aria-hidden="true" size={ICON_XL} />
        </DemoState>
      </DemoStates>
      <DemoStates minCell="160px" title="Spinner">
        {SIZES.map(({ name, size, text }) => (
          <DemoState key={name} label={`${name}, ${size}px`}>
            <span
              style={{
                alignItems: 'center',
                color: 'var(--text-dim)',
                display: 'inline-flex',
                fontSize: text,
                gap: 'var(--space-3)'
              }}
            >
              <Spinner size={size} />
              Saving
            </span>
          </DemoState>
        ))}
      </DemoStates>
    </div>
  );
}
