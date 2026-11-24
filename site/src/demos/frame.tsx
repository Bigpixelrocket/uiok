/**
 * A small window in the frame, drawn from components alone (no class, no
 * style, no element of the demo's own inside the window): the title bar
 * with a lockup, its brand mark, and a local build's channel marker; a
 * sidebar tree with its quick row of filters (one line that scrolls
 * sideways under an edge fade when the sidebar is too narrow for them all,
 * a mouse wheel over it scrolling it sideways), a band with an amber update
 * arrow (`ToneIcon`), a group, rows
 * stepped in by level with a state and a switch, a service's own menu on a
 * secondary click (or the Menu key, Shift-F10, on the tree, which a button
 * under the window focuses), a note, the edge that
 * resizes it, and a Hide/Show panel toggle; a main pane whose page holds a
 * list over the pane under it with the splitter between them, and a status
 * notice in its status line; a console docked under it at the height it
 * keeps, its log scrolling; the key legend across the foot. Under the
 * window, `SideBySide` in a pane the slider narrows: Settings and
 * Extensions side by side from 520px of the pane's own width, stacked in
 * less or once their toolbars no longer fit the halves, the page's one
 * cursor walking the first listing, then the second; then `FilterChips`
 * with `wrap` in a listing row's cell the slider narrows, the row growing
 * to hold its lines.
 */

import {
  ArrowUp,
  CircleAlert,
  CircleArrowUp,
  Database,
  Layers,
  PanelLeft,
  Play,
  Server,
  RotateCw,
  Settings2,
  Square,
  Trash2
} from 'lucide-react';
import { useRef, useState, type CSSProperties } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import { Range, Select, Switch } from '@bigpixelrocket/uiok/field';
import {
  Dock,
  DockLog,
  DockLogEntry,
  FilterChips,
  PageNote,
  PanePage,
  PaneSplitter,
  SectionHead,
  ShowSidebarButton,
  SideBySide,
  SidebarResizer,
  SplitDetail,
  StatusNotice,
  Toolbar,
  TreeList,
  TreePane,
  TreeRow,
  TreeTool,
  usePaneSplit,
  WindowFrame
} from '@bigpixelrocket/uiok/frame';
import { ICON_MD, ToneIcon } from '@bigpixelrocket/uiok/icon';
import { KeyLegendStrip, type LegendVerb } from '@bigpixelrocket/uiok/legend';
import {
  Cell,
  Listing,
  Row,
  RowCursorContext,
  StateMark,
  column
} from '@bigpixelrocket/uiok/listing';
import { Menu, type MenuEntry } from '@bigpixelrocket/uiok/menu';
import { PaneBox, PaneList, PanePathBar, PaneStatus } from '@bigpixelrocket/uiok/pane';
import { BrandMark, ChannelMarker, Lockup, TitleBar } from '@bigpixelrocket/uiok/shell';

import { useDemoCursor } from './cursor';

const SERVICES = [
  { name: 'PostgreSQL 18', state: 'running', tone: 'ready', port: '5432' },
  { name: 'MySQL 8.4', state: 'error', tone: 'danger', port: '3306' },
  { name: 'Redis', state: 'running', tone: 'ready', port: '6379' },
  { name: 'Meilisearch', state: 'stopped', tone: 'muted', port: '7700' }
] as const;

const LINES = ['18.1', '17.7', '16.11', '15.15', '14.20', '13.23', '12.22', '11.22'];

/** The frame page's demo. */
/** The two listings `SideBySide` lays out, each row with its value. */
const SETTINGS: readonly (readonly [string, string])[] = [
  ['Memory limit', '256M'],
  ['Upload size', '64M'],
  ['Time limit', '30 s']
];
const EXTENSIONS: readonly (readonly [string, string])[] = [
  ['intl', 'on'],
  ['redis', 'on'],
  ['xdebug', 'off']
];

