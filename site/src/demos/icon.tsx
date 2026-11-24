/**
 * The four icon sizes: the three that sit beside text, each with the text
 * size it belongs with, and the glyph alone over an empty state or a
 * failure; then the Spinner at each text size; then ToneIcon in each tone
 * after the words it stands beside; then ProductMark, each
 * product's brand mark from the demo's own data, and a fallback glyph.
 * Every icon keeps lucide's default stroke, which the largest holds at 2px
 * on screen.
 */

import { CircleArrowUp, CircleCheck, CircleX, Database, FolderOpen, Sparkles } from 'lucide-react';

import {
  ICON_LG,
  ICON_MD,
  ICON_SM,
  ICON_XL,
  ProductMark,
  Spinner,
  ToneIcon,
  type IconTone
} from '@bigpixelrocket/uiok/icon';

import { DemoState, DemoStates } from '../DemoStates';
import { DEMO_MARKS } from './marks';

const SIZES = [
  { name: 'ICON_SM', size: ICON_SM, text: 'var(--font-size-small)' },
  { name: 'ICON_MD', size: ICON_MD, text: 'var(--font-size-body)' },
  { name: 'ICON_LG', size: ICON_LG, text: 'var(--font-size-heading)' }
] as const;

/** One glyph per tone, after the words it says something more about. */
const TONES: readonly {
  readonly tone: IconTone;
  readonly icon: typeof CircleArrowUp;
  readonly words: string;
  readonly label: string;
}[] = [
  { tone: 'accent', icon: Sparkles, words: '3.13.9', label: 'Offered' },
  { tone: 'ready', icon: CircleCheck, words: '24.11.0', label: 'Up to date' },
  { tone: 'warning', icon: CircleArrowUp, words: '8.4.12', label: 'Update available' },
  { tone: 'danger', icon: CircleX, words: '1.3.2', label: 'Install failed' }
];

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
        <DemoState label={`ICON_XL, ${ICON_XL}px, an About mark`}>
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
      <DemoStates minCell="160px" title="ToneIcon">
        {TONES.map(({ tone, icon, words, label }) => (
          <DemoState key={tone} label={tone}>
            <span className="demo-row">
              {words}
              <ToneIcon icon={icon} label={label} tone={tone} />
            </span>
          </DemoState>
        ))}
      </DemoStates>
      <DemoStates minCell="140px" title="ProductMark">
        {Object.values(DEMO_MARKS).map((mark) => (
          <DemoState
            key={mark.title}
            label={mark.colour === 'currentColor' ? `${mark.title}, plain` : mark.title}
          >
            <span className="demo-row">
              <ProductMark mark={mark} />
              {mark.title}
            </span>
          </DemoState>
        ))}
        <DemoState label="No mark: the fallback glyph">
          <span className="demo-row">
            <ProductMark fallback={Database} />
            CouchDB
          </span>
        </DemoState>
      </DemoStates>
    </div>
  );
}
