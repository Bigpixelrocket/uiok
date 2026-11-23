/**
 * A small window in the frame: the title bar with a lockup, its brand mark,
 * and a local build's channel marker; a sidebar tree with its quick row of
 * filters, a band, groups, and rows stepped in by level, the edge that
 * resizes it, and a Hide/Show panel toggle; a main pane with a status
 * notice in its status line; the key legend across the foot. Under it, a
 * list over the pane under it, with the splitter between them.
 */

import { CircleAlert, Database, Layers, Play, Server, Settings2, ArrowUp } from 'lucide-react';
import { useState, type CSSProperties } from 'react';

import { Button } from '@bigpixelrocket/uiok/button';
import {
  FilterChips,
  PaneSplitter,
  SidebarResizer,
  StatusNotice,
  TreeToggle,
  usePaneSplit,
  WindowFrame
} from '@bigpixelrocket/uiok/frame';
import { ICON_MD } from '@bigpixelrocket/uiok/icon';
import { KeyLegendStrip, type LegendVerb } from '@bigpixelrocket/uiok/legend';
import { PanePathBar, PaneStatus } from '@bigpixelrocket/uiok/pane';
import { BrandMark, ChannelMarker, Lockup, TitleBar } from '@bigpixelrocket/uiok/shell';
import { StateMark } from '@bigpixelrocket/uiok/listing';

const SERVICES = [
  { name: 'PostgreSQL 18', state: 'running', tone: 'ready', port: '5432' },
  { name: 'MySQL 8.4', state: 'error', tone: 'danger', port: '3306' },
  { name: 'Redis', state: 'running', tone: 'ready', port: '6379' },
  { name: 'Meilisearch', state: 'stopped', tone: 'muted', port: '7700' }
] as const;

const level = (value: number): CSSProperties => ({ '--tree-level': value }) as CSSProperties;

/** The frame page's demo. */
export function FrameDemo() {
  const [width, setWidth] = useState(260);
  const [shown, setShown] = useState(true);
  const [open, setOpen] = useState(true);
  const [on, setOn] = useState<readonly string[]>([]);
  const split = usePaneSplit('frame-demo', '.demo-split-lower', null);
  const verbs: readonly LegendVerb[] = [
    { label: 'Open', chord: { key: 'Enter' }, run: () => undefined },
    { label: 'Start', chord: { key: 'Enter', meta: true }, run: () => undefined },
    { label: 'Switch Pane', chord: { key: 'Tab' }, run: () => undefined }
  ];
  const services = on.includes('running')
    ? SERVICES.filter((service) => service.state === 'running')
    : SERVICES;

  return (
    <div className="demo-stack">
      <div className="frame-demo" data-channel="local">
        <WindowFrame
          brand={
            <TitleBar trafficLights>
              <Lockup
                className="shell-lockup"
                lead="Acme"
                mark={
                  <BrandMark>
                    <path
                      className="brand-mark-line"
                      d="M5 7.5l5-2.5 5 2.5-5 2.5z M5 10.5l5 2.5 5-2.5 M5 13.5l5 2.5 5-2.5"
                    />
                  </BrandMark>
                }
                strong="OK"
              />
              <ChannelMarker
                detail="feat/frame"
                label="Local"
                title="Local build from feat/frame"
              />
            </TitleBar>
          }
          className="space-root listing-root"
          legend={<KeyLegendStrip pairLabel={(pair) => pair} verbs={verbs} />}
          main={
            <section className="pane active">
              <PanePathBar trail={['Services']}>
                {shown ? null : (
                  <Button
                    className="window-frame-show-sidebar"
                    onClick={() => setShown(true)}
                    size="small"
                  >
                    Show panel
                  </Button>
                )}
              </PanePathBar>
              <div className="pane-list">
                <p className="pane-section-head overline">Needs attention</p>
                <p className="pane-message pane-page-note">
                  <CircleAlert aria-hidden size={ICON_MD} /> MySQL 8.4 stopped with an error.
                </p>
              </div>
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
            </section>
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
              <aside className="pane tree-pane" style={{ width }}>
                <PanePathBar trail={['Stack']} />
                <FilterChips
                  chips={[
                    { id: 'running', label: 'Running', icon: Play, count: 2 },
                    { id: 'updates', label: 'Updates', icon: ArrowUp, count: 1 }
                  ]}
                  label="Filters"
                  on={on}
                  onToggle={(id) =>
                    setOn((now) =>
                      now.includes(id) ? now.filter((each) => each !== id) : [...now, id]
                    )
                  }
                />
                <div className="pane-list tree" role="tree">
                  <div className="row tree-band" role="treeitem" style={level(0)}>
                    <span className="row-icon" />
                    <span className="tree-glyph">
                      <Layers aria-hidden size={ICON_MD} />
                    </span>
                    <span className="row-name tree-name">This Mac</span>
                    <span className="row-meta align-right" />
                  </div>
                  <div
                    aria-expanded={open}
                    className="row tree-group"
                    role="treeitem"
                    style={level(0)}
                  >
                    <TreeToggle
                      label={open ? 'Collapse Services' : 'Expand Services'}
                      onToggle={() => setOpen(!open)}
                      open={open}
                    />
                    <span className="tree-glyph">
                      <Server aria-hidden size={ICON_MD} />
                    </span>
                    <span className="row-name tree-name">Services</span>
                    <span className="row-meta align-right">{services.length}</span>
                  </div>
                  {open
                    ? services.map((service) => (
                        <div className="row" key={service.name} role="treeitem" style={level(1)}>
                          <span className="row-icon" />
                          <span className="tree-glyph">
                            <Database aria-hidden size={ICON_MD} />
                          </span>
                          <span className="row-name tree-name">{service.name}</span>
                          <span className="row-meta align-right">
                            <StateMark
                              tone={service.tone}
                              word={service.state === 'error' ? 'error' : service.port}
                            />
                          </span>
                        </div>
                      ))
                    : null}
                  <div className="tree-tool tree-note" style={level(1)}>
                    <Settings2 aria-hidden className="tree-note-glyph" size={ICON_MD} />
                    <span className="tree-note-text">Services need Homebrew.</span>
                  </div>
                </div>
                <PaneStatus>2 running</PaneStatus>
              </aside>
            ) : null
          }
          sidebarWidth={width}
        />
      </div>
      <div className="listing-root frame-split-demo">
        <section className="pane active">
          <div className="pane-list" ref={split.upper}>
            {Array.from({ length: 12 }, (_, index) => (
              <div className="row" key={index}>
                <span className="row-icon" />
                <span className="row-name">upper row {index + 1}</span>
              </div>
            ))}
          </div>
          <PaneSplitter split={split} />
          <div className="split-detail" ref={split.lower}>
            <div className="split-detail-body demo-split-lower">
              {Array.from({ length: 8 }, (_, index) => (
                <span key={index}>lower line {index + 1}</span>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
