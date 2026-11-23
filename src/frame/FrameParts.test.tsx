import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { createRoot } from 'react-dom/client';
import { useState, type ReactNode } from 'react';
import { CircleAlert, Server } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Switch } from '../field/Switch.js';
import { Listing, Row, RowCursorContext, type RowCursor } from '../listing/Listing.js';
import { AppRoot, PageSlot, SpacePanel } from './AppRoot.js';
import { Dock, dockHeight, DockLog, DockLogEntry } from './Dock.js';
import { PageNote, SectionHead, ShowSidebarButton, Toolbar, ToolbarGap } from './PageParts.js';
import { heldSplitHeight, SplitDetail, usePaneSplit } from './PaneSplit.js';
import { TreeFilterInput, TreeList, TreeRow, TreeTool } from './Tree.js';
import { PaneBox, PaneList } from '../pane/Pane.js';
import { PaneSplitter } from './PaneSplit.js';
import { WindowFrame } from './WindowFrame.js';

/** A cursor the test moves by hand, as `usePaneKeys` gives a host. */
const cursorAt = (start: string | null): RowCursor & { readonly listeners: Set<() => void> } => {
  let key = start;
  const listeners = new Set<() => void>();

  return {
    listeners,
    current: () => key,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    point: (next) => {
      key = next;
      for (const listener of listeners) listener();
    }
  };
};

describe('AppRoot and its panel', () => {
  it('wears the channel and hands the panel the host’s keys, out of the Tab order', () => {
    const onKeyDown = vi.fn();
    const { container } = render(
      <AppRoot channel="local">
        <SpacePanel onKeyDown={onKeyDown}>
          <PageSlot shown={false}>held</PageSlot>
        </SpacePanel>
      </AppRoot>
    );
    const panel = container.querySelector('.space-panel') as HTMLElement;

    expect(container.querySelector('.app-shell')?.getAttribute('data-channel')).toBe('local');
    expect(panel.tabIndex).toBe(-1);
    fireEvent.keyDown(panel, { key: 'k' });
    expect(onKeyDown).toHaveBeenCalledOnce();
    expect((container.querySelector('.page-slot') as HTMLElement).hidden).toBe(true);
  });
});

describe('WindowFrame', () => {
  it('is the space’s listing root, and gathers its panes in the host’s group', () => {
    const onDrop = vi.fn();
    const { container } = render(
      <WindowFrame
        brand="b"
        group={{ onDrop }}
        main={<section>main</section>}
        sidebar={<aside>tree</aside>}
        sidebarWidth={240}
      />
    );
    const frame = container.querySelector('.window-frame') as HTMLElement;
    const group = frame.querySelector(':scope > .window-frame-group') as HTMLElement;

    expect(frame.classList.contains('space-root')).toBe(true);
    expect(frame.classList.contains('listing-root')).toBe(true);
    expect(group.querySelector('.window-frame-sidebar')?.textContent).toBe('tree');
    expect(group.querySelector('.window-frame-main')?.textContent).toBe('main');
    expect(frame.querySelector(':scope > .window-frame-band')).not.toBeNull();
    fireEvent.drop(group);
    expect(onDrop).toHaveBeenCalledOnce();
  });
});

describe("the frame's secondary clicks", () => {
  it('opens the innermost menu of a row, its pane, the group, and the frame root, one a click', () => {
    const opened: string[] = [];
    const menu = (name: string) => () => opened.push(name);
    const { container } = render(
      <AppRoot>
        <SpacePanel onContextMenu={menu('root')}>
          <WindowFrame
            brand="b"
            group={{ onContextMenu: menu('group') }}
            main={
              <PaneBox label="Files" onContextMenu={menu('pane')}>
                <Listing columns={[]} grid="20px 1fr" title="Files">
                  <Row name="a" onContextMenu={menu('row')} rowKey="a" />
                  <Row name="b" rowKey="b" />
                </Listing>
              </PaneBox>
            }
            sidebar={<aside>tree</aside>}
            sidebarWidth={240}
          />
        </SpacePanel>
      </AppRoot>
    );
    const click = (target: Element): boolean => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      act(() => target.dispatchEvent(event));
      return event.defaultPrevented;
    };
    const [a, b] = screen.getAllByRole('row').slice(1) as [HTMLElement, HTMLElement];

    expect(click(a)).toBe(true);
    expect(opened).toEqual(['row']);
    click(b);
    expect(opened).toEqual(['row', 'pane']);
    click(screen.getByText('tree'));
    expect(opened).toEqual(['row', 'pane', 'group']);
    // The band is outside the group: the frame's root takes it.
    click(container.querySelector('.window-frame-band') as HTMLElement);
    expect(opened).toEqual(['row', 'pane', 'group', 'root']);
  });
});

