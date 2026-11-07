import { describe, expect, it } from 'vitest';

import { cancelBrowserDocumentKey, isKeyKept } from './BrowserKeys.js';

const keydown = (): KeyboardEvent =>
  new KeyboardEvent('keydown', { key: 'r', metaKey: true, bubbles: true, cancelable: true });

describe('the browser document key cancel', () => {
  it('is not a control keeping the key', () => {
    const event = keydown();

    cancelBrowserDocumentKey(event);

    expect(event.defaultPrevented).toBe(true);
    expect(isKeyKept(event)).toBe(false);
  });

  it('lets propagation go on, so a feature still hears the key', () => {
    const heard: string[] = [];
    const target = document.createElement('div');
    document.body.append(target);
    const guard = (event: Event): void => cancelBrowserDocumentKey(event);
    window.addEventListener('keydown', guard, true);

    try {
      target.addEventListener('keydown', (event) => {
        heard.push(isKeyKept(event) ? 'kept' : 'free');
      });
      target.dispatchEvent(keydown());
    } finally {
      window.removeEventListener('keydown', guard, true);
      target.remove();
    }

    expect(heard).toEqual(['free']);
  });

  it('tells a key a control cancelled apart from one only the guard did', () => {
    const event = keydown();

    event.preventDefault();

    expect(isKeyKept(event)).toBe(true);
    expect(isKeyKept(keydown())).toBe(false);
  });
});