/**
 * A pane the slider narrows, holding two listings in `SideBySide`: side by
 * side from 520px of the pane's own width, stacked in less. With the
 * toolbars shown, tools that keep their size stack the pair at a wider
 * room than the floor, since each half must hold its part; so does a row
 * of chips on one line, counted at its whole width, and a pop-up button
 * that a half would cut. The page's one
 * cursor walks the first listing's rows, then the second's.
 */
function SideBySideDemo() {
  const [width, setWidth] = useState(640);
  const [tools, setTools] = useState(false);
  const [chips, setChips] = useState(false);
  const [popUp, setPopUp] = useState(false);
  const [zone, setZone] = useState<string>(ZONES[0]);
  const [modes, setModes] = useState<readonly string[]>(['develop']);
  const keys = [
    ...(chips ? ['Modes'] : []),
    ...(popUp ? ['Timezone'] : []),
    ...[...SETTINGS, ...EXTENSIONS].map(([name]) => name)
  ];
  const { cursor, onKeyDown } = useDemoCursor(keys);
  const listing = (
    title: string,
    rows: readonly (readonly [string, string])[],
    actions: readonly string[]
  ) => (
    <>
      {tools ? (
        <Toolbar>
          {actions.map((action) => (
            <Button key={action} size="small">
              {action}
            </Button>
          ))}
        </Toolbar>
      ) : null}
      <Listing columns={[{ label: 'Value', align: 'right' }]} grid="20px 1fr auto" title={title}>
        {chips && title === 'Settings' ? (
          // One line of chips that scrolls: counted whole, so it stacks the pair.
          <Row name="Modes" rowKey="Modes">
            <Cell>
              <FilterChips
                chips={MODE_CHIPS}
                label="Modes"
                on={modes}
                onToggle={(id) =>
                  setModes((now) =>
                    now.includes(id) ? now.filter((each) => each !== id) : [...now, id]
                  )
                }
              />
            </Cell>
          </Row>
        ) : null}
        {popUp && title === 'Settings' ? (
          // A pop-up button as wide as its longest item: the pair stacks
          // where a half would cut its end.
          <Row name="Timezone" rowKey="Timezone">
            <Cell>
              <Select
                aria-label="Timezone"
                onChange={setZone}
                options={ZONES.map((each) => ({ value: each, label: each }))}
                size="sm"
                value={zone}
              />
            </Cell>
          </Row>
        ) : null}
        {rows.map(([name, value]) => (
          <Row key={name} name={name} rowKey={name}>
            <Cell align="right">{value}</Cell>
          </Row>
        ))}
      </Listing>
    </>
  );
  return (
    <div className="demo-stack">
      <Range
        label="Pane width"
        max={800}
        min={320}
        onChange={setWidth}
        step={10}
        value={width}
        valueText={`${width}px`}
      />
      <Switch checked={tools} label="Toolbars that keep their size" onChange={setTools} />
      <Switch checked={chips} label="A row of chips on one line" onChange={setChips} />
      <Switch checked={popUp} label="A long pop-up button" onChange={setPopUp} />
      <div
        className="listing-root"
        style={{ width: `${width}px`, maxWidth: '100%' } as CSSProperties}
      >
        <PaneBox label="Configuration">
          <PaneList
            home
            label="Configuration: arrows move the cursor through both listings"
            onKeyDown={onKeyDown}
          >
            <RowCursorContext value={cursor}>
              <SideBySide
                first={listing('Settings', SETTINGS, [
                  'Edit',
                  'Reset to defaults',
                  'Open php.ini',
                  'Reload'
                ])}
                firstLabel="Settings"
                from={520}
                second={listing('Extensions', EXTENSIONS, [
                  'Install',
                  'Enable',
                  'Disable',
                  'Configure'
                ])}
                secondLabel="Extensions"
              />
            </RowCursorContext>
          </PaneList>
        </PaneBox>
      </div>
    </div>
  );
}

/** The timezones the side-by-side demo's pop-up button offers, the first its widest. */
const ZONES = ['America/Argentina/ComodRivadavia', 'Europe/Berlin', 'Asia/Tokyo'] as const;

