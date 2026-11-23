import { fireEvent, render, screen } from '@testing-library/react';
import { CircleAlert, Info, Play } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { FilterChips } from './FilterChips.js';
import { draggedWidth, SidebarResizer } from './SidebarResizer.js';
import { StatusNotice } from './StatusNotice.js';
import { TreeToggle } from './TreeToggle.js';
import { WindowFrame } from './WindowFrame.js';

describe('WindowFrame', () => {
  it('places the title bar at the sidebar’s width and each part in its slot', () => {
    const { container } = render(
      <WindowFrame
        brand={<span>brand</span>}
        dock={<section>dock</section>}
        legend={<footer>legend</footer>}
        main={<section>main</section>}
        sidebar={<aside>tree</aside>}
        sidebarWidth={264}
      />
    );
    const frame = container.querySelector('.window-frame') as HTMLElement;

    expect(frame.getAttribute('data-sidebar')).toBe('shown');
    expect(frame.style.getPropertyValue('--window-band-width')).toBe('264px');
    expect(frame.querySelector('.window-frame-band-lead')?.textContent).toBe('brand');
    expect(frame.querySelector('.window-frame-sidebar')?.textContent).toBe('tree');
    expect(frame.querySelector('.window-frame-main')?.textContent).toBe('main');
    expect(frame.querySelector('.window-frame-dock')?.textContent).toBe('dock');
    expect(frame.querySelector('.window-frame-legend')?.textContent).toBe('legend');
    expect(frame.querySelector('.window-frame-tray')).toBeNull();
  });

  it('hides the sidebar and its edge, keeping the band’s width', () => {
    const { container } = render(
      <WindowFrame brand="b" main="m" resizer={<div className="edge" />} sidebarWidth={240} />
    );
    const frame = container.querySelector('.window-frame') as HTMLElement;

    expect(frame.getAttribute('data-sidebar')).toBe('hidden');
    expect(frame.querySelector('.window-frame-sidebar, .edge')).toBeNull();
    expect(frame.style.getPropertyValue('--window-band-width')).toBe('240px');
  });
});

describe('draggedWidth', () => {
  const bounds = { min: 120, max: 600, pageMin: 100 };

  it('follows the pointer between the narrowest and the widest the room allows', () => {
    expect(draggedWidth(240, 30.4, 1000, bounds)).toBe(270);
    expect(draggedWidth(240, -500, 1000, bounds)).toBe(120);
    expect(draggedWidth(240, 900, 1000, bounds)).toBe(600);
    expect(draggedWidth(240, 900, 500, bounds)).toBe(400);
  });

  it('bounds a drag by the widest alone before the room is laid out', () => {
    expect(draggedWidth(240, 900, 0, bounds)).toBe(600);
  });
});

describe('SidebarResizer', () => {
  it('is a separator named for what it resizes, reporting the width', () => {
    render(
      <SidebarResizer
        label="Resize the sidebar"
        max={600}
        min={120}
        onResize={vi.fn()}
        onResizeEnd={vi.fn()}
        pageMin={100}
        width={240}
      />
    );

    const edge = screen.getByRole('separator', { name: 'Resize the sidebar' });
    // It takes no focus, so it carries no value a screen reader would offer to change.
    expect(edge.hasAttribute('aria-valuenow')).toBe(false);
    expect(edge.classList.contains('window-frame-resizer')).toBe(true);
  });
});

describe('TreeToggle', () => {
  it('toggles the row’s children without opening the row', () => {
    const onToggle = vi.fn();
    const onRow = vi.fn();
    render(
      <div onClick={onRow}>
        <TreeToggle label="Expand shop" onToggle={onToggle} open={false} />
      </div>
    );

    const toggle = screen.getByRole('button', { name: 'Expand shop' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.tabIndex).toBe(-1);
    fireEvent.click(toggle);
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onRow).not.toHaveBeenCalled();
  });
});

describe('FilterChips', () => {
  it('presses the filters that are on and toggles one on a click', () => {
    const onToggle = vi.fn();
    render(
      <FilterChips
        chips={[
          { id: 'running', label: 'Running', icon: Play, count: 3 },
          { id: 'updates', label: 'Updates', count: 2 }
        ]}
        label="Filters"
        on={['updates']}
        onToggle={onToggle}
      />
    );

    expect(screen.getByRole('toolbar', { name: 'Filters' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Running 3' }).getAttribute('aria-pressed')).toBe(
      'false'
    );
    expect(screen.getByRole('button', { name: 'Updates 2' }).getAttribute('aria-pressed')).toBe(
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Running 3' }));
    expect(onToggle).toHaveBeenCalledWith('running');
  });
});

describe('StatusNotice', () => {
  it('announces a failure as an alert and anything else as a status', () => {
    const { rerender, container } = render(
      <StatusNotice icon={CircleAlert} text="Could not start" tone="danger" />
    );

    expect(screen.getByRole('alert').textContent).toBe('Could not start');
    expect(container.querySelector('.status-notice')?.classList.contains('danger')).toBe(true);
    rerender(<StatusNotice icon={Info} text="Started" />);
    expect(screen.getByRole('status').textContent).toBe('Started');
  });
});
