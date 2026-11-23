/**
 * Notices in each tone (`Notice`), in the flow and as a window's status line; a card (`Card`)
 * with the overline heading, holding a value a user may select; a list that fades where it scrolls on, two framed scrollers
 * whose frames stay solid while their contents fade, and a row that fades
 * at its inline ends; then a host's own buttons joining the quiet control
 * and track item recipes, at rest, hovered, and pressed. Last, a group's
 * swatch in each hue, hollow and with no group, and a tag in each tone, in
 * capitals, and with a tip; a notice quoting a server's words in code; and
 * an overline that keeps a name's case. A fact list's long values wrap
 * whole beside their names, three lists side by side, and two set in a
 * pane's body, inset from its edge as its rows are.
 *
 * A cell that shows a pointer state carries `data-force` (with
 * `data-force-sel` naming the button inside it): the screenshot harness
 * forces that pseudo-class through the DevTools protocol. In a browser the
 * attributes do nothing and the cell shows the button at rest.
 */

import type { CSSProperties, ReactNode } from 'react';

import { Pin } from 'lucide-react';

import { Button } from '@bigpixelrocket/uiok/button';
import { ICON_MD, ICON_SM, Spinner } from '@bigpixelrocket/uiok/icon';
import { PaneBox, PaneList, PanePathBar } from '@bigpixelrocket/uiok/pane';
import {
  Card,
  Fact,
  FactColumns,
  FactList,
  FactRow,
  FactTable,
  GroupSwatch,
  Notice,
  Tag,
  type TagTone
} from '@bigpixelrocket/uiok/surface';
import type { GroupHue } from '@bigpixelrocket/uiok/themes';

import { DemoState, DemoStates } from '../DemoStates';

const HUES: readonly GroupHue[] = [
  'blue',
  'green',
  'purple',
  'orange',
  'teal',
  'pink',
  'yellow',
  'red'
];
const TONES: readonly TagTone[] = ['neutral', 'accent', 'ready', 'warning', 'danger'];

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
      <h3 className="demo-subhead">Fact table</h3>
      <FactTable label="Tools">
        <FactRow
          detail="/opt/homebrew/bin/brew"
          name="Homebrew"
          tone="ready"
          toneLabel="Found"
          value="4.6.11"
        />
        <FactRow
          detail="/opt/homebrew/bin/mise"
          name="mise"
          tone="warning"
          toneLabel="Out of date"
          value="2025.1.0"
        />
        <FactRow
          detail='~/.zshrc · eval "$(mise activate zsh)"'
          name="zsh activation"
          tone="danger"
          toneLabel="Missing"
          value="missing"
        />
        <FactRow name="fish activation" tone="muted" toneLabel="Not checked" />
      </FactTable>
      <h3 className="demo-subhead">Fact lists, side by side</h3>
      <FactColumns>
        <FactList title="Usage">
          <Fact name="CPU">0.4%</Fact>
          <Fact name="Memory">64 MB</Fact>
          <Fact name="Up">2h 35m · since 11:48</Fact>
        </FactList>
        <FactList title="Command">
          <Fact name="Runs">php artisan serve --port=8000</Fact>
          <Fact name="In">~/Developer/shop</Fact>
          <Fact name="Kind">Until stopped</Fact>
        </FactList>
        <FactList title="Dependencies">
          <Fact name="Waits for">db: healthy · running · ready</Fact>
          <Fact name="Waits for">migrate: completed successfully · once · ok 2 hours ago</Fact>
        </FactList>
        <FactList title="Crash">
          <Fact name="Exit" tone="danger">
            exited 1 · 4 minutes ago
          </Fact>
          <Fact name="Printed" printed>
            {
              'Error: listen EADDRINUSE: address already in use :::8080\n    at Server.setupListenHandle'
            }
          </Fact>
        </FactList>
      </FactColumns>
      <h3 className="demo-subhead">Fact lists in a pane</h3>
      <div className="listing-root">
        <PaneBox>
          <PanePathBar trail={['Services', 'shop']} />
          <PaneList label="shop">
            <FactColumns>
              <FactList title="Usage">
                <Fact name="CPU">0.4%</Fact>
                <Fact name="Memory">64 MB</Fact>
              </FactList>
              <FactList title="Command">
                <Fact name="Runs">php artisan serve --port=8000</Fact>
                <Fact name="In">~/Developer/shop</Fact>
              </FactList>
            </FactColumns>
          </PaneList>
        </PaneBox>
      </div>
      <h3 className="demo-subhead">Notices</h3>
      <Notice actions={<Button size="small">Try Again</Button>} role="alert" tone="danger">
        The settings file could not be saved.
      </Notice>
      <Notice tone="warning">
        The server did not answer in 30 seconds; the list may be out of date.
      </Notice>
      <Notice tone="success">Exported 1,240 rows.</Notice>
      <Notice>Changes apply to new windows.</Notice>
      <Notice glyph={<Spinner size={ICON_MD} />}>
        Checking the settings file… (<code>glyph</code>: a glyph of its own, here a spinner)
      </Notice>
      <Notice
        actions={<Button size="small">Show</Button>}
        band
        cutText="settings.json has a mistake on line 12."
        tone="warning"
      >
        settings.json has a mistake on line 12.
      </Notice>

      <h3 className="demo-subhead">Card and overline</h3>
      {/* A card groups one subject's lines under an overline. The label is
          chrome; the version is a value a user may select and copy. */}
      <Card label="Updates">
        <h4 className="overline">Updates</h4>
        <p>
          Version <span className="selectable">2.4.1 (412)</span> is ready to install.
        </p>
      </Card>

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
      <h3 className="demo-subhead">Group swatches</h3>
      <DemoStates>
        {HUES.map((hue) => (
          <DemoState key={hue} label={hue}>
            <GroupSwatch group={hue} /> <GroupSwatch group={hue} hollow />
          </DemoState>
        ))}
        <DemoState label="No group">
          <GroupSwatch group={null} label="No group" />
        </DemoState>
      </DemoStates>
      <h3 className="demo-subhead">Tags</h3>
      <DemoStates>
        {TONES.map((tone) => (
          <DemoState key={tone} label={tone}>
            <Tag tone={tone}>Production</Tag>{' '}
            <Tag caps tone={tone}>
              Beta
            </Tag>
          </DemoState>
        ))}
        <DemoState label="With a tip">
          <Tag tip="The value the server starts with">default</Tag>
        </DemoState>
      </DemoStates>
      <h3 className="demo-subhead">
        A notice quoting the server, and a heading that keeps its case
      </h3>
      <Notice role="alert" tone="danger">
        The export stopped: <code>ERROR 1205: Lock wait timeout exceeded</code>
      </Notice>
      <h4 className="overline keep-case">public.orders</h4>
    </div>
  );
}
