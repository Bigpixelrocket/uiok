import { fireEvent, render, screen } from '@testing-library/react';
import { Bell, FileText, Search, Settings, Users } from 'lucide-react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
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

  it('finds tabs whose ids hold quotes and backslashes', () => {
    const onSelect = vi.fn();
    const odd: readonly PageTab<string>[] = [
      { id: 'say "hi"', label: 'Quoted', icon: FileText },
      { id: 'back\\slash', label: 'Slashed', icon: Users }
    ];

    render(<PageTabs current='say "hi"' label="Pages" onSelect={onSelect} tabs={odd} />);
    const quoted = screen.getByRole('tab', { name: 'Quoted' });

    quoted.focus();
    fireEvent.keyDown(quoted, { key: 'ArrowRight' });
    expect(onSelect).toHaveBeenCalledWith('back\\slash');
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Slashed' }));
  });
});

type Wide = 'overview' | 'members' | 'settings' | 'alerts' | 'search';

const WIDE_TABS: readonly PageTab<Wide>[] = [
  { id: 'overview', label: 'Overview', icon: FileText },
  { id: 'members', label: 'Members', icon: Users },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'search', label: 'Search', icon: Search }
];

/** The strip's stubbed scroll box: 300px shown of 412 (five 80px tabs and 6px of padding each side). */
const layout = { clientWidth: 300, scrollWidth: 412, scrollLeft: 0 };

/** The strip's box in the stubbed layout. */
const STRIP = { left: 0, right: 300 };

/** A tab's box: 80px wide from the strip's 6px padding, moved by the strip's scroll. */
function tabBox(id: string): { left: number; right: number } {
  const left = 6 + WIDE_TABS.findIndex((tab) => tab.id === id) * 80 - layout.scrollLeft;
  return { left, right: left + 80 };
}

function WideStrip({ initial }: { readonly initial: Wide }) {
  const [current, setCurrent] = useState<Wide>(initial);

  return <PageTabs current={current} label="Pages" onSelect={setCurrent} tabs={WIDE_TABS} />;
}

describe('PageTabs in a strip too narrow for its tabs', () => {
  let scrollBy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    layout.clientWidth = 300;
    layout.scrollWidth = 412;
    layout.scrollLeft = 0;
    for (const key of ['clientWidth', 'scrollWidth', 'scrollLeft'] as const) {
      vi.spyOn(HTMLElement.prototype, key, 'get').mockImplementation(function (this: HTMLElement) {
        return this.getAttribute('role') === 'tablist' ? layout[key] : 0;
      });
    }
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: HTMLElement
    ) {
      const { left, right } =
        this.getAttribute('role') === 'tablist' ? STRIP : tabBox(this.dataset.pageTab ?? '');
      return DOMRect.fromRect({ x: left, y: 0, width: right - left, height: 28 });
    });
    scrollBy = vi.fn();
    HTMLElement.prototype.scrollBy = scrollBy as unknown as HTMLElement['scrollBy'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (HTMLElement.prototype as Partial<HTMLElement>).scrollBy;
  });

  it('marks the edges that hide tabs, following the scroll', () => {
    render(<WideStrip initial="overview" />);
    const strip = screen.getByRole('tablist');

    expect(strip.getAttribute('data-overflow')).toBe('end');
    layout.scrollLeft = 50;
    fireEvent.scroll(strip);
    expect(strip.getAttribute('data-overflow')).toBe('start end');
    layout.scrollLeft = 112;
    fireEvent.scroll(strip);
    expect(strip.getAttribute('data-overflow')).toBe('start');
  });

  it('marks no edge when every tab fits', () => {
    layout.scrollWidth = 300;
    render(<WideStrip initial="overview" />);

    expect(screen.getByRole('tablist').hasAttribute('data-overflow')).toBe(false);
  });

  it('fades only the marked edges', () => {
    applyStylesheets(readStylesheet('src/tabs/tabs.css'));
    render(<WideStrip initial="overview" />);
    const strip = screen.getByRole('tablist');
    const fade = (side: 'start' | 'end'): string | undefined =>
      declaredValues(strip, `--page-tabs-fade-${side}`).at(-1);

    expect([fade('start'), fade('end')]).toEqual(['0px', '24px']);
    layout.scrollLeft = 50;
    fireEvent.scroll(strip);
    expect([fade('start'), fade('end')]).toEqual(['24px', '24px']);
    strip.removeAttribute('data-overflow');
    expect([fade('start'), fade('end')]).toEqual([undefined, undefined]);
  });

  it('shows the current tab at once when it mounts past the edge', () => {
    render(<WideStrip initial="search" />);

    // Clearing the fade would take 130px (Search ends at 406, the clear span
    // at 276); the strip scrolls to its end, 112px.
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ left: 112, behavior: 'instant' });
  });

  it('leaves a current tab that is already clear of the edges where it is', () => {
    render(<WideStrip initial="members" />);

    expect(scrollBy).not.toHaveBeenCalled();
  });

  it('scrolls smoothly to a tab that becomes current past the edge', () => {
    render(<WideStrip initial="members" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Search' }));

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ left: 112, behavior: 'smooth' });
  });

  it('scrolls without motion when the reader prefers reduced motion', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)'
    }));
    render(<WideStrip initial="members" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Search' }));

    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ left: 112, behavior: 'instant' });
  });

  it('shows the current tab at once when the tabs arrive after the strip mounts', () => {
    const { rerender } = render(
      <PageTabs current="search" label="Pages" onSelect={() => undefined} tabs={[]} />
    );

    expect(scrollBy).not.toHaveBeenCalled();
    rerender(
      <PageTabs current="search" label="Pages" onSelect={() => undefined} tabs={WIDE_TABS} />
    );
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ left: 112, behavior: 'instant' });
  });

  it('leaves the strip where the reader scrolled it when the same tabs draw again', () => {
    const { rerender } = render(
      <PageTabs current="search" label="Pages" onSelect={() => undefined} tabs={WIDE_TABS} />
    );

    expect(scrollBy).toHaveBeenCalledTimes(1);
    // The reader scrolls back to the start; a new array of the same tabs follows.
    layout.scrollLeft = 0;
    rerender(
      <PageTabs current="search" label="Pages" onSelect={() => undefined} tabs={[...WIDE_TABS]} />
    );
    expect(scrollBy).toHaveBeenCalledTimes(1);
  });

  it('scrolls back to a tab that becomes current behind the start edge', () => {
    layout.scrollLeft = 112;
    render(<WideStrip initial="search" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Members' }));

    // Scrolled to the end, Members starts at -26: 50px short of the clear span.
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ left: -50, behavior: 'smooth' });
  });
});
