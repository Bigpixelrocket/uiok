/**
 * A sidebar of servers beside a pane of services, on the two-pane keyboard
 * (`usePaneKeys`): ↑ ↓ Home End move the active pane's cursor, ← and →
 * switch panes, Return opens a server or a service's logs, ⌘⏎ starts or
 * stops the cursor's service. The legend under it reads what the cursor
 * row offers. Click into the demo to give it the keys; they return to the
 * page when the focus leaves it.
 */

import { FileText, Play, Server, Square } from 'lucide-react';
import { useState } from 'react';

import { KeyLegendStrip, type LegendVerb } from '@bigpixelrocket/uiok/legend';
import {
  ACTION_COLUMN,
  Cell,
  column,
  Listing,
  Row,
  RowCursorContext,
  StateMark
} from '@bigpixelrocket/uiok/listing';
import {
  NO_MAIN_VERBS,
  PanePathBar,
  PaneStatus,
  paneKeyAction,
  paneRow,
  QuietAction,
  usePaneKeys,
  verbControl,
  type MainVerbs,
  type Pane,
  type PaneKeyAction
} from '@bigpixelrocket/uiok/pane';

type Action = PaneKeyAction | { readonly kind: 'focus'; readonly pane: Pane };

interface Service {
  readonly id: string;
  readonly name: string;
  readonly port: number;
  readonly running: boolean;
}

const SERVERS: Readonly<Record<string, readonly Service[]>> = {
  local: [
    { id: 'web', name: 'web', port: 5173, running: true },
    { id: 'api', name: 'api', port: 8080, running: true },
    { id: 'db', name: 'postgres', port: 5432, running: true },
    { id: 'cache', name: 'redis', port: 6379, running: false },
    { id: 'mail', name: 'mailpit', port: 8025, running: false }
  ],
  staging: [
    { id: 'web', name: 'web', port: 443, running: true },
    { id: 'api', name: 'api', port: 8443, running: true },
    { id: 'worker', name: 'worker', port: 9000, running: false }
  ],
  production: [
    { id: 'web', name: 'web', port: 443, running: true },
    { id: 'api', name: 'api', port: 8443, running: true },
    { id: 'db', name: 'postgres', port: 5432, running: true },
    { id: 'worker', name: 'worker', port: 9000, running: true }
  ]
};
const SERVER_KEYS = Object.keys(SERVERS);

const readVerbs = (main: Element | null, cursor: string | null): MainVerbs => {
  const row = paneRow(main, cursor);
  return {
    ...NO_MAIN_VERBS,
    rows: row !== null,
    enter: verbControl(row, 'enter')?.dataset.word ?? null,
    toggle: verbControl(row, 'toggle')?.dataset.word ?? null
  };
};

const readKey = (event: KeyboardEvent): Action | null => {
  const plain = !event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey;
  if (plain && event.key === 'ArrowLeft') return { kind: 'focus', pane: 'sidebar' };
  if (plain && event.key === 'ArrowRight') return { kind: 'focus', pane: 'main' };
  const action = paneKeyAction(event);
  // Tab keeps its native walk, so the keys can always leave the demo.
  return action !== null && ['move', 'enter', 'toggle'].includes(action.kind) ? action : null;
};