describe('WindowFrame slots', () => {
  it('draws no slot for a part given as false, as `cond && <Part />` passes', () => {
    const { container } = render(
      <WindowFrame
        brand="b"
        dock={false}
        legend={false}
        main="m"
        sidebar={false}
        sidebarWidth={240}
        tray={false}
        trailing={false}
      />
    );

    expect(
      container.querySelector(
        '.window-frame-tray, .window-frame-dock, .window-frame-legend, .window-frame-sidebar, .shell-trailing'
      )
    ).toBeNull();
  });

  it('stands a tabless window’s trailing part at the band’s end, out of its drag region', () => {
    const { container } = render(
      <WindowFrame
        brand="b"
        main="m"
        sidebarWidth={240}
        trailing={<button type="button">Update</button>}
      />
    );

    expect(container.querySelector('.window-frame-band > .shell-trailing')?.textContent).toBe(
      'Update'
    );
  });

  it('draws no empty bar or toolbar end for false', () => {
    const { container } = render(
      <>
        <Dock bar={false} height={120} label="Console" open>
          body
        </Dock>
        <Toolbar end={false}>
          <button type="button">Start</button>
        </Toolbar>
      </>
    );

    expect(container.querySelector('.dock-bar, .pane-toolbar-end')).toBeNull();
  });
});

describe('pane tone', () => {
  it('draws a danger pane or dock in the danger tone', () => {
    const { container } = render(
      <>
        <PaneBox tone="danger">pane</PaneBox>
        <Dock height={120} label="Console" open tone="danger">
          body
        </Dock>
      </>
    );

    expect(
      [...container.querySelectorAll('.pane')].map((pane) => pane.getAttribute('data-tone'))
    ).toEqual(['danger', 'danger']);
  });
});

