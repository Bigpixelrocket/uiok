import { afterEach, describe, expect, it } from 'vitest';

import { isViewerEvent } from './ViewerScope.js';

/** Whether the viewer would take a key aimed at `target`, heard on the window as it is. */
function heardAsViewers(target: EventTarget): boolean {
  let answer: boolean | null = null;
  const listen = (event: Event): void => {
    answer = isViewerEvent(event);
  };
  window.addEventListener('keydown', listen);
  target.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })
  );
  window.removeEventListener('keydown', listen);
  if (answer === null) throw new Error('the window never heard the key');
  return answer;
}

describe('isViewerEvent', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("takes events aimed inside the viewer or at nothing, never at the page's own controls", () => {
    document.body.innerHTML =
      '<input id="search"><div class="viewer-window"><button id="reload"></button></div><div class="hex-view"><span id="byte"></span></div>';

    expect(heardAsViewers(window)).toBe(true);
    expect(heardAsViewers(document.body)).toBe(true);
    expect(heardAsViewers(document.documentElement)).toBe(true);
    expect(heardAsViewers(document.getElementById('reload') as HTMLElement)).toBe(true);
    expect(heardAsViewers(document.getElementById('byte') as HTMLElement)).toBe(true);
    expect(heardAsViewers(document.getElementById('search') as HTMLElement)).toBe(false);
  });

  it('knows its own events inside an open shadow root, where the window sees only the host', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML = '<div class="viewer-window"><button id="inside"></button></div>';
    const inside = shadow.getElementById('inside') as HTMLElement;

    let target: EventTarget | null = null;
    const listen = (event: Event): void => {
      target = event.target;
    };
    window.addEventListener('keydown', listen);
    expect(heardAsViewers(inside)).toBe(true);
    inside.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true }));
    window.removeEventListener('keydown', listen);
    expect(target).toBe(host);
  });
});
