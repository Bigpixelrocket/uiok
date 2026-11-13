/**
 * A key legend whose verbs run on a click; hold a modifier to light its key
 * in the dock. The site's own legend runs along the window's bottom edge.
 * The narrow strip below shows the overflow: places that do not fit are left
 * out whole, so the strip ends on a complete key and verb.
 */

import { useState, type CSSProperties } from 'react';

import { KeyLegendStrip, type LegendPair, type LegendVerb } from '@bigpixelrocket/uiok/legend';

const PAIR_LABELS: Readonly<Record<string, string>> = {
  upDown: 'Up/Down',
  previousNextPage: 'Previous/Next Page'
};
/** A strip as narrow as a phone-width window. */
const NARROW: CSSProperties = { maxWidth: 360 };

const pairLabel = (pair: LegendPair): string => PAIR_LABELS[pair] ?? pair;

/** The key legend page's demo. */
export function LegendDemo() {
  const [ran, setRan] = useState('nothing yet');
  const verb = (label: string, chord: LegendVerb['chord'], pair?: LegendPair): LegendVerb => ({
    label,
    chord,
    run: () => setRan(label),
    pair
  });
  const verbs: readonly LegendVerb[] = [
    verb('Up', { key: 'ArrowUp' }, 'upDown'),
    verb('Down', { key: 'ArrowDown' }, 'upDown'),
    verb('Previous Page', { key: 'PageUp' }, 'previousNextPage'),
    verb('Next Page', { key: 'PageDown' }, 'previousNextPage'),
    verb('Open', { key: 'Enter' }),
    verb('Copy', { key: 'c', meta: true }),
    verb('Rename', { key: 'r', meta: true, shift: true }),
    verb('Delete', { key: 'Backspace', meta: true })
  ];
  return (
    <div className="demo-stack">
      <div className="legend-frame">
        <KeyLegendStrip pairLabel={pairLabel} verbs={verbs} />
      </div>
      <div className="legend-frame" style={NARROW}>
        <KeyLegendStrip pairLabel={pairLabel} verbs={verbs} />
      </div>
      <code className="demo-readout">ran: {ran}</code>
    </div>
  );
}
