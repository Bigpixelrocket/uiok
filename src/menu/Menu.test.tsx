import { act, fireEvent, render, screen } from '@testing-library/react';
import { Copy, Trash2 } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { isNativeKeyboardTarget } from '../keyboard/Keyboard.logic.js';
import { Menu, type MenuEntry, type MenuSubmenuEntry } from './Menu.js';

const ENTRIES: readonly MenuEntry[] = [
  { id: 'copy', label: 'Copy Path', icon: Copy, chord: { key: 'c', meta: true, alt: true } },
  { id: 'stop', label: 'Stop', disabled: true, tip: 'Not running' },
  { kind: 'separator' },
  { kind: 'heading', label: 'Danger' },
  { id: 'remove', label: 'Remove…', icon: Trash2, danger: true },
  { id: 'menu-bar', label: 'Show in Menu Bar', checked: true }
];

function open(props: Partial<Parameters<typeof Menu>[0]> = {}) {
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <Menu
      at={{ x: 10, y: 20 }}
      entries={ENTRIES}
      label="Actions"
      onClose={onClose}
      onPick={onPick}
      {...props}
    />
  );
  return { menu: screen.getByRole('menu', { name: 'Actions' }), onPick, onClose };
}

describe('Menu', () => {
  it('lists its items with their chords, a separator, a heading, a danger row, and a checked one', () => {
    const { menu } = open();

    expect(menu.parentElement).toBe(document.body);
    expect(document.activeElement).toBe(menu);
    expect(menu.hasAttribute('data-overlay')).toBe(true);
    expect(menu.style.left).toBe('10px');
    expect(menu.style.top).toBe('20px');
    expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
      expect.stringContaining('Copy Path'),
      'Stop',
      'Remove…'
    ]);
    expect(screen.getByRole('menuitem', { name: /Copy Path/ }).querySelector('.keychord')).not.toBe(
      null
    );
    expect(screen.getByRole('separator')).toBeTruthy();
    expect(screen.getByText('Danger').className).toBe('entry-menu-heading');
    expect(screen.getByRole('menuitem', { name: 'Remove…' }).className).toContain('danger');
    expect(
      screen
        .getByRole('menuitemcheckbox', { name: 'Show in Menu Bar' })
        .getAttribute('aria-checked')
    ).toBe('true');
    expect(screen.getByRole('menuitem', { name: 'Stop' }).getAttribute('aria-description')).toBe(
      'Not running'
    );
  });

  it('moves the cursor over the items that run, runs it on Return, and closes on Escape', () => {
    const { menu, onPick, onClose } = open();
    const cursor = () => menu.querySelector('.cursor')?.textContent;

    expect(cursor()).toContain('Copy Path');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(cursor()).toBe('Remove…');
    fireEvent.keyDown(menu, { key: 'End' });
    expect(cursor()).toBe('Show in Menu Bar');
    fireEvent.keyDown(menu, { key: 'Home' });
    expect(cursor()).toContain('Copy Path');
    fireEvent.keyDown(menu, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith('copy');
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledWith('keyboard');
  });

  it('runs an item on a click, refuses a disabled one, and closes on a press outside', () => {
    const { onPick, onClose } = open();

    fireEvent.click(screen.getByRole('menuitem', { name: 'Stop' }));
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Remove…' }));
    expect(onPick).toHaveBeenCalledWith('remove');
    fireEvent.mouseDown(document.body);
    expect(onClose).toHaveBeenCalledWith('pointer');
  });

  it('starts on the item given, drops from its anchor, and leaves a press on the anchor alone', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    anchor.getBoundingClientRect = () =>
      ({ left: 40, top: 10, right: 90, bottom: 30, width: 50, height: 20 }) as DOMRect;
    const { menu, onClose } = open({
      at: undefined,
      anchor,
      initial: 'remove',
      entries: ENTRIES.map((entry) =>
        'id' in entry && entry.id === 'remove' ? { ...entry, current: 'Shown' } : entry
      )
    });

    expect(menu.querySelector('.cursor')?.textContent?.trim()).toBe('Remove…');
    expect(screen.getByRole('img', { name: 'Shown' })).toBeTruthy();
    expect(menu.style.left).toBe('40px');
    expect(menu.style.top).toBe('34px');
    fireEvent.mouseDown(anchor);
    expect(onClose).not.toHaveBeenCalled();
    anchor.remove();
  });

  it('names each item by its label, then its current mark’s and its chord’s words, apart', () => {
    open({
      entries: ENTRIES.map((entry) =>
        'id' in entry && entry.id === 'remove' ? { ...entry, current: 'Shown' } : entry
      )
    });

    expect(screen.getByRole('menuitem', { name: 'Copy Path Option Command C' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Remove… Shown' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'Stop' })).toBeTruthy();
  });

  it("keeps the page's own keys out while open, as every surface that holds its keys does", () => {
    const { menu } = open();

    expect(isNativeKeyboardTarget(menu)).toBe(true);
    expect(isNativeKeyboardTarget(menu.querySelector('[role="menuitem"]'))).toBe(true);
  });

  it("stays inside the window when the window shrinks, its cursor's item in view and the focus kept", () => {
    const height = window.innerHeight;
    const shown: string[] = [];
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: function (this: HTMLElement) {
        shown.push(this.textContent ?? '');
      }
    });
    try {
      const { menu } = open({ at: { x: 10, y: 400 }, initial: 'remove' });
      const item = screen.getByRole('menuitem', { name: /Copy Path/ });

      expect(menu.style.top).toBe('400px');
      expect(shown).toEqual(['Remove…']);
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: 300 });
      fireEvent(window, new Event('resize'));
      // jsdom measures the menu as no height, so it stands a margin above the window's end.
      expect(menu.style.top).toBe('296px');
      // The resize may have hidden the cursor's item, so it is brought back into view.
      expect(shown).toEqual(['Remove…', 'Remove…']);
      expect(document.activeElement).toBe(menu);
      expect(item.isConnected).toBe(true);
    } finally {
      Object.defineProperty(window, 'innerHeight', { configurable: true, value: height });
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it("scrolls the cursor's item into view when it opens and when the keys move it", () => {
    const shown: string[] = [];
    const scrollIntoView = vi.fn(function (this: HTMLElement) {
      shown.push(this.textContent ?? '');
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView
    });
    try {
      const { menu } = open({ initial: 'remove' });

      expect(shown).toEqual(['Remove…']);
      fireEvent.keyDown(menu, { key: 'End' });
      expect(shown.at(-1)).toBe('Show in Menu Bar');
      expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
      // A pointer's move is already in view and scrolls nothing.
      fireEvent.mouseMove(screen.getByRole('menuitem', { name: /Copy Path/ }));
      expect(scrollIntoView).toHaveBeenCalledTimes(2);
    } finally {
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });
});

describe("Menu's submenu", () => {
  const COPY_AS: MenuSubmenuEntry = {
    kind: 'submenu',
    id: 'copy-as',
    label: 'Copy As',
    icon: Copy,
    entries: [
      { id: 'copy-path', label: 'Path' },
      { id: 'copy-url', label: 'File URL', disabled: true },
      { id: 'copy-name', label: 'Name' }
    ]
  };
  const ROW_MENU: readonly MenuEntry[] = [
    { id: 'open', label: 'Open' },
    COPY_AS,
    { kind: 'separator' },
    { id: 'remove', label: 'Remove…', icon: Trash2, danger: true }
  ];
  const menuNamed = (name: string) => screen.getByRole('menu', { name });
  const cursorOf = (menu: HTMLElement) => menu.querySelector('.cursor')?.textContent;

  afterEach(() => {
    vi.useRealTimers();
  });

  it('opens on → with the keys and its first item that can run, and ← goes back to its item', () => {
    const { menu, onPick } = open({ entries: ROW_MENU });
    const item = screen.getByRole('menuitem', { name: 'Copy As' });

    expect(item.getAttribute('aria-haspopup')).toBe('menu');
    expect(item.getAttribute('aria-expanded')).toBe('false');
    fireEvent.keyDown(menu, { key: 'ArrowDown' });
    expect(cursorOf(menu)).toBe('Copy As');
    fireEvent.keyDown(menu, { key: 'ArrowRight' });

    // The submenu is named by its item, which says it is open and which menu it opened.
    const submenu = menuNamed('Copy As');
    expect(submenu.getAttribute('aria-labelledby')).toBe(item.id);
    expect(item.getAttribute('aria-expanded')).toBe('true');
    expect(item.getAttribute('aria-controls')).toBe(submenu.id);
    expect(document.activeElement).toBe(submenu);
    expect(cursorOf(submenu)).toBe('Path');
    expect(submenu.getAttribute('aria-activedescendant')).toBe(
      screen.getByRole('menuitem', { name: 'Path' }).id
    );

    // ↓ passes over the disabled item; Return runs the cursor's.
    fireEvent.keyDown(submenu, { key: 'ArrowDown' });
    expect(cursorOf(submenu)).toBe('Name');
    fireEvent.keyDown(submenu, { key: 'Enter' });
    expect(onPick).toHaveBeenCalledWith('copy-name');

    fireEvent.keyDown(submenu, { key: 'ArrowLeft' });
    expect(screen.queryByRole('menu', { name: 'Copy As' })).toBe(null);
    expect(document.activeElement).toBe(menu);
    expect(cursorOf(menu)).toBe('Copy As');
    expect(item.getAttribute('aria-expanded')).toBe('false');
  });

  it('opens on Return and Space too, and runs nothing for its item', () => {
    const { menu, onPick } = open({ entries: ROW_MENU, initial: 'copy-as' });

    fireEvent.keyDown(menu, { key: 'Enter' });
    expect(document.activeElement).toBe(menuNamed('Copy As'));
    fireEvent.keyDown(menuNamed('Copy As'), { key: 'ArrowLeft' });
    fireEvent.keyDown(menu, { key: ' ' });
    expect(document.activeElement).toBe(menuNamed('Copy As'));
    expect(onPick).not.toHaveBeenCalled();
  });

  it('closes one level on Escape, and the whole menu on a second Escape or on Tab', () => {
    const { menu, onClose } = open({ entries: ROW_MENU, initial: 'copy-as' });

    fireEvent.keyDown(menu, { key: 'ArrowRight' });
    fireEvent.keyDown(menuNamed('Copy As'), { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu', { name: 'Copy As' })).toBe(null);
    expect(document.activeElement).toBe(menu);
    fireEvent.keyDown(menu, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledWith('keyboard');

    onClose.mockClear();
    fireEvent.keyDown(menu, { key: 'ArrowRight' });
    fireEvent.keyDown(menuNamed('Copy As'), { key: 'Tab' });
    expect(onClose).toHaveBeenCalledWith('keyboard');
  });

  it('opens for the pointer resting on its item or pressing it, and the pointer in it takes the keys', () => {
    const { menu, onPick, onClose } = open({ entries: ROW_MENU });
    const item = screen.getByRole('menuitem', { name: 'Copy As' });

    fireEvent.mouseMove(item);
    const submenu = menuNamed('Copy As');
    // Shown for the pointer: the keys and the focus stay in the menu, and no item is the cursor.
    expect(document.activeElement).toBe(menu);
    expect(cursorOf(submenu)).toBe(undefined);
    expect(cursorOf(menu)).toBe('Copy As');

    fireEvent.mouseMove(screen.getByRole('menuitem', { name: 'Name' }));
    expect(document.activeElement).toBe(submenu);
    expect(cursorOf(submenu)).toBe('Name');
    fireEvent.keyDown(submenu, { key: 'ArrowUp' });
    expect(cursorOf(submenu)).toBe('Path');

    // A press inside the submenu is the menu's own, and its items run on a click.
    fireEvent.mouseDown(submenu);
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'File URL' }));
    expect(onPick).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('menuitem', { name: 'Path' }));
    expect(onPick).toHaveBeenCalledWith('copy-path');

    // A press on its item opens it too, and runs nothing.
    fireEvent.keyDown(submenu, { key: 'Escape' });
    fireEvent.click(item);
    expect(menuNamed('Copy As')).toBeTruthy();
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it('stays open while the pointer crosses another item on its way in, and gives way once it rests', () => {
    vi.useFakeTimers();
    const { menu } = open({ entries: ROW_MENU });

    fireEvent.mouseMove(screen.getByRole('menuitem', { name: 'Copy As' }));
    fireEvent.mouseMove(screen.getByRole('menuitem', { name: 'Remove…' }));
    expect(menuNamed('Copy As')).toBeTruthy();
    // Reaching the submenu keeps it.
    fireEvent.mouseMove(screen.getByRole('menuitem', { name: 'Path' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(menuNamed('Copy As')).toBeTruthy();

    // Resting on another item hands it the cursor, and the keys back to the menu.
    fireEvent.mouseMove(screen.getByRole('menuitem', { name: 'Open' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(screen.queryByRole('menu', { name: 'Copy As' })).toBe(null);
    expect(cursorOf(menu)).toBe('Open');
    expect(document.activeElement).toBe(menu);
  });

  it('closes when the keys move the cursor off its item, and keeps a disabled one shut', () => {
    const { menu } = open({
      entries: [
        { ...COPY_AS, disabled: true, tip: 'Nothing selected' },
        { id: 'open', label: 'Open' }
      ]
    });
    const item = screen.getByRole('menuitem', { name: 'Copy As' });

    expect(item.getAttribute('aria-disabled')).toBe('true');
    fireEvent.mouseMove(item);
    fireEvent.click(item);
    expect(screen.queryByRole('menu', { name: 'Copy As' })).toBe(null);
    expect(cursorOf(menu)).toBe('Open');

    render(
      <Menu at={{ x: 0, y: 0 }} entries={ROW_MENU} label="Row" onClose={vi.fn()} onPick={vi.fn()} />
    );
    const row = menuNamed('Row');
    fireEvent.mouseMove(screen.getAllByRole('menuitem', { name: 'Copy As' })[1] as HTMLElement);
    expect(menuNamed('Copy As')).toBeTruthy();
    fireEvent.keyDown(row, { key: 'ArrowDown' });
    expect(screen.queryByRole('menu', { name: 'Copy As' })).toBe(null);
    expect(cursorOf(row)).toBe('Remove…');
  });

  it('holds one level of submenus in its types', () => {
    const nested: MenuSubmenuEntry = {
      kind: 'submenu',
      id: 'outer',
      label: 'Outer',
      entries: [
        // @ts-expect-error A submenu holds no submenu: a menu nests one level deep.
        { kind: 'submenu', id: 'inner', label: 'Inner', entries: [] }
      ]
    };

    expect(nested.entries).toHaveLength(1);
  });
});

describe("Menu's submenu as its host changes it", () => {
  const ENTRIES_WITH_SUB: readonly MenuEntry[] = [
    { kind: 'submenu', id: 'sub', label: 'Copy As', entries: [{ id: 'path', label: 'Path' }] },
    { id: 'open', label: 'Open' }
  ];
  const named = (name: string) => screen.getByRole('menu', { name });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('closes on the first Escape once the host disables the expanded item', () => {
    const onClose = vi.fn();
    const mount = (entries: readonly MenuEntry[]) => (
      <Menu
        at={{ x: 100, y: 100 }}
        entries={entries}
        label="Actions"
        onClose={onClose}
        onPick={vi.fn()}
      />
    );
    const { rerender } = render(mount(ENTRIES_WITH_SUB));

    fireEvent.keyDown(named('Actions'), { key: 'ArrowRight' });
    expect(document.activeElement).toBe(named('Copy As'));
    const [copyAs, ...rest] = ENTRIES_WITH_SUB as [MenuSubmenuEntry, ...MenuEntry[]];
    rerender(mount([{ ...copyAs, disabled: true }, ...rest]));

    expect(screen.queryByRole('menu', { name: 'Copy As' })).toBe(null);
    expect(document.activeElement).toBe(named('Actions'));
    fireEvent.keyDown(named('Actions'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalledWith('keyboard');
  });

  it('takes the keys back when the host moves it after its anchor took the focus', () => {
    const anchor = document.createElement('button');
    document.body.append(anchor);
    try {
      const onClose = vi.fn();
      const mount = (at: { x: number; y: number }) => (
        <Menu
          anchor={anchor}
          at={at}
          entries={ENTRIES_WITH_SUB}
          label="Actions"
          onClose={onClose}
          onPick={vi.fn()}
        />
      );
      const { rerender } = render(mount({ x: 100, y: 100 }));

      act(() => anchor.focus());
      expect(onClose).not.toHaveBeenCalled();
      rerender(mount({ x: 200, y: 200 }));
      expect(document.activeElement).toBe(named('Actions'));
    } finally {
      anchor.remove();
    }
  });

  it('reads right to left where it is opened, though the document reads left to right', () => {
    render(
      <div dir="rtl">
        <Menu
          at={{ x: 100, y: 100 }}
          entries={ENTRIES_WITH_SUB}
          label="Actions"
          onClose={vi.fn()}
          onPick={vi.fn()}
        />
      </div>
    );

    expect(named('Actions').getAttribute('dir')).toBe('rtl');
    fireEvent.keyDown(named('Actions'), { key: 'ArrowLeft' });
    expect(named('Copy As').getAttribute('dir')).toBe('rtl');
    fireEvent.keyDown(named('Copy As'), { key: 'ArrowRight' });
    expect(screen.queryByRole('menu', { name: 'Copy As' })).toBe(null);
  });

  it('reads where it is opened again once a given direction is taken away', () => {
    const mount = (dir?: 'ltr') => (
      <div dir="rtl">
        <Menu
          at={{ x: 100, y: 100 }}
          dir={dir}
          entries={ENTRIES_WITH_SUB}
          label="Actions"
          onClose={vi.fn()}
          onPick={vi.fn()}
        />
      </div>
    );
    const { rerender } = render(mount('ltr'));

    expect(named('Actions').getAttribute('dir')).toBe('ltr');
    rerender(mount());
    expect(named('Actions').getAttribute('dir')).toBe('rtl');
  });

  it('brings the cursor into view when the keys take over a submenu the pointer opened', () => {
    const shown: string[] = [];
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: function (this: HTMLElement) {
        shown.push(this.textContent ?? '');
      }
    });
    try {
      const long: MenuSubmenuEntry = {
        kind: 'submenu',
        id: 'sub',
        label: 'Copy As',
        entries: [
          ...Array.from({ length: 30 }, (_, index) => ({
            id: `off-${index}`,
            label: `Off ${index}`,
            disabled: true
          })),
          { id: 'path', label: 'Path' }
        ]
      };
      render(
        <Menu
          at={{ x: 0, y: 0 }}
          entries={[long]}
          label="Actions"
          onClose={vi.fn()}
          onPick={vi.fn()}
        />
      );

      fireEvent.mouseMove(screen.getByRole('menuitem', { name: 'Copy As' }));
      fireEvent.keyDown(named('Actions'), { key: 'ArrowRight' });
      expect(named('Copy As').getAttribute('aria-activedescendant')).toBe(
        screen.getByRole('menuitem', { name: 'Path' }).id
      );
      expect(shown).toContain('Path');
    } finally {
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    }
  });

  it('keeps the submenu when the pointer leaves the menu before the moment passes', () => {
    vi.useFakeTimers();
    render(
      <Menu
        at={{ x: 0, y: 0 }}
        entries={ENTRIES_WITH_SUB}
        label="Actions"
        onClose={vi.fn()}
        onPick={vi.fn()}
      />
    );

    fireEvent.mouseMove(screen.getByRole('menuitem', { name: 'Copy As' }));
    const open = screen.getByRole('menuitem', { name: 'Open' });
    fireEvent.mouseMove(open);
    fireEvent.mouseOut(open, { relatedTarget: document.body });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(named('Copy As')).toBeTruthy();
  });
});

describe("Menu's submenu as its menu moves", () => {
  const ENTRIES_WITH_SUB: readonly MenuEntry[] = [
    { kind: 'submenu', id: 'copy', label: 'Copy As', entries: [{ id: 'path', label: 'Path' }] },
    { id: 'open', label: 'Open' }
  ];
  const mount = (x: number, y: number, dir: 'ltr' | 'rtl' = 'ltr') => (
    <Menu
      at={{ x, y }}
      dir={dir}
      entries={ENTRIES_WITH_SUB}
      label="Actions"
      onClose={vi.fn()}
      onPick={vi.fn()}
    />
  );
  const named = (name: string) => screen.getByRole('menu', { name });

  it('follows its item when the menu moves', () => {
    const { rerender } = render(mount(260, 80));
    const root = named('Actions');
    const item = screen.getByRole('menuitem', { name: 'Copy As' });
    // The item stands where its menu does, a margin in.
    item.getBoundingClientRect = () =>
      DOMRect.fromRect({
        x: parseInt(root.style.left),
        y: parseInt(root.style.top) + 4,
        width: 120,
        height: 30
      });

    fireEvent.keyDown(root, { key: 'ArrowRight' });
    const submenu = named('Copy As');
    expect([submenu.style.left, submenu.style.top]).toEqual(['380px', '80px']);
    rerender(mount(460, 180));
    expect(document.activeElement).toBe(submenu);
    expect([submenu.style.left, submenu.style.top]).toEqual(['580px', '180px']);
  });

  it('changes sides when the menu turns right to left, and needs no marker of its place', () => {
    const { container, rerender } = render(mount(260, 80));
    const root = named('Actions');
    screen.getByRole('menuitem', { name: 'Copy As' }).getBoundingClientRect = () =>
      DOMRect.fromRect({ x: 260, y: 84, width: 120, height: 30 });

    // Given its direction, it reads none from where it is rendered.
    expect(container.querySelector('span[hidden]')).toBe(null);
    fireEvent.keyDown(root, { key: 'ArrowRight' });
    expect(named('Copy As').style.left).toBe('380px');
    rerender(mount(260, 80, 'rtl'));
    expect(named('Copy As').getAttribute('dir')).toBe('rtl');
    expect(named('Copy As').style.left).toBe('260px');
  });
});