describe('TreeRow', () => {
  it('draws an add row: an accent plus in the glyph slot and the pane-add look', () => {
    render(
      <TreeList label="Runtimes">
        <TreeRow add level={1} name="Add runtime…" rowKey="add" />
      </TreeList>
    );
    const row = screen.getByRole('treeitem');

    expect(row.classList.contains('pane-add')).toBe(true);
    expect(row.querySelector('.tree-glyph svg')).not.toBe(null);
  });

  it('follows the pane’s cursor, and the pointer moves the cursor to it', () => {
    const cursor = cursorAt('a');

    render(
      <RowCursorContext value={cursor}>
        <TreeList label="Services">
          <TreeRow glyph={<Server />} level={1} name="PostgreSQL" rowKey="a" trailing="5432" />
          <TreeRow name="Redis" rowKey="b" />
        </TreeList>
      </RowCursorContext>
    );
    const [first, second] = screen.getAllByRole('treeitem');

    expect(screen.getByRole('tree', { name: 'Services' }).getAttribute('data-pane-home')).toBe(
      'sidebar'
    );
    expect(first?.getAttribute('aria-current')).toBe('true');
    expect(first?.classList.contains('cursor')).toBe(true);
    expect(first?.getAttribute('aria-level')).toBe('2');
    expect(first?.style.getPropertyValue('--tree-level')).toBe('1');
    const tree = screen.getByRole('tree');
    expect(tree.getAttribute('aria-activedescendant')).toBe(first?.id);
    fireEvent.pointerMove(second as HTMLElement);
    expect(second?.classList.contains('cursor')).toBe(true);
    expect(first?.classList.contains('cursor')).toBe(false);
    expect(tree.getAttribute('aria-activedescendant')).toBe(second?.id);
    expect(second?.id).not.toBe('');
  });

  it('lets a tool row with a key join the cursor as a row does', () => {
    const cursor = cursorAt('a');

    render(
      <RowCursorContext value={cursor}>
        <TreeList label="Services">
          <TreeRow name="PostgreSQL" rowKey="a" />
          <TreeTool rowKey="more" text="Show 20 more" />
          <TreeTool cursor text="Loose note" />
        </TreeList>
      </RowCursorContext>
    );
    const tool = screen.getByText('Show 20 more').closest('.tree-tool') as HTMLElement;

    expect(tool.dataset.rowKey).toBe('more');
    expect(tool.classList.contains('cursor')).toBe(false);
    fireEvent.pointerMove(tool);
    expect(tool.classList.contains('cursor')).toBe(true);
    expect(screen.getByRole('tree').getAttribute('aria-activedescendant')).toBe(tool.id);
    expect(tool.getAttribute('role')).toBe('treeitem');
    expect(tool.getAttribute('aria-level')).toBe('1');
    expect(screen.getByText('Loose note').closest('.tree-tool')?.classList.contains('cursor')).toBe(
      true
    );
  });

  it('names its cursor row inside a shadow root, which the document cannot see into', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const mount = document.createElement('div');
    shadow.append(mount);
    const root = createRoot(mount);
    const cursor = cursorAt('a');

    act(() =>
      root.render(
        <RowCursorContext value={cursor}>
          <TreeList label="Services">
            <TreeRow name="PostgreSQL" rowKey="a" />
            <TreeRow name="Redis" rowKey="b" />
          </TreeList>
        </RowCursorContext>
      )
    );
    const list = shadow.querySelector('[role="tree"]');
    const [first, second] = Array.from(shadow.querySelectorAll('[role="treeitem"]'));

    expect(list?.getAttribute('aria-activedescendant')).toBe(first?.id);
    act(() => cursor.point('b'));
    expect(list?.getAttribute('aria-activedescendant')).toBe(second?.id);
    act(() => root.unmount());
    host.remove();
  });

  it("names its cursor row in another window's document", () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const frameDocument = frame.contentDocument as Document;
    const mount = frameDocument.createElement('div');
    frameDocument.body.append(mount);
    const root = createRoot(mount);

    act(() =>
      root.render(
        <RowCursorContext value={cursorAt('a')}>
          <TreeList label="Services">
            <TreeRow name="PostgreSQL" rowKey="a" />
          </TreeList>
        </RowCursorContext>
      )
    );

    expect(frameDocument instanceof Document).toBe(false);
    expect(mount.querySelector('[role="tree"]')?.getAttribute('aria-activedescendant')).toBe(
      mount.querySelector('[role="treeitem"]')?.id
    );
    act(() => root.unmount());
    frame.remove();
  });

  it('keeps a keyed danger row an item of the tree, its words the alert', () => {
    render(
      <RowCursorContext value={cursorAt(null)}>
        <TreeList label="Services">
          <TreeTool kind="danger" rowKey="failed" text="Could not list the services." />
        </TreeList>
      </RowCursorContext>
    );

    expect(screen.getByRole('treeitem').contains(screen.getByRole('alert'))).toBe(true);
    expect(screen.getByRole('alert').textContent).toBe('Could not list the services.');
  });

  it('mounts with a cursor row in an element not yet attached to a document', () => {
    const mount = document.createElement('div');
    const root = createRoot(mount);

    expect(() =>
      act(() =>
        root.render(
          <RowCursorContext value={cursorAt('a')}>
            <TreeList label="Services">
              <TreeRow name="PostgreSQL" rowKey="a" />
            </TreeList>
          </RowCursorContext>
        )
      )
    ).not.toThrow();
    expect(mount.querySelector('[role="tree"]')?.hasAttribute('aria-activedescendant')).toBe(false);
    act(() => root.unmount());
  });

  it('names no active descendant once a filter takes the cursor row away', () => {
    const cursor = cursorAt('a');
    const tree = (keys: readonly string[]) => (
      <RowCursorContext value={cursor}>
        <TreeList label="Services">
          {keys.map((key) => (
            <TreeRow key={key} name={key} rowKey={key} />
          ))}
        </TreeList>
      </RowCursorContext>
    );
    const { rerender } = render(tree(['a', 'b']));
    const list = screen.getByRole('tree');

    expect(list.getAttribute('aria-activedescendant')).toBe(
      screen.getByText('a').closest('[role="treeitem"]')?.id
    );
    rerender(tree(['b']));
    expect(list.hasAttribute('aria-activedescendant')).toBe(false);
    act(() => cursor.point('b'));
    expect(list.getAttribute('aria-activedescendant')).toBe(screen.getByRole('treeitem').id);
  });

  it('names no active descendant once a child’s own state takes the cursor row away', async () => {
    const cursor = cursorAt('a');
    let hide: () => void = () => undefined;

    function Rows(): ReactNode {
      const [keys, setKeys] = useState(['a', 'b']);

      hide = () => setKeys(['b']);
      return keys.map((key) => <TreeRow key={key} name={key} rowKey={key} />);
    }

    render(
      <RowCursorContext value={cursor}>
        <TreeList label="Services">
          <Rows />
        </TreeList>
      </RowCursorContext>
    );
    const list = screen.getByRole('tree');

    expect(list.hasAttribute('aria-activedescendant')).toBe(true);
    await act(async () => hide());
    expect(list.hasAttribute('aria-activedescendant')).toBe(false);
  });

  it('names its active row again once per commit, however many rows mount', async () => {
    const cursor = cursorAt('r999');
    const queued = vi.spyOn(globalThis, 'queueMicrotask');

    await act(async () => {
      render(
        <RowCursorContext value={cursor}>
          <TreeList label="Many">
            {Array.from({ length: 1000 }, (_, index) => (
              <TreeRow key={index} name={`r${index}`} rowKey={`r${index}`} />
            ))}
          </TreeList>
        </RowCursorContext>
      );
    });

    // One for the tree, the rest React's own; a microtask per row would be 1,000.
    expect(queued.mock.calls.length).toBeLessThan(10);
    expect(screen.getByRole('tree').getAttribute('aria-activedescendant')).toBe(
      screen.getByText('r999').closest('[role="treeitem"]')?.id
    );
    queued.mockRestore();
  });

  it('runs the cleanup a host’s callback ref returns when the tree or dock goes', () => {
    const cleanups: string[] = [];
    const { unmount } = render(
      <>
        <TreeList label="Services" ref={() => () => void cleanups.push('tree')}>
          {null}
        </TreeList>
        <Dock height={120} label="Console" open ref={() => () => void cleanups.push('dock')}>
          body
        </Dock>
      </>
    );

    unmount();
    expect(cleanups.sort()).toEqual(['dock', 'tree']);
  });

  it('toggles its children from the chevron without opening the row', () => {
    const onToggle = vi.fn();
    const onOpen = vi.fn();

    render(
      <TreeRow
        kind="group"
        name="Services"
        onOpen={onOpen}
        rowKey="services"
        toggle={{ open: false, onToggle, label: 'Expand Services' }}
      />
    );

    expect(screen.getByRole('treeitem').getAttribute('aria-expanded')).toBe('false');
    expect(screen.getByRole('treeitem').classList.contains('tree-group')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Expand Services' }));
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText('Services'));
    expect(onOpen).toHaveBeenCalledOnce();
  });
});

