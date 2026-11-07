import { fireEvent, render, screen } from '@testing-library/react';
import { FileText, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { PageTabs, type PageTab } from './PageTabs.js';

type Page = 'overview' | 'members' | 'settings';

const TABS: readonly PageTab<Page>[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings }
];

function Strip({
  initial,
  onSelect
}: {
  readonly initial: Page | null;
  readonly onSelect: (id: Page) => void;
}) {
  const [current, setCurrent] = useState<Page | null>(initial);

  return (
    <PageTabs
      current={current}
      label="Project pages"
      onSelect={(id) => {
        onSelect(id);
        setCurrent(id);
      }}
      tabs={TABS}
    />
  );
}

describe('PageTabs', () => {
  it('is a named tablist with one tab stop, the current tab', () => {
    render(<Strip initial="members" onSelect={() => undefined} />);

    expect(screen.getByRole('tablist', { name: 'Project pages' })).toBeDefined();
    const members = screen.getByRole('tab', { name: 'Members' });

    expect(members.getAttribute('aria-selected')).toBe('true');
    expect(members.tabIndex).toBe(0);
    expect(members.getAttribute('data-page-tab')).toBe('members');
    expect(screen.getByRole('tab', { name: 'Overview' }).tabIndex).toBe(-1);
  });

  it('enters on the first tab when no tab is current', () => {
    render(<Strip initial={null} onSelect={() => undefined} />);

    expect(screen.getByRole('tab', { name: 'Overview' }).tabIndex).toBe(0);
    expect(screen.queryAllByRole('tab', { selected: true })).toHaveLength(0);
  });

  it('opens the tab an arrow reaches, moving the focus, and keeps the arrows from what holds it', () => {
    const onSelect = vi.fn();
    const outer = vi.fn();

    render(
      <div onKeyDown={outer}>
        <Strip initial="overview" onSelect={onSelect} />
      </div>
    );
    const overview = screen.getByRole('tab', { name: 'Overview' });

    overview.focus();
    fireEvent.keyDown(overview, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenLastCalledWith('members');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Members' }));
    fireEvent.keyDown(overview, { key: 'ArrowLeft' });
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(outer).not.toHaveBeenCalled();
  });

  it('names an icon-only tab on hover and to assistive technology', () => {
    render(
      <PageTabs
        current="overview"
        label="Pages"
        look="icons"
        onSelect={() => undefined}
        tabs={TABS}
      />
    );
    const tab = screen.getByRole('tab', { name: 'Members' });

    expect(tab.getAttribute('data-tooltip')).toBe('Members');
    expect(tab.textContent).toBe('');
  });

  it('opens a tab on a click', () => {
    const onSelect = vi.fn();

    render(<Strip initial="overview" onSelect={onSelect} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Settings' }));
    expect(onSelect).toHaveBeenCalledWith('settings');
  });
});
