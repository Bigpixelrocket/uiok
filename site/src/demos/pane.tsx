/**
 * A sidebar of servers beside a pane of services, on the two-pane keyboard
 * (`usePaneKeys`): ↑ ↓ Home End move the active pane's cursor, ← and →
 * switch panes, Return opens a server or a service's logs, ⌘⏎ starts or
 * stops the cursor's service. The legend under it reads what the cursor
 * row offers. Click into the demo to give it the keys; they return to the
 * page when the focus leaves it. Under it, path bars with a fact in each
 * tone, at full width and in a 300px pane, where the trail gives way and
 * the fact cuts its words with the whole fact as a tooltip.
 */

import {
  Copy,
  FileText,
  Folder,
  Play,
  RefreshCw,
  RotateCw,
  Server,
  Square,
  Star,
  Trash2
} from 'lucide-react';
import { useState } from 'react';

import { ICON_MD, ICON_SM } from '@bigpixelrocket/uiok/icon';
import { KeyLegendStrip, type LegendVerb } from '@bigpixelrocket/uiok/legend';
import {
  ACTION_COLUMN,
  Cell,
  column,
  CurrentDot,
  iconLinksColumn,
  linksColumn,
  Listing,
  Row,
  RowCursorContext,
  StateMark
} from '@bigpixelrocket/uiok/listing';
import {
  NO_MAIN_VERBS,
  PanePathBar,
  PaneStatus,
  PathFact,
  paneKeyAction,
  paneRow,
  QuietAction,
  RowIconAction,
  RowLinkLookContext,
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

/**
 * Three path bars, each with a fact: a danger fact beside a star and a lit
 * action, a warning fact beside a refresh, and a plain one. `narrow` sets
 * them in 300px panes.
 */
function PathFacts({
  narrow = false,
  say
}: {
  readonly narrow?: boolean;
  readonly say: (what: string) => void;
}) {
  const [starred, setStarred] = useState(false);
  const pane = narrow ? 'pane demo-pane demo-facts-narrow' : 'pane demo-pane';
  return (
    <div className="listing-root demo-facts">
      <section className={`${pane} active`}>
        <PanePathBar
          here={<CurrentDot label="Open project" />}
          trail={[
            { label: 'Projects', onOpen: () => say('went to Projects'), tip: 'Go to Projects' },
            { label: 'site', onOpen: () => say('went to site') },
            'web'
          ]}
        >
          <PathFact mark={<StateMark tone="danger" word="" />} tone="danger">
            Stopped: port 5173 in use
          </PathFact>
          <button
            aria-label={starred ? 'Remove from favourites' : 'Add to favourites'}
            aria-pressed={starred}
            className="path-star"
            onClick={() => setStarred(!starred)}
            type="button"
          >
            <Star aria-hidden fill={starred ? 'currentColor' : 'none'} size={ICON_SM} />
          </button>
          <QuietAction
            icon={Play}
            label="Start web"
            lit
            onClick={() => say('started web')}
            word="Start"
          />
        </PanePathBar>
      </section>
      <section className={pane}>
        <PanePathBar
          trail={[{ label: 'Servers', onOpen: () => say('went to Servers') }, 'staging']}
        >
          <PathFact mark={<StateMark tone="warning" word="" />} tone="warning">
            2 changes not applied
          </PathFact>
          <button
            aria-label="Refresh staging"
            className="path-star"
            onClick={() => say('refreshed staging')}
            type="button"
          >
            <RefreshCw aria-hidden size={ICON_SM} />
          </button>
        </PanePathBar>
      </section>
      <section className={pane}>
        {/* A glyph in the root crumb's slot (`mark`). */}
        <PanePathBar mark={<Folder aria-hidden size={ICON_SM} />} trail={['Folders']}>
          <PathFact mark={<StateMark tone="ready" word="" />}>Synced</PathFact>
        </PanePathBar>
      </section>
    </div>
  );
}

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
        // A press on a part that takes no focus (a path bar, the status line) would move the
        // focus out to the page and take the keys with it; it keeps them in the active pane.
        onMouseDown={(event) => {
          const root = event.currentTarget;
          const target = event.target instanceof Element ? event.target : null;
          const focusable = target?.closest(
            'button, input, select, textarea, summary, a[href], [tabindex]'
          );
          if (focusable != null && root.contains(focusable)) return;
          event.preventDefault();
          if (!root.contains(document.activeElement)) panes.focusPane(panes.activePane);
        }}
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
          <PanePathBar trail={['Servers']}>
            <button
              aria-label="Refresh servers"
              className="path-star"
              onClick={() => setSaid('refreshed the servers')}
              type="button"
            >
              <RefreshCw aria-hidden size={ICON_SM} />
            </button>
          </PanePathBar>
          <div aria-label="Servers" className="pane-list" data-pane-home="sidebar" tabIndex={-1}>
            <RowCursorContext value={panes.sidebarCursor}>
              <Listing columns={[]} grid="var(--icon-column) minmax(0, 1fr)" title="Name">
                {SERVER_KEYS.map((key) => (
                  <Row
                    className={key === open ? 'pane-open-row' : undefined}
                    key={key}
                    mark={<Server size={ICON_MD} />}
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
            here={<CurrentDot label="Open server" />}
            trail={[{ label: 'Servers', onOpen: () => panes.focusPane('sidebar') }, open]}
          >
            <QuietAction
              icon={Play}
              label={`Start every service on ${open}`}
              lit
              onClick={() =>
                setServices((current) => ({
                  ...current,
                  [open]: (current[open] ?? []).map((service) => ({ ...service, running: true }))
                }))
              }
              pageVerb="start-all"
              word="Start all"
            />
          </PanePathBar>
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
                  { label: 'Action', hidden: true },
                  { label: 'Restart', hidden: true },
                  { label: 'Remove', hidden: true }
                ]}
                grid={`var(--icon-column) minmax(10ch, 1fr) ${column(10)} ${column(6)} ${column(7)} ${ACTION_COLUMN} ${linksColumn('both', '', ['Restart'])} ${iconLinksColumn(1, 0)}`}
                title="Service"
              >
                {rows.map((service) => (
                  <Row
                    key={service.id}
                    mark={<FileText size={ICON_MD} />}
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
                    <Cell className="pane-action-cell">
                      {/* A row link that names its verb, drawn with its word. */}
                      <RowLinkLookContext value="both">
                        <RowIconAction
                          icon={RotateCw}
                          label={`Restart ${service.name}`}
                          onClick={() => setSaid(`restarted ${service.name} on ${open}`)}
                          softDisabled={!service.running}
                          word="Restart"
                        />
                      </RowLinkLookContext>
                    </Cell>
                    <Cell className="pane-hover-cell">
                      <RowIconAction
                        danger
                        icon={Trash2}
                        label={`Remove ${service.name}`}
                        onClick={() => setSaid(`removed ${service.name} (not really)`)}
                      />
                    </Cell>
                  </Row>
                ))}
              </Listing>
            </RowCursorContext>
          </div>
          <PaneStatus
            tools={
              <RowIconAction
                icon={Copy}
                label={`Copy the address of ${open}`}
                onClick={() => setSaid(`copied the address of ${open}`)}
              />
            }
          >
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

      <h3 className="demo-subhead">Path facts</h3>
      <PathFacts say={setSaid} />
      <PathFacts narrow say={setSaid} />
    </div>
  );
}
