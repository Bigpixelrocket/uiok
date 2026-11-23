import { act, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { CircleAlert, Server } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { Switch } from '../field/Switch.js';
import { RowCursorContext, type RowCursor } from '../listing/Listing.js';
import { AppRoot, PageSlot, SpacePanel } from './AppRoot.js';
import { Dock, dockHeight, DockLog, DockLogEntry } from './Dock.js';
import { PageNote, SectionHead, ShowSidebarButton, Toolbar, ToolbarGap } from './PageParts.js';
import { heldSplitHeight, SplitDetail, usePaneSplit } from './PaneSplit.js';
import { TreeFilterInput, TreeList, TreeRow, TreeTool } from './Tree.js';
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

describe('TreeRow', () => {
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
      screen.getByRole('separator', { name: 'Resize the console' }).getAttribute('aria-valuenow')
    ).toBe('180');
  });
});

describe('dockHeight', () => {
  const bounds = { min: 64, pageMin: 160 };

  it('keeps the host’s height while the main pane keeps its least', () => {
    expect(dockHeight(200, 600, bounds)).toBe(200);
    expect(dockHeight(200.4, 0, bounds)).toBe(200);
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
