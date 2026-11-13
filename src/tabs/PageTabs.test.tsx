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

  it("moves the focus between tabs drawn into another window's document", () => {
    const frame = document.createElement('iframe');
    document.body.append(frame);
    const frameDocument = frame.contentDocument as Document;
    const container = frameDocument.createElement('div');
    frameDocument.body.append(container);

    try {
      render(<Strip initial="overview" onSelect={() => undefined} />, { container });
      const [overview, members] = container.querySelectorAll<HTMLElement>('[role="tab"]');

      overview?.focus();
      fireEvent.keyDown(overview as HTMLElement, { key: 'ArrowRight' });
      expect(frameDocument.activeElement).toBe(members);
    } finally {
      frame.remove();
    }
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

/** Tab widths that differ from 80px, set by a test and cleared before each. */
const widths: Partial<Record<string, number>> = {};

/** A tab's box: 80px wide (or its `widths` entry) from the strip's 6px padding, moved by the strip's scroll. */
function tabBox(id: string): { left: number; right: number } {
  const before = WIDE_TABS.slice(
    0,
    WIDE_TABS.findIndex((tab) => tab.id === id)
  ).reduce((sum, tab) => sum + (widths[tab.id] ?? 80), 0);
  const left = 6 + before - layout.scrollLeft;
  return { left, right: left + (widths[id] ?? 80) };
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
    for (const id of Object.keys(widths)) delete widths[id];
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

  it('draws whole tabs only, leaving out a tab the chevrons would cut', () => {
    applyStylesheets(readStylesheet('src/tabs/tabs.css'));
    render(<WideStrip initial="overview" />);
    const strip = screen.getByRole('tablist');
    const drawn = (): string[] =>
      screen
        .getAllByRole('tab')
        .filter((tab) => !tab.hasAttribute('data-clipped'))
        .map((tab) => tab.dataset.pageTab ?? '');

    // At rest the end chevron takes 276 to 300: Alerts (246 to 326) is not drawn.
    expect(drawn()).toEqual(['overview', 'members', 'settings']);
    const alerts = screen.getByRole('tab', { name: 'Alerts' });
    expect(declaredValues(alerts, 'opacity').at(-1)).toBe('0');
    expect(declaredValues(alerts, 'pointer-events').at(-1)).toBe('none');
    // A tab not drawn stays a tab, in the tab order's reach and the tree.
    expect(alerts.getAttribute('role')).toBe('tab');

    // Scrolled 50px, both chevrons show: Overview (-44 to 36) and Search leave.
    layout.scrollLeft = 50;
    fireEvent.scroll(strip);
    expect(drawn()).toEqual(['members', 'settings', 'alerts']);

    // At the end of the scroll only the start chevron takes room.
    layout.scrollLeft = 112;
    fireEvent.scroll(strip);
    expect(drawn()).toEqual(['settings', 'alerts', 'search']);
    expect(declaredValues(screen.getByRole('tab', { name: 'Settings' }), 'opacity')).toEqual([]);
  });

  it('draws every tab when every tab fits', () => {
    // Three tabs end at 246 of 300.
    layout.scrollWidth = 300;
    render(
      <PageTabs
        current="overview"
        label="Pages"
        onSelect={() => undefined}
        tabs={WIDE_TABS.slice(0, 3)}
      />
    );

    expect(screen.getAllByRole('tab').filter((tab) => tab.hasAttribute('data-clipped'))).toEqual(
      []
    );
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

  it('scrolls at once, never smoothly, to a tab that becomes current past the edge', () => {
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
    expect(scrollBy).toHaveBeenCalledExactlyOnceWith({ left: -50, behavior: 'instant' });
  });

  it('shows a chevron at each edge that hides tabs, which pages the strip toward it', () => {
    applyStylesheets(readStylesheet('src/tabs/tabs.css'));
    const { container } = render(<WideStrip initial="overview" />);
    const strip = screen.getByRole('tablist');
    const more = (side: 'start' | 'end'): HTMLElement =>
      container.querySelector(`.page-tabs-more.${side}`) as HTMLElement;
    const shown = (side: 'start' | 'end'): string | undefined =>
      declaredValues(more(side), 'display').at(-1);

    expect([shown('start'), shown('end')]).toEqual(['none', 'flex']);
    // Kept from the tab order and the accessibility tree; the arrows reach every tab.
    expect(more('end').tabIndex).toBe(-1);
    expect(more('end').getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryAllByRole('button')).toEqual([]);

    // Pages by whole tabs: Alerts, the first tab not drawn, comes to rest at
    // the start chevron's inner edge (246 less 24).
    layout.scrollWidth = 600;
    fireEvent.click(more('end'));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 222, behavior: 'instant' });

    layout.scrollWidth = 412;
    layout.scrollLeft = 112;
    fireEvent.scroll(strip);
    expect([shown('start'), shown('end')]).toEqual(['flex', 'none']);
    // Members (-26 to 54) is the last tab not drawn at the start; the earliest
    // tab start that keeps it whole is Overview's, the strip's own start.
    fireEvent.click(more('start'));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -112, behavior: 'instant' });
  });

  it('pages back so the tab before the drawn ones ends the strip whole', () => {
    layout.scrollWidth = 900;
    layout.scrollLeft = 340;
    render(<WideStrip initial="search" />);
    const strip = screen.getByRole('tablist');

    fireEvent.scroll(strip);
    scrollBy.mockClear();
    // Tabs start at -334, -254, -174, -94, -14: Search (-14 to 66) is cut by
    // the start chevron. The clear span is 252px, so Settings' start (-174) is
    // the earliest that keeps Search whole: Settings rests at 24, Search ends at 264.
    fireEvent.click(strip.parentElement?.querySelector('.page-tabs-more.start') as HTMLElement);
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -198, behavior: 'instant' });
  });

  it('brings in a tab past the end edge by a tab start, where the strip’s snap keeps it', () => {
    layout.scrollWidth = 600;
    render(<WideStrip initial="overview" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Alerts' }));

    // Alerts ends 50px past the clear span; Members' start, 62px on, is the
    // first tab start that clears it, so the strip rests there, not at 50.
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 62, behavior: 'instant' });
  });

  it('draws a tab wider than the clear span cut, and pages past it', () => {
    // Members is 400px: it can never lie whole in the 252px between the
    // chevrons. Tabs: Overview 6 to 86, Members 86 to 486, Settings 486 to 566.
    widths.members = 400;
    layout.scrollWidth = 732;
    const { container } = render(<WideStrip initial="overview" />);
    const strip = screen.getByRole('tablist');
    const members = screen.getByRole('tab', { name: 'Members' });
    const more = (side: 'start' | 'end'): HTMLElement =>
      container.querySelector(`.page-tabs-more.${side}`) as HTMLElement;

    expect(members.hasAttribute('data-clipped')).toBe(false);
    expect(screen.getByRole('tab', { name: 'Settings' }).hasAttribute('data-clipped')).toBe(true);

    // Paging toward the end brings Members' start to the chevron's inner edge.
    fireEvent.click(more('end'));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 62, behavior: 'instant' });

    // With Members' start there, the next page passes it for Settings,
    // as far as the scroll goes (732 less 300, from 62).
    layout.scrollLeft = 62;
    fireEvent.scroll(strip);
    expect(members.hasAttribute('data-clipped')).toBe(false);
    fireEvent.click(more('end'));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: 370, behavior: 'instant' });

    // At the end Members (-346 to 54) still crosses the clear span, so it is
    // drawn; paging back rests on its start, not on Settings' after it.
    layout.scrollLeft = 432;
    fireEvent.scroll(strip);
    expect(members.hasAttribute('data-clipped')).toBe(false);
    fireEvent.click(more('start'));
    expect(scrollBy).toHaveBeenLastCalledWith({ left: -370, behavior: 'instant' });
  });

  it('always comes to rest on a snap position, so no tab rests cut in the clear span', () => {
    applyStylesheets(readStylesheet('src/tabs/tabs.css'));
    render(<WideStrip initial="overview" />);

    expect(declaredValues(screen.getByRole('tablist'), 'scroll-snap-type')).toEqual([
      'x mandatory'
    ]);
    expect(declaredValues(screen.getAllByRole('tab')[0] as Element, 'scroll-snap-align')).toEqual([
      'start'
    ]);
  });
});