/** The pane page's demo. */
export function PaneDemo() {
  const [open, setOpen] = useState('local');
  const [shown, setShown] = useState(false);
  const [services, setServices] = useState(SERVERS);
  const [said, setSaid] = useState('');
  const rows = services[open] ?? [];

  const toggle = (id: string) =>
    setServices((current) => ({
      ...current,
      [open]: (current[open] ?? []).map((service) =>
        service.id === id ? { ...service, running: !service.running } : service
      )
    }));

  const panes = usePaneKeys<Action, MainVerbs>({
    shown,
    loaded: true,
    initialPane: 'main',
    page: open,
    sidebarKeys: SERVER_KEYS,
    openKey: open,
    readVerbs,
    noVerbs: NO_MAIN_VERBS,
    follows: [rows],
    readKey,
    cursorKey: (action) => action.kind === 'move' || action.kind === 'enter',
    run: (action, pane) => {
      if (action.kind === 'focus') panes.focusPane(action.pane);
      if (action.kind === 'move') panes.move(action.to, pane);
      if (action.kind === 'enter' && pane === 'sidebar') {
        const key = panes.sidebarCursor.current();
        if (key !== null) setOpen(key);
        panes.focusPane('main');
      }
      if ((action.kind === 'enter' || action.kind === 'toggle') && pane === 'main') {
        verbControl(
          paneRow(panes.mainRef.current, panes.rowCursor.current()),
          action.kind
        )?.click();
      }
    }
  });

  const running = rows.filter((service) => service.running).length;
  const legend: LegendVerb[] = [
    {
      label: 'Up',
      chord: { key: 'ArrowUp' },
      run: () => panes.move('up', panes.activePane),
      pair: 'upDown'
    },
    {
      label: 'Down',
      chord: { key: 'ArrowDown' },
      run: () => panes.move('down', panes.activePane),
      pair: 'upDown'
    },
    {
      label: 'Sidebar',
      chord: { key: 'ArrowLeft' },
      run: () => panes.focusPane('sidebar'),
      pair: 'panes'
    },
    {
      label: 'Services',
      chord: { key: 'ArrowRight' },
      run: () => panes.focusPane('main'),
      pair: 'panes'
    }
  ];
  const cursorRow = () => paneRow(panes.mainRef.current, panes.rowCursor.current());
  if (panes.activePane === 'main' && panes.offered.enter !== null) {
    legend.push({
      label: panes.offered.enter,
      chord: { key: 'Enter' },
      run: () => verbControl(cursorRow(), 'enter')?.click()
    });
  }
  if (panes.activePane === 'main' && panes.offered.toggle !== null) {
    legend.push({
      label: panes.offered.toggle,
      chord: { key: 'Enter', meta: true },
      run: () => verbControl(cursorRow(), 'toggle')?.click()
    });
  }

  return (
    <div className="demo-stack">
      <div
        className="listing-root pane-demo"
        onFocus={() => setShown(true)}
        onPointerDown={() => setShown(true)}
        // The demo holds the keys only while the focus is in it, so the page scrolls again after.
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setShown(false);
        }}
        ref={panes.rootRef}
      >
        <aside
          className={
            panes.activePane === 'sidebar'
              ? 'pane pane-demo-sidebar active'
              : 'pane pane-demo-sidebar'
          }
          onFocus={panes.activateSidebar}
          onPointerLeave={panes.leaveSidebar}
        >
          <PanePathBar trail={['Servers']} />
          <div aria-label="Servers" className="pane-list" data-pane-home="sidebar" tabIndex={-1}>
            <RowCursorContext value={panes.sidebarCursor}>
              <Listing columns={[]} grid="20px minmax(0, 1fr)" title="Name">
                {SERVER_KEYS.map((key) => (
                  <Row
                    key={key}
                    mark={<Server size={14} />}
                    name={key}
                    onOpen={() => {
                      setOpen(key);
                      panes.restSidebar();
                    }}
                    rowKey={key}
                  />
                ))}
              </Listing>
            </RowCursorContext>
          </div>
        </aside>
        <div
          className={panes.activePane === 'main' ? 'pane active' : 'pane'}
          onFocus={panes.activateMain}
          ref={panes.mainRef}
        >
          <PanePathBar
            heading
            trail={[{ label: 'Servers', onOpen: () => panes.focusPane('sidebar') }, open]}
          />
          <div
            aria-label={`Services on ${open}`}
            className="pane-list"
            data-pane-home
            tabIndex={-1}
          >
            <RowCursorContext value={panes.rowCursor}>
              <Listing
                columns={[
                  { label: 'State' },
                  { label: 'Port', align: 'right' },
                  { label: 'Logs', hidden: true },
                  { label: 'Action', hidden: true }
                ]}
                grid={`20px minmax(0, 1fr) ${column(10)} ${column(6)} ${column(7)} ${ACTION_COLUMN}`}
                title="Service"
              >
                {rows.map((service) => (
                  <Row
                    key={service.id}
                    mark={<FileText size={14} />}
                    name={service.name}
                    rowKey={service.id}
                  >
                    <Cell>
                      <StateMark
                        tone={service.running ? 'ready' : 'muted'}
                        word={service.running ? 'running' : 'stopped'}
                      />
                    </Cell>
                    <Cell align="right">{service.port}</Cell>
                    <Cell className="pane-action-cell">
                      <QuietAction
                        icon={FileText}
                        label={`Logs of ${service.name}`}
                        onClick={() => setSaid(`opened the logs of ${service.name} on ${open}`)}
                        verb="enter"
                        word="Logs"
                      />
                    </Cell>
                    <Cell className="pane-action-cell">
                      <QuietAction
                        icon={service.running ? Square : Play}
                        label={`${service.running ? 'Stop' : 'Start'} ${service.name}`}
                        onClick={() => toggle(service.id)}
                        verb="toggle"
                        word={service.running ? 'Stop' : 'Start'}
                      />
                    </Cell>
                  </Row>
                ))}
              </Listing>
            </RowCursorContext>
          </div>
          <PaneStatus>
            {rows.length} services, {running} running
          </PaneStatus>
        </div>
      </div>
      <div className="legend-frame">
        <KeyLegendStrip
          pairLabel={(pair) => (pair === 'upDown' ? 'Up/Down' : 'Sidebar/Services')}
          verbs={legend}
        />
      </div>
      <code className="demo-readout">
        {said === '' ? 'click into the panes, then use the keys' : said}
      </code>
    </div>
  );
}
