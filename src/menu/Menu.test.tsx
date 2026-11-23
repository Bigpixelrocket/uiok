import { fireEvent, render, screen } from '@testing-library/react';
import { Copy, Trash2 } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';

import { isNativeKeyboardTarget } from '../keyboard/Keyboard.logic.js';
import { Menu, type MenuEntry } from './Menu.js';

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

    expect(menu.querySelector('.cursor')?.textContent).toBe('Remove…');
    expect(screen.getByRole('img', { name: 'Shown' })).toBeTruthy();
    expect(menu.style.left).toBe('40px');
    expect(menu.style.top).toBe('34px');
    fireEvent.mouseDown(anchor);
    expect(onClose).not.toHaveBeenCalled();
    anchor.remove();
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