/** The modes the one-line `FilterChips` in the side-by-side demo offers. */
const MODE_CHIPS = ['develop', 'debug', 'coverage', 'profile', 'trace'].map((id) => ({
  id,
  label: id
}));

/** The choices the wrapping `FilterChips` offers. */
const EXTENSION_CHIPS = ['intl', 'redis', 'xdebug', 'imagick', 'pcov', 'swoole', 'mongodb'].map(
  (id) => ({ id, label: id })
);

/**
 * `FilterChips` with `wrap` as a multi-choice control in a listing row's
 * cell the slider narrows: the chips go on to further lines rather than
 * scrolling, and the row grows to hold them, so the row under it stays
 * clear. The same chips stand on the cursor row, a marked row, and a
 * selection, each keeping its words and its on look legible.
 */
function WrappingChipsDemo() {
  const [width, setWidth] = useState(420);
  const [on, setOn] = useState<readonly string[]>(['intl', 'redis']);
  const [modes, setModes] = useState<readonly string[]>(['develop']);
  const { cursor } = useDemoCursor(['extensions', 'modes', 'profiles', 'start']);
  const toggle = (set: typeof setOn) => (id: string) =>
    set((now) => (now.includes(id) ? now.filter((each) => each !== id) : [...now, id]));

  return (
    <div className="demo-stack">
      <Range
        label="Pane width"
        max={640}
        min={260}
        onChange={setWidth}
        step={10}
        value={width}
        valueText={`${width}px`}
      />
      <div
        className="listing-root"
        style={{ width: `${width}px`, maxWidth: '100%' } as CSSProperties}
      >
        <PaneBox label="Extensions">
          <PaneList label="Extensions">
            <RowCursorContext value={cursor}>
              <Listing columns={[{ label: 'Value' }]} grid="20px auto 1fr" title="Xdebug">
                <Row name="Extensions" rowKey="extensions">
                  <Cell>
                    <FilterChips
                      chips={EXTENSION_CHIPS}
                      label="Extensions"
                      on={on}
                      onToggle={toggle(setOn)}
                      wrap
                    />
                  </Cell>
                </Row>
                {/* Chips on a marked row and on a selection keep their words and their on look. */}
                <Row marked name="Modes" rowKey="modes">
                  <Cell>
                    <FilterChips
                      chips={MODE_CHIPS}
                      label="Modes"
                      on={modes}
                      onToggle={toggle(setModes)}
                      wrap
                    />
                  </Cell>
                </Row>
                <Row name="Profiles" rowKey="profiles" selected>
                  <Cell>
                    <FilterChips
                      chips={MODE_CHIPS}
                      label="Profiles"
                      on={modes}
                      onToggle={toggle(setModes)}
                      wrap
                    />
                  </Cell>
                </Row>
                <Row name="Start" rowKey="start">
                  <Cell>on request</Cell>
                </Row>
              </Listing>
            </RowCursorContext>
          </PaneList>
        </PaneBox>
      </div>
    </div>
  );
}

/** The frame page's demo: the window, two listings side by side, then chips that wrap. */
export function FrameDemo() {
  return (
    <div className="demo-stack">
      <FrameWindowDemo />
      <SideBySideDemo />
      <WrappingChipsDemo />
    </div>
  );
}