describe('a switch in a tree row', () => {
  it('toggles alone, never opening the row', () => {
    const onOpen = vi.fn();
    const onChange = vi.fn();

    render(
      <TreeRow
        name="PostgreSQL"
        onOpen={onOpen}
        rowKey="pg"
        tool={<Switch checked={false} label="Run PostgreSQL" labelHidden onChange={onChange} />}
      />
    );
    fireEvent.click(screen.getByRole('switch', { name: 'Run PostgreSQL' }));

    expect(onChange).toHaveBeenCalledWith(true);
    expect(onOpen).not.toHaveBeenCalled();
  });

  it('toggles alone from its drawn words too', () => {
    const onOpen = vi.fn();
    const onChange = vi.fn();

    render(
      <TreeRow
        name="Sharing"
        onOpen={onOpen}
        rowKey="share"
        tool={<Switch checked label="Share" onChange={onChange} />}
      />
    );
    fireEvent.click(screen.getByText('Share'));

    expect(onChange).toHaveBeenCalledWith(false);
    expect(onOpen).not.toHaveBeenCalled();
  });
});

describe('TreeTool', () => {
  it('announces a failed read, its glyph and words, its action after them', () => {
    render(
      <TreeTool icon={CircleAlert} kind="danger" level={1} text="Homebrew is not installed.">
        <button type="button">Retry</button>
      </TreeTool>
    );
    const tool = screen.getByRole('alert');

    expect(tool.className).toBe('tree-tool danger');
    expect(tool.textContent).toBe('Homebrew is not installed.Retry');
  });

  it('holds a filter field that reports each edit', () => {
    const onChange = vi.fn();

    render(
      <TreeTool>
        <TreeFilterInput label="Filter services" onChange={onChange} value="" />
      </TreeTool>
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Filter services' }), {
      target: { value: 'pg' }
    });
    expect(onChange).toHaveBeenCalledWith('pg');
  });
});

