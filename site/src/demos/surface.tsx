/**
 * Notices in each tone, in the flow and floated; a card; the overline
 * heading; and a list that fades where it scrolls on.
 */

import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';

const LINES = Array.from({ length: 30 }, (_, index) => `line ${index + 1}`);

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
    </div>
  );
}
