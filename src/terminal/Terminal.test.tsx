import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { createRef } from 'react';
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';

import { UiokProvider } from '../labels/UiokProvider.js';
import type { GhosttyTerminalSurfaceOptions } from './ghostty/surface.js';
import { Terminal, type TerminalHandle } from './Terminal.js';
import {
  BELL_FLASH_MS,
  BELL_INTERVAL_MS,
  type TerminalAction,
  type TerminalKeyStroke
} from './Terminal.logic.js';
import { TerminalScrollbackContext } from './TerminalScrollback.js';

// The engine itself is covered by the ghostty suites; here a stand-in records
// what the component asks of it.
const engine = vi.hoisted(() => {
  class FakeSurface {
    readonly options: GhosttyTerminalSurfaceOptions;
    readonly mount: HTMLElement;
    readonly input: HTMLTextAreaElement | null;
    readonly scrollbar: HTMLDivElement;
    readonly calls: string[] = [];
    disposed = false;
    selection = '';

    constructor(mount: HTMLElement, options: GhosttyTerminalSurfaceOptions) {
      this.mount = mount;
      this.options = options;
      this.input = options.readOnly === true ? null : document.createElement('textarea');
      if (this.input !== null) mount.append(this.input);
      this.scrollbar = document.createElement('div');
      this.scrollbar.setAttribute('role', 'scrollbar');
      if (options.scrollbackLabel !== undefined) {
        this.scrollbar.setAttribute('aria-label', options.scrollbackLabel);
      }
      mount.append(this.scrollbar);
    }

    enqueue(data: string) {
      this.calls.push(`enqueue:${data}`);
      this.options.onParsed?.(data.length);
    }

    resetAndWrite(data: string) {
      this.calls.push(`reset:${data}`);
    }

    clearToStart() {
      this.calls.push('clear');
    }

    scrollToBottom() {
      this.calls.push('bottom');
    }

    setTheme() {
      this.calls.push('theme');
    }

    setScrollbackLines(lines: number) {
      this.calls.push(`scrollback:${lines}`);
    }

    focus() {
      this.input?.focus();
    }

    hasSelection() {
      return this.selection.length > 0;
    }

    getSelection() {
      return this.selection;
    }

    paste(text: string) {
      this.calls.push(`paste:${text}`);
    }

    dispose() {
      this.disposed = true;
    }
  }

  const state = {
    surfaces: [] as FakeSurface[],
    /** Resolves the most recent `create`; a test decides when the engine is ready. */
    finish: (): void => {},
    fail: (() => {}) as (error: unknown) => void
  };

  return {
    FakeSurface,
    state,
    create: (mount: HTMLElement, options: GhosttyTerminalSurfaceOptions) =>
      new Promise<FakeSurface>((resolve, reject) => {
        state.finish = () => {
          const surface = new FakeSurface(mount, options);
          state.surfaces.push(surface);
          resolve(surface);
        };
        state.fail = reject;
      })
  };
});

vi.mock('./ghostty/surface.js', () => ({
  GhosttyTerminalSurface: { create: engine.create }
}));

async function ready(): Promise<InstanceType<typeof engine.FakeSurface>> {
  await act(async () => engine.state.finish());
  const surface = engine.state.surfaces.at(-1);
  if (surface === undefined) throw new Error('The engine did not start');
  return surface;
}

/** Stands in for the web Clipboard API, which jsdom lacks, for one test. */
function stubClipboard(text: string) {
  const clipboard = {
    readText: vi.fn(async () => text),
    writeText: vi.fn<(text: string) => Promise<void>>(async () => {})
  };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: clipboard });
  onTestFinished(() => {
    Reflect.deleteProperty(navigator, 'clipboard');
  });
  return clipboard;
}

/** A secondary click on the screen, as the surface reports it. */
function openMenu(surface: InstanceType<typeof engine.FakeSurface>): HTMLElement {
  act(() => surface.options.onContextMenu?.({ clientX: 30, clientY: 40 }));
  return screen.getByRole('menu', { name: 'Terminal' });
}

/** Each item of the open menu, by label, and whether it can run. */
function menuItems(): [string, boolean][] {
  return screen
    .getAllByRole('menuitem')
    .map((item) => [
      item.querySelector('.terminal-menu-label')?.textContent ?? '',
      item.getAttribute('aria-disabled') !== 'true'
    ]);
}