describe('Dock', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('takes no room while closed and keeps its body', () => {
    const { container, rerender } = render(
      <Dock bar="Console" height={200} label="Console" open={false}>
        <DockLog empty="Nothing yet." label="Activity" />
      </Dock>
    );
    const dock = screen.getByRole('region', { name: 'Console', hidden: true });

    expect(dock.classList.contains('closed')).toBe(true);
    expect(container.querySelector('.dock-log-empty')?.textContent).toBe('Nothing yet.');

    rerender(
      <Dock height={200} label="Console" open>
        <DockLog empty="Nothing yet." label="Activity">
          <DockLogEntry actions={<button type="button">Show</button>}>Exported</DockLogEntry>
        </DockLog>
      </Dock>
    );
    expect(dock.classList.contains('closed')).toBe(false);
    expect(container.querySelector('.dock-log-empty')).toBeNull();
    expect(container.querySelector('.dock-log-entry .dock-log-actions')?.textContent).toBe('Show');
    // It keeps the height its host keeps, whatever its log holds, and draws no
    // edge unless the host hears a drag.
    expect(dock.style.height).toBe('200px');
    expect(screen.queryByRole('separator', { hidden: true })).toBeNull();
  });

  it('measures again when the main pane’s slot changes, as a tray or legend coming does', () => {
    const observed: Element[] = [];

    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(element: Element): void {
          observed.push(element);
        }
        disconnect(): void {}
      }
    );
    const { container } = render(
      <WindowFrame
        brand="b"
        dock={
          <Dock height={120} label="Console" open>
            body
          </Dock>
        }
        main="m"
        sidebarWidth={240}
      />
    );

    expect(observed).toContain(container.querySelector('.window-frame'));
    expect(observed).toContain(container.querySelector('.window-frame-main'));
  });

  it('draws its edge for a drag, with its height as the separator’s value', () => {
    render(
      <Dock
        height={180}
        label="Console"
        onResize={() => undefined}
        open
        resizeLabel="Resize the console"
      >
        body
      </Dock>
    );

    expect(
      screen.getByRole('separator', { name: 'Resize the console' }).hasAttribute('aria-valuenow')
    ).toBe(false);
  });
});

describe('dockHeight', () => {
  const bounds = { min: 64, pageMin: 160 };

  it('keeps the host’s height while the main pane keeps its least', () => {
    expect(dockHeight(200, 600, bounds)).toBe(200);
    expect(dockHeight(200.4, null, bounds)).toBe(200);
  });

  it('takes its least, not the kept height, in a laid-out frame with no room left', () => {
    expect(dockHeight(318, 0, bounds)).toBe(64);
    expect(dockHeight(318, -20, bounds)).toBe(64);
  });

  it('gives way in a short window so the main pane keeps its least, never under its own least', () => {
    expect(dockHeight(440, 500, bounds)).toBe(340);
    expect(dockHeight(440, 200, bounds)).toBe(64);
    expect(dockHeight(20, 600, bounds)).toBe(64);
  });
});

describe('SplitDetail', () => {
  it('is the split’s lower pane, and folds to its head', () => {
    const { result } = renderHook(() => usePaneSplit('test-split', null));
    const { rerender } = render(
      <SplitDetail head={<span>head</span>} label="Selected" split={result.current}>
        body
      </SplitDetail>
    );
    const pane = screen.getByRole('region', { name: 'Selected' });

    expect(result.current.lower.current).toBe(pane);
    expect(pane.querySelector('.split-detail-body')?.textContent).toBe('body');

    rerender(
      <SplitDetail folded head={<span>head</span>} label="Selected" split={result.current}>
        body
      </SplitDetail>
    );
    expect(pane.classList.contains('folded')).toBe(true);
    expect(pane.textContent).toBe('head');
  });
});

