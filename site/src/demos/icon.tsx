/**
 * The three icon sizes, each beside the text size it belongs with, and the
 * Spinner at each size. Every icon keeps lucide's default stroke.
 */

import { FolderOpen } from 'lucide-react';

import { ICON_LG, ICON_MD, ICON_SM, Spinner } from '@bigpixelrocket/uiok/icon';

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
