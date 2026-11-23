import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { applyStylesheets, declaredValues, readStylesheet } from '../../test/stylesheets.js';
import type { PaneTabsLabels } from '../labels/paneTabs.js';
import { UiokProvider } from '../labels/UiokProvider.js';
import { PaneTabs, type PaneTabItem, type PaneTabsProps } from './PaneTabs.js';

const TABS: readonly PaneTabItem[] = [
  { id: 'shop', name: 'shop', pinned: true, tip: 'prod / shop' },
  { id: 'orders', name: 'orders', context: 'shop', dirty: true, tone: 'danger' },
  { id: 'archive', name: 'orders', context: 'shop_archive' },
  { id: 'customers', name: 'customers', tip: 'prod / shop / customers' },
  { id: 'payments', name: 'payment_attempts', following: true },
  { id: 'events', name: 'events', closable: false }
];

const noop = (): void => undefined;

function strip(props: Partial<PaneTabsProps> = {}) {
  const handlers = {
    onSelect: vi.fn(),
    onClose: vi.fn(),
    onPick: vi.fn(),
    onKeep: vi.fn(),
    onReorder: vi.fn(),
    onNew: vi.fn()
  };
  const view = render(
    <div className="listing-root">
      <div className="pane active">
        <PaneTabs front="customers" label="Main tabs" tabs={TABS} {...handlers} {...props} />
      </div>
    </div>
  );

  return { ...handlers, ...view };
}

const tab = (name: string | RegExp) => screen.getByRole('tab', { name });

/** The pointer's close control of the tab named `name`, hidden from assistive technology. */
const closeOf = (name: string): HTMLElement =>
  box(name).querySelector(':scope > .pane-tab-close') as HTMLElement;

/** The box that draws the tab named `name`: its classes, data, and presses. */
const box = (name: string | RegExp) => tab(name).closest('.pane-tab') as HTMLElement;

