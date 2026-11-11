/**
 * Notices in each tone, in the flow and floated; a card; the overline
 * heading; a list that fades where it scrolls on, and two framed scrollers
 * whose frames stay solid while their contents fade.
 */

import type { CSSProperties } from 'react';

import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';

const LINES = Array.from({ length: 30 }, (_, index) => `line ${index + 1}`);

/** A framed scroller: the fade stays inside the frame, which never fades. */
const FRAMED: CSSProperties = {
  boxSizing: 'border-box',
  width: '220px',
  maxHeight: '200px',
  margin: 0,
  border: 'var(--line) solid var(--border-strong)',
  borderRadius: 'var(--radius-md)'
};

/** A strip pinned to the top of its scroller, which an end-only fade leaves solid. */
const STICKY: CSSProperties = {
  position: 'sticky',
  top: 0,
  padding: 'var(--space-2) var(--space-4)',
  borderBottom: 'var(--line) solid var(--border)',
  background: 'var(--surface-header)',
  color: 'var(--text-dim)'
};

/** The notices and cards page's demo. */
export function SurfaceDemo() {
  return (
    <div className="demo-stack">
      <h3 className="demo-subhead">Notices</h3>
      <div className="notice notice-danger" role="alert">
        <CircleAlert size={ICON_MD} />
        <p className="notice-text">The settings file could not be saved.</p>
        <div className="notice-actions">
          <Button size="small">Try Again</Button>
        </div>
      </div>
      <div className="notice notice-warning" role="status">
        <TriangleAlert size={ICON_MD} />
        <p className="notice-text">
          The server did not answer in 30 seconds; the list may be out of date.
        </p>
      </div>
      <div className="notice notice-success" role="status">
        <CircleCheck size={ICON_MD} />
        <p className="notice-text">Exported 1,240 rows.</p>
      </div>
      <div className="notice" role="status">
        <Info size={ICON_MD} />
        <p className="notice-text">Changes apply to new windows.</p>
      </div>
      <div className="notice notice-card notice-warning" role="status">
        <TriangleAlert size={ICON_MD} />
        <p className="notice-text">settings.json has a mistake on line 12.</p>
        <div className="notice-actions">
          <Button size="small">Show</Button>
        </div>
      </div>

      <h3 className="demo-subhead">Card and overline</h3>
      <div className="card">
        <h4 className="overline">Updates</h4>
        <p>Version 2.4.1 is ready to install.</p>
      </div>

      <h3 className="demo-subhead">Scroll fade</h3>
      <ul className="demo-scroll short scroll-fade">
        {LINES.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <h3 className="demo-subhead">Scroll fade in a frame</h3>
      <div className="demo-row" style={{ alignItems: 'flex-start' }}>
        <ul className="demo-scroll scroll-fade" style={FRAMED}>
          {LINES.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div className="demo-scroll scroll-fade-end" style={{ ...FRAMED, padding: 0 }}>
          <div style={STICKY}>Sticky header, end fade only</div>
          <ul style={{ margin: 0, padding: 'var(--space-4) var(--space-12)' }}>
            {LINES.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