/** A small window in the frame, drawn from components alone. */
function FrameWindowDemo() {
  const [width, setWidth] = useState(260);
  const [shown, setShown] = useState(true);
  const [open, setOpen] = useState(true);
  const [on, setOn] = useState<readonly string[]>([]);
  const [running, setRunning] = useState<readonly string[]>(['PostgreSQL 18', 'Redis']);
  const split = usePaneSplit('frame-demo', null);
  const [dockHeight, setDockHeight] = useState(96);
  const verbs: readonly LegendVerb[] = [
    { label: 'Open', chord: { key: 'Enter' }, run: () => undefined },
    { label: 'Start', chord: { key: 'Enter', meta: true }, run: () => undefined },
    { label: 'Switch Pane', chord: { key: 'Tab' }, run: () => undefined }
  ];
  const services = on.includes('running')
    ? SERVICES.filter((service) => running.includes(service.name))
    : SERVICES;
  const treeKeys = [
    'mac',
    'services',
    ...(open ? [...services.map((service) => service.name), 'add-service'] : [])
  ];
  const tree = useDemoCursor(treeKeys);
  // The service whose menu is open, and where; a row's secondary click or
  // the tree's Menu key opens it.
  const [menu, setMenu] = useState<{ name: string; x: number; y: number } | null>(null);
  const [said, setSaid] = useState('');
  // The tree's home takes the focus by script only, so the keys reach it
  // through the button under the window.
  const treeList = useRef<HTMLDivElement>(null);
  const menuEntries = (name: string): readonly MenuEntry[] => [
    running.includes(name)
      ? { id: 'stop', label: 'Stop', icon: Square }
      : { id: 'start', label: 'Start', icon: Play },
    { id: 'restart', label: 'Restart', icon: RotateCw, disabled: !running.includes(name) },
    { kind: 'separator' },
    { id: 'remove', label: 'Remove', icon: Trash2, danger: true }
  ];
  const pick = (name: string, id: string) => {
    if (id === 'start' || id === 'stop') {
      setRunning((now) => (id === 'start' ? [...now, name] : now.filter((each) => each !== name)));
    }
    setSaid(`${id} ${name}`);
  };

  return (
    <>
      <div className="frame-demo" data-channel="local">
        <WindowFrame
          brand={
            <TitleBar trafficLights>
              <Lockup
                lead="Acme"
                mark={
                  <BrandMark
                    glyph={[
                      {
                        d: 'M5 7.5l5-2.5 5 2.5-5 2.5z M5 10.5l5 2.5 5-2.5 M5 13.5l5 2.5 5-2.5',
                        look: 'line'
                      }
                    ]}
                  />
                }
                size="title"
                strong="OK"
              />
              <ChannelMarker
                detail="feat/frame"
                label="Local"
                title="Local build from feat/frame"
              />
            </TitleBar>
          }
          dock={
            <Dock
              bar="Console"
              height={dockHeight}
              label="Console"
              onResize={setDockHeight}
              onResizeEnd={setDockHeight}
              open
              pageMin={120}
              resizeLabel="Resize the console"
            >
              <DockLog label="Activity">
                {Array.from({ length: 40 }, (_, index) => (
                  <DockLogEntry key={index}>{`Started worker ${index + 1}`}</DockLogEntry>
                ))}
              </DockLog>
            </Dock>
          }
          legend={<KeyLegendStrip pairLabel={(pair) => pair} verbs={verbs} />}
          main={
            <PaneBox active>
              <PanePathBar trail={['Services', 'PostgreSQL 18']}>
                {shown ? null : (
                  <ShowSidebarButton
                    icon={PanelLeft}
                    label="Show panel"
                    onShow={() => setShown(true)}
                  />
                )}
              </PanePathBar>
              <PanePage>
                <PaneList home ref={split.upper}>
                  <SectionHead>Lines</SectionHead>
                  <Listing
                    columns={[{ label: 'Version' }]}
                    grid={`var(--icon-column) minmax(0, 1fr) ${column(10)}`}
                    title="Line"
                  >
                    {LINES.map((line) => (
                      <Row key={line} name={line.split('.')[0]} rowKey={line}>
                        <Cell>{line}</Cell>
                      </Row>
                    ))}
                  </Listing>
                </PaneList>
                <PaneSplitter split={split} />
                <SplitDetail label="Selected line" split={split}>
                  <PageNote icon={CircleAlert}>MySQL 8.4 stopped with an error.</PageNote>
                  <PageNote busy>Reading PostgreSQL 18’s databases…</PageNote>
                </SplitDetail>
              </PanePage>
              <PaneStatus
                tools={
                  <Button onClick={() => setShown(false)} size="small">
                    Hide panel
                  </Button>
                }
              >
                <StatusNotice
                  icon={CircleAlert}
                  text="MySQL 8.4 could not start: the port is in use."
                  tone="danger"
                />
              </PaneStatus>
            </PaneBox>
          }
          resizer={
            <SidebarResizer
              label="Resize the sidebar"
              max={360}
              min={160}
              onResize={setWidth}
              onResizeEnd={setWidth}
              pageMin={240}
              width={width}
            />
          }
          sidebar={
            shown ? (
              <TreePane width={width}>
                <PanePathBar trail={['Stack']} />
                <FilterChips
                  chips={[
                    { id: 'running', label: 'Running', icon: Play, count: running.length },
                    { id: 'updates', label: 'Updates', icon: ArrowUp, count: 1 },
                    { id: 'errors', label: 'Errors', icon: CircleAlert, count: 1 },
                    { id: 'databases', label: 'Databases', icon: Database, count: 2 }
                  ]}
                  label="Filters"
                  on={on}
                  onToggle={(id) =>
                    setOn((now) =>
                      now.includes(id) ? now.filter((each) => each !== id) : [...now, id]
                    )
                  }
                />
                <RowCursorContext value={tree.cursor}>
                  <TreeList label="Stack" onKeyDown={tree.onKeyDown} ref={treeList}>
                    <TreeRow
                      glyph={<Layers size={ICON_MD} />}
                      kind="band"
                      name="This Mac"
                      rowKey="mac"
                      trailing={
                        <ToneIcon icon={CircleArrowUp} label="Updates available" tone="warning" />
                      }
                    />
                    <TreeRow
                      glyph={<Server size={ICON_MD} />}
                      kind="group"
                      name="Services"
                      rowKey="services"
                      toggle={{
                        open,
                        onToggle: () => setOpen(!open),
                        label: open ? 'Collapse Services' : 'Expand Services'
                      }}
                      trailing={services.length}
                    />
                    {open
                      ? services.map((service) => (
                          <TreeRow
                            glyph={<Database size={ICON_MD} />}
                            key={service.name}
                            level={1}
                            name={service.name}
                            onContextMenu={(event, key) =>
                              setMenu({ name: key, x: event.clientX, y: event.clientY })
                            }
                            rowKey={service.name}
                            tool={
                              <Switch
                                checked={running.includes(service.name)}
                                label={`Run ${service.name}`}
                                labelHidden
                                onChange={(next) =>
                                  setRunning((now) =>
                                    next
                                      ? [...now, service.name]
                                      : now.filter((each) => each !== service.name)
                                  )
                                }
                              />
                            }
                            trailing={
                              <StateMark
                                tone={service.tone}
                                word={service.state === 'error' ? 'error' : service.port}
                              />
                            }
                          />
                        ))
                      : null}
                    {open ? (
                      // Dim while the tool services need is missing: it still opens, to say why.
                      <TreeRow
                        add
                        dim
                        level={1}
                        name="Add service…"
                        onOpen={() => undefined}
                        rowKey="add-service"
                      />
                    ) : null}
                    <TreeTool
                      icon={Settings2}
                      kind="note"
                      level={1}
                      text="Services need Homebrew."
                    />
                  </TreeList>
                </RowCursorContext>
                <PaneStatus>{running.length} running</PaneStatus>
              </TreePane>
            ) : null
          }
          sidebarWidth={width}
        />
      </div>
      {menu === null ? null : (
        <Menu
          at={{ x: menu.x, y: menu.y }}
          compact
          entries={menuEntries(menu.name)}
          label={`${menu.name} actions`}
          onClose={() => setMenu(null)}
          onPick={(id) => {
            pick(menu.name, id);
            setMenu(null);
          }}
        />
      )}
      <div className="demo-row">
        <Button onClick={() => treeList.current?.focus()} size="small">
          Focus the tree
        </Button>
        <code className="demo-readout">
          {said === ''
            ? 'secondary-click a service in the tree; or focus the tree, move to a service with ↑ ↓, and press the Menu key or Shift-F10'
            : said}
        </code>
      </div>
    </>
  );
}
