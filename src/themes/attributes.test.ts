import { afterEach, describe, expect, it, vi } from 'vitest';

import { subscribeThemeChange, wearThemes } from './attributes.js';

/** A root element of its own, so no test leaves attributes on the document's. */
const freshRoot = () => document.createElement('html');

/** Lets the mutation records queued so far reach their observers. */
const records = () => Promise.resolve();

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
});

describe('wearThemes', () => {
  it('names the theme each appearance wears on the root element', () => {
    const root = freshRoot();
    wearThemes(root, { light: 'catppuccin-latte', dark: 'catppuccin-frappe' });

    expect(root.getAttribute('data-light-theme')).toBe('catppuccin-latte');
    expect(root.getAttribute('data-dark-theme')).toBe('catppuccin-frappe');
  });
});

describe('subscribeThemeChange', () => {
  it('calls when the root comes to wear another theme, and not for the same one again', async () => {
    const root = freshRoot();
    wearThemes(root, { light: 'catppuccin-latte', dark: 'catppuccin-mocha' });
    const listener = vi.fn();
    const stop = subscribeThemeChange(listener, root, window);

    wearThemes(root, { light: 'catppuccin-latte', dark: 'catppuccin-mocha' });
    await records();
    expect(listener).not.toHaveBeenCalled();

    wearThemes(root, { light: 'catppuccin-latte', dark: 'catppuccin-macchiato' });
    await records();
    expect(listener).toHaveBeenCalledOnce();

    // Another attribute is not a theme.
    root.setAttribute('data-variant', 'compact');
    await records();
    expect(listener).toHaveBeenCalledOnce();

    stop();
    wearThemes(root, { light: 'catppuccin-latte', dark: 'catppuccin-frappe' });
    await records();
    expect(listener).toHaveBeenCalledOnce();
  });

  it('calls when the appearance flips, until unsubscribed', () => {
    const listeners = new Set<() => void>();
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      value: (query: string) => {
        expect(query).toBe('(prefers-color-scheme: dark)');
        return {
          matches: false,
          addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
          removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener)
        };
      }
    });
    const listener = vi.fn();
    const stop = subscribeThemeChange(listener, freshRoot(), window);

    for (const flip of listeners) flip();
    expect(listener).toHaveBeenCalledOnce();

    stop();
    expect(listeners.size).toBe(0);
  });
});