/** Whether `element` wears the class `name`. */
const has = (element: Element | null, name: string): boolean =>
  element?.classList.contains(name) ?? false;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('PaneTabs', () => {
  it('shows a cut tab’s whole words in a tooltip while the strip cuts them, unless its tip names it', () => {
    applyStylesheets(readStylesheet('src/styles.css'));
    const { container } = strip();
    const label = (id: string) =>
      container.querySelector(`[data-pane-tab="${id}"] .pane-tab-label`) as HTMLElement;
    const context = label('archive').querySelector('.pane-tab-context') as HTMLElement;
    const name = label('archive').querySelector('.pane-tab-name') as HTMLElement;

    for (const part of [context, name]) {
      expect(part.dataset.tooltip).toBe('shop_archive/orders');
      expect(part.hasAttribute('data-tooltip-cut')).toBe(true);
      // Each is the box that cuts its words.
      expect(declaredValues(part, 'overflow').at(-1)).toBe('hidden');
      expect(declaredValues(part, 'text-overflow').at(-1)).toBe('ellipsis');
    }
    expect(label('payments').querySelector('.pane-tab-name')?.getAttribute('data-tooltip')).toBe(
      'payment_attempts'
    );
    // A tip already names the tab whole, at every width.
    expect(label('customers').querySelector('[data-tooltip]')).toBeNull();
  });

  it('draws a named tablist of tabs that take no focus, the front one selected', () => {
    strip();

    const list = screen.getByRole('tablist', { name: 'Main tabs' });
    const tabs = within(list).getAllByRole('tab');

    expect(tabs.map((element) => element.getAttribute('aria-label'))).toEqual([
      'shop',
      'shop/orders',
      'shop_archive/orders',
      'customers',
      'payment_attempts',
      'events'
    ]);
    expect(tab('customers').getAttribute('aria-selected')).toBe('true');
    expect(has(box('customers'), 'active')).toBe(true);
    expect(tab('shop').getAttribute('aria-selected')).toBe('false');
    expect(tabs.every((element) => !element.hasAttribute('tabindex'))).toBe(true);
  });

  it('marks each state with its class and describes the tip, pin, and unsaved changes', () => {
    strip();

    expect(has(box('payment_attempts'), 'following')).toBe(true);
    expect(has(box('shop/orders'), 'dirty')).toBe(true);
    expect(box('shop/orders').getAttribute('data-tone')).toBe('danger');
    expect(tab('shop/orders').getAttribute('aria-description')).toBe('Changes not saved');
    expect(has(box('shop'), 'pinned')).toBe(true);
    expect(tab('shop').getAttribute('aria-description')).toBe('prod / shop, Pinned');
    expect(box('customers').getAttribute('data-tooltip')).toBe('prod / shop / customers');
    expect(has(box('shop').nextElementSibling, 'pane-pin-rule')).toBe(true);
    expect(box('shop').querySelector('.pane-tab-close')).toBeNull();
    expect(box('events').querySelector('.pane-tab-close')).toBeNull();
    expect(box('shop_archive/orders').style.getPropertyValue('--pane-tab-floor')).toBe('11ch');
  });

  it('holds no control inside a tab, its close control beside the tab in the box', () => {
    strip();
    const tabs = screen.getAllByRole('tab');
    const interactive =
      'button, a[href], input, select, textarea, [tabindex], [contenteditable], [role="button"], [role="link"], [role="menuitem"], [role="checkbox"], [role="switch"]';

    expect(tabs.length).toBeGreaterThan(0);
    for (const each of tabs) {
      expect(
        each.querySelectorAll(interactive),
        each.getAttribute('aria-label') ?? ''
      ).toHaveLength(0);
      // Between the tab and its tab list stands only presentation, so the list still owns it.
      expect(each.parentElement?.getAttribute('role')).toBe('presentation');
      expect(each.parentElement?.parentElement?.getAttribute('role')).toBe('tablist');
    }

    // Hidden from assistive technology: a tab list owns tabs alone.
    const close = closeOf('customers');

    expect(close.closest('[role="tab"]')).toBeNull();
    expect(close.parentElement).toBe(box('customers'));
    expect(close.tabIndex).toBe(-1);
    // The tab list's only children a screen reader meets are its tabs.
    expect(close.getAttribute('aria-hidden')).toBe('true');
    expect(screen.queryAllByRole('button', { name: /^Close / })).toEqual([]);
  });

  it('names its close and New Tab buttons from the labels, New Tab with its chord', () => {
    const { onClose, onSelect } = strip();

    fireEvent.click(closeOf('customers'));
    expect(onClose).toHaveBeenCalledWith('customers');
    expect(onSelect).not.toHaveBeenCalled();

    const newTab = screen.getByRole('button', { name: 'New Tab' });

    expect(newTab.getAttribute('data-tooltip-chord')).toBe(
      JSON.stringify({ key: 't', meta: true })
    );
  });

  it('draws no New Tab button without onNew', () => {
    strip({ onNew: undefined });

    expect(screen.queryByRole('button', { name: 'New Tab' })).toBeNull();
  });

  it('reads its words from UiokProvider', () => {
    render(
      <UiokProvider
        labels={{ paneTabs: { newTab: 'Neuer Tab', close: (name) => `${name} schließen` } }}
      >
        <div className="listing-root">
          <PaneTabs
            front="a"
            label="Tabs"
            onClose={noop}
            onNew={noop}
            onSelect={noop}
            tabs={[{ id: 'a', name: 'a' }]}
          />
        </div>
      </UiokProvider>
    );

    expect(screen.getByRole('button', { name: 'Neuer Tab' })).toBeTruthy();
    expect(document.querySelector('[aria-label="a schließen"]') as HTMLElement).toBeTruthy();
  });

  it('brings a pressed tab to the front, and leaves the front tab alone', () => {
    const { onSelect } = strip();

    fireEvent.pointerDown(tab('shop/orders'), { button: 0, clientX: 10 });
    fireEvent.pointerUp(window);
    fireEvent.pointerDown(tab('customers'), { button: 0, clientX: 10 });
    fireEvent.pointerUp(window);

    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith('orders');
  });

  it('picks with ⌘ and ⇧ presses instead of selecting', () => {
    const { onPick, onSelect } = strip();

    fireEvent.pointerDown(tab('shop/orders'), { button: 0, metaKey: true });
    fireEvent.pointerDown(tab('events'), { button: 0, shiftKey: true });

    expect(onPick.mock.calls).toEqual([
      ['orders', 'toggle'],
      ['events', 'run']
    ]);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes on a middle click, but not a tab without a close control', () => {
    const { onClose } = strip();

    fireEvent(tab('shop/orders'), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    fireEvent(tab('shop'), new MouseEvent('auxclick', { bubbles: true, button: 1 }));
    fireEvent(tab('events'), new MouseEvent('auxclick', { bubbles: true, button: 1 }));

    expect(onClose.mock.calls).toEqual([['orders']]);
  });

  it('keeps a tab on a double-click and opens a new one on the empty end', () => {
    const { onKeep, onNew, container } = strip();

    fireEvent.doubleClick(tab('payment_attempts'));
    fireEvent.doubleClick(container.querySelector('.pane-tabs-rest') as Element);

    expect(onKeep).toHaveBeenCalledWith('payments');
    expect(onNew).toHaveBeenCalledTimes(1);
  });

  it('names a picked tab as picked and wears the picked look', () => {
    strip({ picked: ['archive'] });

    expect(has(box('shop_archive/orders, picked'), 'picked')).toBe(true);
    expect(has(box('customers'), 'picked')).toBe(false);
  });

  it('hands its secondary click to the host', () => {
    const onTabContextMenu = vi.fn();

    strip({ onTabContextMenu });
    fireEvent.contextMenu(tab('events'));

    expect(onTabContextMenu).toHaveBeenCalledWith('events', expect.anything());
  });

  it('draws trailing content at the strip end', () => {
    strip({ trailing: <button type="button">Update</button> });

    expect(
      has(screen.getByRole('button', { name: 'Update' }).parentElement, 'pane-tabs-trailing')
    ).toBe(true);
  });
});

/** Lays tabs out in a row as a browser would: each `width` wide, no gap, the strip `room` wide. */
function layout(room: number, width = 100): void {
  const place = (element: HTMLElement): number => {
    const strip = element.closest('.pane-tabs');

    return strip === null ? 0 : [...strip.children].indexOf(element) * width;
  };

  vi.spyOn(HTMLElement.prototype, 'offsetLeft', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('pane-tab') ? place(this) : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
    this: HTMLElement
  ) {
    return this.classList.contains('pane-tab') ? width : 0;
  });
  vi.spyOn(HTMLElement.prototype, 'offsetParent', 'get').mockImplementation(() => document.body);
  vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (this: Element) {
    const element = this as HTMLElement;
    const left = element.classList.contains('pane-tab') ? place(element) : 0;
    const boxWidth = element.classList.contains('pane-tabs')
      ? room
      : element.classList.contains('pane-tab') || element.classList.contains('pane-pin-rule')
        ? element.classList.contains('pane-pin-rule')
          ? 0
          : width
        : 0;

    return {
      left,
      right: left + boxWidth,
      top: 0,
      bottom: 0,
      width: boxWidth,
      height: 0,
      x: left,
      y: 0,
      toJSON: noop
    } as DOMRect;
  });
}