function keydown(init: KeyboardEventInit): KeyboardEvent {
  return new KeyboardEvent('keydown', { cancelable: true, bubbles: true, ...init });
}

describe('Terminal', () => {
  beforeEach(() => {
    engine.state.surfaces = [];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('holds output, resets, and focus that arrive before the engine, then applies them', async () => {
    const onConsumed = vi.fn();
    const handle = createRef<TerminalHandle>();
    render(<Terminal ariaLabel="Shell" onConsumed={onConsumed} onInput={() => {}} ref={handle} />);

    handle.current?.write('dropped');
    handle.current?.reset();
    expect(onConsumed).toHaveBeenCalledWith(7);
    handle.current?.write('first');
    handle.current?.write('');
    handle.current?.write('second');
    handle.current?.focus();
    const mount = document.querySelector('.terminal-mount');
    expect(document.activeElement).toBe(mount);

    const surface = await ready();
    expect(surface.calls).toEqual(['theme', 'enqueue:first', 'enqueue:second']);
    expect(onConsumed.mock.calls).toEqual([[7], [5], [6]]);
    // Focus held by the host element moves into the input element.
    expect(document.activeElement).toBe(surface.input);

    handle.current?.write('later');
    handle.current?.reset();
    expect(surface.calls.slice(-2)).toEqual(['enqueue:later', 'reset:']);
  });

  it('starts the engine with the scrollback length, then hands it every change', async () => {
    const shell = (lines: number) => (
      <TerminalScrollbackContext.Provider value={lines}>
        <Terminal ariaLabel="Shell" onInput={() => {}} />
      </TerminalScrollbackContext.Provider>
    );
    const { rerender } = render(shell(50_000));
    // A change while the engine loads is handed over once it is ready.
    rerender(shell(1_000));
    const surface = await ready();
    expect(surface.options.scrollbackLines).toBe(50_000);
    expect(surface.calls).toEqual(['theme', 'scrollback:1000']);

    // A new length reaches the running terminal; the same length again does nothing.
    rerender(shell(10_000));
    rerender(shell(10_000));
    expect(surface.calls).toEqual(['theme', 'scrollback:1000', 'scrollback:10000']);
    expect(surface.disposed).toBe(false);
    expect(engine.state.surfaces).toHaveLength(1);
  });

  it('relays size, input, and parsed output through the latest props', async () => {
    const first = vi.fn();
    const second = vi.fn();
    const onResize = vi.fn();
    const { rerender } = render(<Terminal ariaLabel="Shell" onInput={first} onResize={onResize} />);
    const surface = await ready();

    surface.options.onResize(80, 24);
    expect(onResize).toHaveBeenCalledWith({ cols: 80, rows: 24 });
    rerender(<Terminal ariaLabel="Shell" onInput={second} onResize={onResize} />);
    surface.options.onData('ls\r');
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith('ls\r');
    // Changing a callback does not restart the engine.
    expect(engine.state.surfaces).toHaveLength(1);
  });

  it('builds an interactive engine labelled on its input, with the app font and theme', async () => {
    render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
    const surface = await ready();

    expect(surface.options.readOnly).toBe(false);
    expect(surface.options.inputLabel).toBe('Shell');
    expect(surface.options.font?.size).toBe(13);
    expect(surface.options.font?.lineHeight).toBe(19);
    expect(surface.options.theme.background).toEqual({ r: 30, g: 30, b: 46 });
    expect(surface.options.beforeKey).toBeTypeOf('function');
    const mount = document.querySelector('.terminal-mount');
    expect(mount?.getAttribute('role')).toBeNull();
    expect(mount?.getAttribute('tabindex')).toBe('-1');
  });

  it('answers the chords its host binds to its actions, and types every other key', async () => {
    const onInput = vi.fn();
    const handle = createRef<TerminalHandle>();
    // A host binding of its own: ⌘J clears, ⌥← moves back a word.
    const actionForKey = (stroke: TerminalKeyStroke): TerminalAction | null =>
      stroke.metaKey && stroke.key === 'j'
        ? 'clear'
        : stroke.altKey && stroke.key === 'ArrowLeft'
          ? 'word-back'
          : null;
    render(
      <Terminal actionForKey={actionForKey} ariaLabel="Shell" onInput={onInput} ref={handle} />
    );
    const surface = await ready();
    const beforeKey = surface.options.beforeKey!;

    const clear = keydown({ key: 'j', metaKey: true });
    expect(beforeKey(clear)).toBe(false);
    expect(clear.defaultPrevented).toBe(true);
    expect(surface.calls).toContain('clear');

    expect(beforeKey(keydown({ key: 'ArrowLeft', altKey: true }))).toBe(false);
    expect(onInput).toHaveBeenCalledWith('\u001bb');
    expect(surface.calls.at(-1)).toBe('bottom');
    // ⌘K is not this host's, so it reaches the program as typed.
    expect(beforeKey(keydown({ key: 'k', metaKey: true }))).toBe(true);
    expect(beforeKey(keydown({ key: 'a' }))).toBe(true);

    // A press on a legend's slot runs the same action.
    act(() => handle.current?.perform('line-end'));
    expect(onInput).toHaveBeenLastCalledWith('\u0005');
  });

  it('answers no chord without bindings, and acts on none read-only', async () => {
    const { unmount } = render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
    const interactive = await ready();
    expect(interactive.options.beforeKey!(keydown({ key: 'k', metaKey: true }))).toBe(true);
    unmount();

    const handle = createRef<TerminalHandle>();
    render(<Terminal actionForKey={() => 'clear'} ariaLabel="Log" ref={handle} />);
    const log = await ready();
    act(() => handle.current?.perform('clear'));
    expect(log.calls).not.toContain('clear');
  });

  it('is read-only without onInput: a labelled focusable group with no input', async () => {
    render(<Terminal ariaLabel="Install log" />);
    const surface = await ready();

    expect(surface.options.readOnly).toBe(true);
    expect(surface.options.beforeKey).toBeUndefined();
    expect(surface.input).toBeNull();
    const group = screen.getByRole('group', { name: 'Install log' });
    expect(group.getAttribute('tabindex')).toBe('0');
    // Replies to queries have nowhere to go.
    expect(() => surface.options.onData('\u001b[0n')).not.toThrow();
  });

  it('flashes on the bell at most once an interval, and reports every bell, folded or not', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] });
    onTestFinished(() => {
      vi.useRealTimers();
    });
    const onBell = vi.fn();
    const { container } = render(<Terminal ariaLabel="Shell" onBell={onBell} onInput={() => {}} />);
    const surface = await ready();
    const mount = container.querySelector('.terminal-mount')!;
    const ring = surface.options.onBell!;

    ring();
    expect(mount.hasAttribute('data-bell')).toBe(true);
    expect(onBell).toHaveBeenCalledOnce();

    // The flash ends on its own. Bells inside the interval fold into it
    // without flashing, yet each is still reported: a host marking a tab
    // that stepped behind during the flash must hear of them.
    vi.advanceTimersByTime(BELL_FLASH_MS);
    expect(mount.hasAttribute('data-bell')).toBe(false);
    ring();
    expect(onBell).toHaveBeenCalledTimes(2);
    vi.advanceTimersByTime(BELL_INTERVAL_MS - BELL_FLASH_MS - 1);
    ring();
    expect(mount.hasAttribute('data-bell')).toBe(false);
    expect(onBell).toHaveBeenCalledTimes(3);

    vi.advanceTimersByTime(1);
    ring();
    expect(mount.hasAttribute('data-bell')).toBe(true);
    expect(onBell).toHaveBeenCalledTimes(4);
  });

  it('keeps still on the bell without onBell, and never rings read-only', async () => {
    const { container, rerender } = render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
    const surface = await ready();

    surface.options.onBell?.();
    expect(container.querySelector('.terminal-mount')?.hasAttribute('data-bell')).toBe(false);

    // A setting turned on later takes effect without restarting the engine.
    const onBell = vi.fn();
    rerender(<Terminal ariaLabel="Shell" onBell={onBell} onInput={() => {}} />);
    surface.options.onBell?.();
    expect(onBell).toHaveBeenCalledOnce();
    expect(engine.state.surfaces).toHaveLength(1);

    rerender(<Terminal ariaLabel="Log" onBell={onBell} />);
    const readOnly = await ready();
    expect(readOnly.options.onBell).toBeUndefined();
  });

  it('opens web links through the window, which the host routes to the browser', async () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
    const surface = await ready();

    surface.options.onLinkActivate?.('https://example.com', new MouseEvent('pointerup'));
    expect(open).toHaveBeenCalledWith('https://example.com', '_blank', 'noopener,noreferrer');
  });

  it('re-reads the theme when the appearance changes and frees the engine on unmount', async () => {
    const listeners = new Set<() => void>();
    // jsdom has no matchMedia; install one for this test only.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: () => ({
        matches: false,
        addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
        removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener)
      })
    });
    onTestFinished(() => {
      Reflect.deleteProperty(window, 'matchMedia');
    });
    const { unmount } = render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
    const surface = await ready();

    for (const listener of listeners) listener();
    expect(surface.calls.filter((call) => call === 'theme')).toHaveLength(2);
    unmount();
    expect(surface.disposed).toBe(true);
    expect(listeners.size).toBe(0);
  });

  it('re-reads the theme when the window comes to wear another theme', async () => {
    const root = document.documentElement;
    onTestFinished(() => {
      root.removeAttribute('data-dark-theme');
    });
    const { unmount } = render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
    const surface = await ready();

    await act(async () => {
      root.setAttribute('data-dark-theme', 'catppuccin-frappe');
      // The attribute's record arrives as a microtask.
      await Promise.resolve();
    });
    expect(surface.calls.filter((call) => call === 'theme')).toHaveLength(2);

    unmount();
    root.setAttribute('data-dark-theme', 'catppuccin-macchiato');
    await Promise.resolve();
    expect(surface.calls.filter((call) => call === 'theme')).toHaveLength(2);
  });

  it('starts a fresh engine when the mode changes', async () => {
    const { rerender } = render(<Terminal ariaLabel="Log" />);
    const readOnly = await ready();
    rerender(<Terminal ariaLabel="Log" onInput={() => {}} />);
    expect(readOnly.disposed).toBe(true);
    const interactive = await ready();
    expect(interactive.options.readOnly).toBe(false);
  });

  it('names the scrollbar from the labels, and renames it when they change', async () => {
    const shell = (scrollback?: string) => (
      <UiokProvider labels={scrollback === undefined ? {} : { terminal: { scrollback } }}>
        <Terminal ariaLabel="Shell" onInput={() => {}} />
      </UiokProvider>
    );
    const { rerender, unmount } = render(shell());
    const surface = await ready();
    expect(surface.options.scrollbackLabel).toBe('Scrollback');
    expect(screen.getByRole('scrollbar', { name: 'Scrollback' })).toBe(surface.scrollbar);

    rerender(shell('Verlauf'));
    expect(screen.getByRole('scrollbar', { name: 'Verlauf' })).toBe(surface.scrollbar);
    expect(engine.state.surfaces).toHaveLength(1);
    unmount();

    // A change while the engine loads names the scrollbar once it is ready.
    const loading = render(shell('Verlauf'));
    loading.rerender(shell('Historique'));
    const later = await ready();
    expect(later.options.scrollbackLabel).toBe('Verlauf');
    expect(screen.getByRole('scrollbar', { name: 'Historique' })).toBe(later.scrollbar);
  });

  describe('menu', () => {
    it('rewords an open menu when the labels change', async () => {
      const german = { terminal: { menu: 'Terminal', copy: 'Kopieren', paste: 'Einsetzen' } };
      const { rerender } = render(
        <UiokProvider labels={{}}>
          <Terminal ariaLabel="Terminal" onInput={() => {}} />
        </UiokProvider>
      );
      const surface = await ready();
      openMenu(surface);

      rerender(
        <UiokProvider labels={german}>
          <Terminal ariaLabel="Terminal" onInput={() => {}} />
        </UiokProvider>
      );
      expect(screen.getByRole('menuitem', { name: /^Kopieren/ })).toBeTruthy();
      expect(screen.getByRole('menuitem', { name: /^Einsetzen/ })).toBeTruthy();
    });

    it('opens through a portal on the body, in the menu look, so no box around the terminal clips it', async () => {
      const { container } = render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
      const surface = await ready();
      openMenu(surface);
      const menu = screen.getByRole('menu');

      expect(container.contains(menu)).toBe(false);
      expect(menu.parentElement).toBe(document.body);
      expect(menu.className).toBe('folder-menu terminal-menu');
      expect(screen.getAllByRole('menuitem')[0]?.classList.contains('folder-menu-option')).toBe(
        true
      );
    });

    it('shows the chords its host names beside Copy and Paste', async () => {
      render(
        <Terminal
          ariaLabel="Shell"
          menuChords={{
            copy: { key: 'c', ctrl: true, shift: true },
            paste: { key: 'v', ctrl: true, shift: true }
          }}
          onInput={() => {}}
        />
      );
      const surface = await ready();
      openMenu(surface);
      const [copy, paste] = screen.getAllByRole('menuitem');
      expect(copy?.querySelector('.keychord')?.getAttribute('aria-label')).toBe('Control Shift C');
      expect(paste?.querySelector('.keychord')?.getAttribute('aria-label')).toBe('Control Shift V');
    });

    it('offers Copy with a selection and Paste in an interactive terminal, and holds the keys', async () => {
      render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
      const surface = await ready();

      const menu = openMenu(surface);
      expect(menuItems()).toEqual([
        ['Copy', false],
        ['Paste', true]
      ]);
      expect(document.activeElement).toBe(menu);
      // An overlay, so the window holds ⌘W while it shows.
      expect(menu.hasAttribute('data-overlay')).toBe(true);
      expect(within(menu).getAllByRole('menuitem')[1]?.className).toContain('cursor');

      fireEvent.mouseDown(document.body);
      expect(screen.queryByRole('menu')).toBeNull();

      surface.selection = 'hello';
      openMenu(surface);
      expect(menuItems()).toEqual([
        ['Copy', true],
        ['Paste', true]
      ]);
    });

    it('copies the selection as plain text and gives the terminal the keys back', async () => {
      const clipboard = stubClipboard('');
      render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
      const surface = await ready();
      surface.selection = 'hello';

      const menu = openMenu(surface);
      fireEvent.keyDown(menu, { key: 'Enter' });
      expect(clipboard.writeText).toHaveBeenCalledWith('hello');
      expect(screen.queryByRole('menu')).toBeNull();
      expect(document.activeElement).toBe(surface.input);
    });

    it('pastes the clipboard through the surface, as ⌘V does', async () => {
      const clipboard = stubClipboard('ls -la\n');
      render(<Terminal ariaLabel="Shell" onInput={() => {}} />);
      const surface = await ready();
      surface.selection = 'hello';

      const menu = openMenu(surface);
      // Copy is first, so the arrow moves on to Paste.
      fireEvent.keyDown(menu, { key: 'ArrowDown' });
      await act(async () => {
        fireEvent.keyDown(menu, { key: 'Enter' });
      });
      expect(clipboard.readText).toHaveBeenCalledOnce();
      expect(clipboard.writeText).not.toHaveBeenCalled();
      expect(surface.calls).toContain('paste:ls -la\n');
    });

    it('offers no paste in a read-only terminal and runs nothing disabled', async () => {
      const clipboard = stubClipboard('rm -rf /');
      render(<Terminal ariaLabel="Install log" />);
      const surface = await ready();

      const menu = openMenu(surface);
      expect(menuItems()).toEqual([
        ['Copy', false],
        ['Paste', false]
      ]);
      fireEvent.keyDown(menu, { key: 'Enter' });
      fireEvent.click(screen.getByText('Paste'));
      await act(async () => {});
      expect(clipboard.readText).not.toHaveBeenCalled();
      expect(surface.calls.some((call) => call.startsWith('paste:'))).toBe(false);

      fireEvent.keyDown(menu, { key: 'Escape' });
      surface.selection = 'done';
      openMenu(surface);
      expect(menuItems()).toEqual([
        ['Copy', true],
        ['Paste', false]
      ]);
      fireEvent.click(screen.getByText('Copy'));
      expect(clipboard.writeText).toHaveBeenCalledWith('done');
    });

    it('closes on Escape without letting it reach the dialog around it', async () => {
      const onKeyDown = vi.fn();
      render(
        <div onKeyDown={onKeyDown} role="presentation">
          <Terminal ariaLabel="Shell" onInput={() => {}} />
        </div>
      );
      const surface = await ready();

      fireEvent.keyDown(openMenu(surface), { key: 'Escape' });
      expect(screen.queryByRole('menu')).toBeNull();
      expect(onKeyDown).not.toHaveBeenCalled();
      expect(document.activeElement).toBe(surface.input);
    });
  });

  it('says so when the engine cannot start, and keeps releasing output', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const onConsumed = vi.fn();
    const handle = createRef<TerminalHandle>();
    render(<Terminal ariaLabel="Shell" onConsumed={onConsumed} ref={handle} />);
    handle.current?.write('queued');

    await act(async () => engine.state.fail(new Error('no WebAssembly')));
    expect(screen.getByText('Could not start the terminal.')).toBeTruthy();
    expect(onConsumed).toHaveBeenCalledWith(6);
    handle.current?.write('more');
    expect(onConsumed).toHaveBeenLastCalledWith(4);
  });
});
