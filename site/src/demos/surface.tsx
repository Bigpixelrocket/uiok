/**
 * Notices in each tone, in the flow and as a window's status line; groups
 * under the overline heading with a hairline between them, holding a value
 * a user may select; a list that fades where it scrolls on, two framed scrollers
 * whose frames stay solid while their contents fade, and a row that fades
 * at its inline ends; then a host's own buttons joining the quiet control
 * and track item recipes, at rest, hovered, and pressed.
 *
 * A cell that shows a pointer state carries `data-force` (with
 * `data-force-sel` naming the button inside it): the screenshot harness
 * forces that pseudo-class through the DevTools protocol. In a browser the
 * attributes do nothing and the cell shows the button at rest.
 */

import type { CSSProperties, ReactNode } from 'react';

import { CircleAlert, CircleCheck, Info, Pin, TriangleAlert } from 'lucide-react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ICON_MD, ICON_SM } from '@bigpixelrocket/uiok/icon';
import { cutTooltip } from '@bigpixelrocket/uiok/tooltip';

import { DemoState, DemoStates } from '../DemoStates';

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

/** Words long enough to scroll sideways in the sideways fade's row. */
const PATH = '/Users/me/projects/site/src/components/settings/sections/appearance/ThemePreview.tsx';

/** The pointer states a recipe cell shows, with the pseudo-classes each forces. */
const STATES = [
  { name: 'Rest', force: null },
  { name: 'Hover', force: 'hover' },
  { name: 'Pressed', force: 'hover active' }
] as const;

/** A state cell whose button is forced into a pseudo-class for captures. */
function Forced({
  force,
  children
}: {
  readonly force: string | null;
  readonly children: ReactNode;
}) {
  if (force === null) return children;
  // No box of its own, so a forced cell sits on the same line as a cell at rest.
  return (
    <span data-force={force} data-force-sel="button" style={{ display: 'contents' }}>
      {children}
    </span>
  );
}

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
      <div className="notice" role="status">
        <span aria-hidden className="notice-glyph spinner" />
        <p className="notice-text">
          Checking the settings file… (<code>notice-glyph</code>: a glyph that is not an svg)
        </p>
      </div>
      <div className="notice notice-card notice-warning" role="status">
        <TriangleAlert size={ICON_MD} />
        <p className="notice-text" {...cutTooltip('settings.json has a mistake on line 12.')}>
          settings.json has a mistake on line 12.
        </p>
        <div className="notice-actions">
          <Button size="small">Show</Button>
        </div>
      </div>

      <h3 className="demo-subhead">Groups and selectable text</h3>
      {/* Groups of lines under an overline, divided by a hairline, never a
          framed card. The label is chrome; the version is a value a user
          may select and copy. */}
      <div>
        <section className="settings-subsection">
          <h4 className="overline">Updates</h4>
          <p className="field-note">
            Ready to install: <span className="selectable">2.4.1 (412)</span>
          </p>
        </section>
        <section className="settings-subsection" style={{ paddingBottom: 0 }}>
          <h4 className="overline">Folder</h4>
          <code className="settings-file-path">~/.config/example-app</code>
        </section>
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

      <h3 className="demo-subhead">Scroll fade sideways</h3>
      <div className="demo-scroll-x scroll-fade-x">
        <code>{PATH}</code>
      </div>

      {/* Three columns, one row per recipe: rest, hover, pressed. */}
      <DemoStates minCell="200px" title="Joining a recipe">
        {STATES.map(({ name, force }) => (
          <DemoState key={`quiet-${name}`} label={`quiet-control, ${name.toLowerCase()}`}>
            <Forced force={force}>
              <button className="demo-host-button quiet-control" type="button">
                <Pin size={ICON_SM} />
                Pin
              </button>
            </Forced>
          </DemoState>
        ))}
        {STATES.map(({ name, force }) => (
          <DemoState key={`track-${name}`} label={`quiet-track-item, ${name.toLowerCase()}`}>
            <Forced force={force}>
              <button className="demo-host-button quiet-track-item" type="button">
                Logs
              </button>
            </Forced>
          </DemoState>
        ))}
      </DemoStates>
    </div>
  );
}