const PLAIN: readonly PaneTabItem[] = ['a', 'b', 'c', 'd', 'e', 'f'].map((id) => ({
  id,
  name: id
}));

describe('PaneTabs dragging', () => {
  it('reorders a dragged tab past half its neighbour and reports the full order on release', () => {
    layout(1000);
    const { onReorder, onSelect } = strip({ front: 'a', tabs: PLAIN });

    fireEvent.pointerDown(tab('b'), { button: 0, clientX: 150 });
    expect(onSelect).toHaveBeenCalledWith('b');
    act(() => {
      fireEvent.pointerMove(window, { clientX: 152 });
    });
    expect(has(box('b'), 'dragging')).toBe(false);
    act(() => {
      fireEvent.pointerMove(window, { clientX: 160 });
    });
    expect(has(box('b'), 'dragging')).toBe(true);
    act(() => {
      fireEvent.pointerMove(window, { clientX: 220 });
    });
    act(() => {
      fireEvent.pointerUp(window);
    });

    expect(onReorder).toHaveBeenCalledWith(['a', 'c', 'b', 'd', 'e', 'f']);
    expect(has(box('b'), 'dragging')).toBe(false);
  });

  it('puts every tab back on Escape and reports nothing', () => {
    layout(1000);
    const { onReorder } = strip({ front: 'a', tabs: PLAIN });

    fireEvent.pointerDown(tab('b'), { button: 0, clientX: 150 });
    act(() => {
      fireEvent.pointerMove(window, { clientX: 160 });
      fireEvent.pointerMove(window, { clientX: 260 });
    });
    const escape = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    act(() => {
      window.dispatchEvent(escape);
    });
    expect(escape.defaultPrevented).toBe(true);

    // The Escape that cancelled is the drag's until it comes up, repeats included.
    const repeat = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });

    window.dispatchEvent(repeat);
    expect(repeat.defaultPrevented).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'Escape' }));
    act(() => {
      fireEvent.pointerUp(window);
    });

    expect(onReorder).not.toHaveBeenCalled();
    expect(screen.getAllByRole('tab').map((element) => element.textContent)).toEqual(
      PLAIN.map((item) => item.id)
    );
  });

  it('puts every tab back when the pointer is cancelled, and reports nothing', () => {
    layout(1000);
    const { onReorder } = strip({ front: 'a', tabs: PLAIN });

    fireEvent.pointerDown(tab('b'), { button: 0, clientX: 150 });
    act(() => {
      fireEvent.pointerMove(window, { clientX: 160 });
      fireEvent.pointerMove(window, { clientX: 260 });
    });
    act(() => {
      fireEvent.pointerCancel(window);
    });
    act(() => {
      fireEvent.pointerUp(window);
    });

    expect(onReorder).not.toHaveBeenCalled();
    expect(has(box('b'), 'dragging')).toBe(false);
    expect(screen.getAllByRole('tab').map((element) => element.textContent)).toEqual(
      PLAIN.map((item) => item.id)
    );
  });

  it('stops an unpinned tab at the pin rule', () => {
    layout(1000);
    const tabs = [{ id: 'p', name: 'p', pinned: true }, ...PLAIN.slice(0, 3)];
    const { onReorder } = strip({ front: 'a', tabs });

    fireEvent.pointerDown(tab('b'), { button: 0, clientX: 350 });
    act(() => {
      fireEvent.pointerMove(window, { clientX: 340 });
      fireEvent.pointerMove(window, { clientX: 0 });
    });
    act(() => {
      fireEvent.pointerUp(window);
    });

    expect(onReorder).toHaveBeenCalledWith(['p', 'b', 'a', 'c']);
  });

  it('carries picked tabs together round the held one', () => {
    layout(1000);
    const { onReorder, onSelect } = strip({ front: 'a', tabs: PLAIN, picked: ['c'] });

    fireEvent.pointerDown(tab('c, picked'), { button: 0, clientX: 250 });
    expect(onSelect).not.toHaveBeenCalled();
    act(() => {
      fireEvent.pointerMove(window, { clientX: 260 });
    });
    act(() => {
      fireEvent.pointerMove(window, { clientX: 600 });
    });
    act(() => {
      fireEvent.pointerUp(window);
    });

    expect(onReorder).toHaveBeenCalledWith(['b', 'd', 'e', 'f', 'a', 'c']);
  });

  it('selects a picked tab on a release without a drag', () => {
    layout(1000);
    const { onReorder, onSelect } = strip({ front: 'a', tabs: PLAIN, picked: ['c'] });

    fireEvent.pointerDown(tab('c, picked'), { button: 0, clientX: 250 });
    fireEvent.pointerUp(window);

    expect(onSelect).toHaveBeenCalledWith('c');
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe('PaneTabs folding', () => {
  const FOLDING: readonly PaneTabItem[] = [
    { id: 'a', name: 'a', mark: <span data-testid="mark-a" /> },
    { id: 'b', name: 'b', dirty: true, tone: 'danger' },
    { id: 'c', name: 'c' },
    { id: 'd', name: 'd', context: 'db' },
    { id: 'e', name: 'e' },
    { id: 'f', name: 'f' }
  ];

  it('takes a tab strip label group written whole before the count had a name of its own', () => {
    // A group typed as 0.7.0 shaped it, which `pnpm run typecheck` compiles:
    // the count's name is optional, its English words standing in.
    const before: PaneTabsLabels = {
      newTab: 'Neuer Tab',
      close: (name) => `${name} schließen`,
      picked: (name) => `${name}, ausgewählt`,
      pinned: 'Angeheftet',
      notSaved: 'Nicht gesichert',
      folded: (count) => `${count} Tabs hier eingeklappt`,
      foldedHeading: 'Hier eingeklappt'
    };

    layout(350);
    render(
      <UiokProvider labels={{ paneTabs: before }}>
        <div className="listing-root">
          <div className="pane active">
            <PaneTabs front="e" label="Main tabs" onClose={noop} onSelect={noop} tabs={FOLDING} />
          </div>
        </div>
      </UiokProvider>
    );

    expect(
      screen.getByRole('button', { name: '3 more tabs' }).getAttribute('aria-description')
    ).toBe('3 Tabs hier eingeklappt');
  });

  it('folds the tabs farthest from the front one into a count with a menu', () => {
    layout(350);
    const { onSelect } = strip({ front: 'e', tabs: FOLDING });

    expect(screen.getAllByRole('tab').map((element) => element.textContent)).toEqual([
      'db/d',
      'e',
      'f'
    ]);

    const count = screen.getByRole('button', { name: '3 more tabs' });

    expect(count.getAttribute('aria-haspopup')).toBe('menu');
    expect(count.getAttribute('aria-expanded')).toBe('false');
    expect(count.textContent).toContain('+3');
    expect(count.getAttribute('aria-description')).toBe(
      '3 tabs folded here, 1 with changes not saved'
    );
    expect(count.querySelector('.pane-tab-dirty')).not.toBeNull();

    count.focus();
    fireEvent.click(count);

    const menu = screen.getByRole('menu', { name: 'Folded here' });

    expect(count.getAttribute('aria-expanded')).toBe('true');
    expect(menu.hasAttribute('data-overlay')).toBe(true);
    expect(document.activeElement).toBe(menu);
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.getAttribute('aria-label'))
    ).toEqual(['a', 'b', 'c']);
    expect(within(menu).getByTestId('mark-a')).toBeTruthy();
    expect(within(menu).getByRole('menuitem', { name: 'b' }).getAttribute('aria-description')).toBe(
      'Changes not saved'
    );

    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    fireEvent.keyDown(menu, { key: 'Enter' });

    expect(onSelect).toHaveBeenCalledWith('b');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(count);
  });

  it('scrolls the row the keys move to into view, and describes a row by its tip', () => {
    layout(350);
    const scrolled: Element[] = [];

    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value(this: Element) {
        scrolled.push(this);
      }
    });

    try {
      strip({
        front: 'e',
        tabs: FOLDING.map((item) => (item.id === 'c' ? { ...item, tip: 'local / c' } : item))
      });
      fireEvent.click(screen.getByRole('button', { name: /^\d+ more tabs?$/ }));

      const menu = screen.getByRole('menu');

      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      fireEvent.keyDown(menu, { key: 'ArrowDown' });

      const c = within(menu).getByRole('menuitem', { name: 'c' });

      expect(scrolled.at(-1)).toBe(c);
      expect(c.getAttribute('aria-description')).toBe('local / c');
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('opens its menu over the count when the window has no room below', () => {
    layout(350);
    strip({ front: 'e', tabs: FOLDING });

    const count = screen.getByRole('button', { name: /^\d+ more tabs?$/ });
    const at = (top: number): DOMRect =>
      ({ top, bottom: top + 20, left: 0, right: 40, width: 40, height: 20 }) as DOMRect;

    vi.spyOn(count, 'getBoundingClientRect').mockReturnValue(at(350));
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(200);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(400);
    fireEvent.click(count);
    expect(screen.getByRole('menu').style.top).toBe('150px');

    fireEvent.click(count);
    vi.spyOn(count, 'getBoundingClientRect').mockReturnValue(at(40));
    fireEvent.click(count);
    expect(screen.getByRole('menu').style.top).toBe('60px');
  });

  it('closes its menu when the window changes size, the focus back on the count', () => {
    layout(350);
    const { onSelect } = strip({ front: 'e', tabs: FOLDING });
    const count = screen.getByRole('button', { name: /^\d+ more tabs?$/ });

    count.focus();
    fireEvent.click(count);
    expect(screen.getByRole('menu')).toBeTruthy();
    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(count);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('closes its menu on Escape and hands the focus back to the count', () => {
    layout(350);
    const { onSelect } = strip({ front: 'e', tabs: FOLDING });
    const count = screen.getByRole('button', { name: /^\d+ more tabs?$/ });

    count.focus();
    fireEvent.click(count);
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });

    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(count);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('never folds the following or pinned tabs', () => {
    layout(350);
    strip({
      front: 'e',
      tabs: [
        { id: 'p', name: 'p', pinned: true },
        { id: 'a', name: 'a', following: true },
        ...FOLDING.slice(1)
      ]
    });

    expect(screen.getAllByRole('tab').map((element) => element.textContent)).toEqual(
      expect.arrayContaining(['p', 'a', 'e'])
    );
  });

  it('shows no count while every tab fits', () => {
    layout(1000);
    strip({ front: 'e', tabs: FOLDING });

    expect(screen.queryByRole('button', { name: /^\d+ more tabs?$/ })).toBeNull();
  });
});