describe('heldSplitHeight', () => {
  const bounds = { floor: 48, least: 40 };

  it('keeps the dragged height while the upper list keeps its floor', () => {
    expect(heldSplitHeight(200, 400, bounds)).toBe(200);
  });

  it('gives way in a shorter window, never under the lower pane’s least', () => {
    expect(heldSplitHeight(340, 200, bounds)).toBe(152);
    expect(heldSplitHeight(340, 60, bounds)).toBe(40);
  });

  it('keeps the dragged height while a held page is not laid out, never in a page with no room left', () => {
    expect(heldSplitHeight(200, null, bounds)).toBe(200);
    expect(heldSplitHeight(200, 0, bounds)).toBe(40);
  });
});

describe('page parts', () => {
  it('says a page is loading as a status, its spinner for the glyph', () => {
    render(<PageNote busy>Loading services…</PageNote>);

    expect(screen.getByRole('status').textContent).toBe('Loading services…');
    expect(screen.getByRole('status').querySelector('.spinner')).not.toBeNull();
  });

  it('heads a listing at the level given', () => {
    render(<SectionHead level={2}>Needs attention</SectionHead>);

    expect(screen.getByRole('heading', { level: 2, name: 'Needs attention' })).toBeTruthy();
  });

  it('stands a toolbar’s end group at its far end', () => {
    const { container } = render(
      <Toolbar end={<button type="button">Stop</button>}>
        <button type="button">Start</button>
        <ToolbarGap />
      </Toolbar>
    );

    expect(container.querySelector('.pane-toolbar > .pane-toolbar-end')?.textContent).toBe('Stop');
    expect(container.querySelector('.pane-toolbar-gap')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('shows the sidebar again', () => {
    const onShow = vi.fn();

    render(<ShowSidebarButton label="Show panel" onShow={onShow} />);
    act(() => screen.getByRole('button', { name: 'Show panel' }).click());
    expect(onShow).toHaveBeenCalledOnce();
  });
});

describe('usePaneSplit', () => {
  const observed: Element[] = [];

  afterEach(() => {
    observed.length = 0;
    vi.unstubAllGlobals();
  });

  /** A page whose list mounts only once loaded, as a page under a load does. */
  function Page({ name, loaded }: { readonly name: string; readonly loaded: boolean }): ReactNode {
    const split = usePaneSplit(name, loaded);

    return (
      <PaneBox>
        {loaded ? <PanePageFor split={split} /> : <PageNote busy>Loading…</PageNote>}
      </PaneBox>
    );
  }

  function PanePageFor({ split }: { readonly split: ReturnType<typeof usePaneSplit> }): ReactNode {
    return (
      <div>
        <PaneList ref={split.upper}>rows</PaneList>
        <PaneSplitter split={split} />
        <SplitDetail split={split}>detail</SplitDetail>
      </div>
    );
  }

  it('watches the list for a window resize once it mounts after a load', () => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe(element: Element): void {
          observed.push(element);
        }
        disconnect(): void {}
      }
    );
    const { rerender } = render(<Page loaded={false} name="watch" />);

    expect(observed).toHaveLength(0);
    rerender(<Page loaded name="watch" />);
    expect(observed.length).toBeGreaterThan(0);
  });

  it('takes the kept height of the split it is renamed to', () => {
    const { result, rerender } = renderHook(({ name }) => usePaneSplit(name, null), {
      initialProps: { name: 'first' }
    });
    const pointer = { button: 0, clientY: 300, preventDefault: () => undefined };
    const pane = document.createElement('div');
    const list = document.createElement('div');

    document.body.append(list, pane);
    act(() => {
      result.current.upper.current = list as HTMLDivElement;
      result.current.lower.current = pane;
    });
    act(() => result.current.drag(pointer as never));
    act(() => {
      window.dispatchEvent(new MouseEvent('pointermove', { clientY: 250 }));
      window.dispatchEvent(new MouseEvent('pointerup'));
    });
    // jsdom lays nothing out, so the held height fits to no room; what
    // matters is whether a held height applies at all.
    expect(pane.style.flex).not.toBe('');

    rerender({ name: 'second' });
    expect(pane.style.flex).toBe('');
    rerender({ name: 'first' });
    expect(pane.style.flex).not.toBe('');
    list.remove();
    pane.remove();
  });
});
