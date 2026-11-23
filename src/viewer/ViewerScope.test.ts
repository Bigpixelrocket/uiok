import { afterEach, describe, expect, it } from 'vitest';

import { isViewerEventTarget } from './ViewerScope.js';

describe('isViewerEventTarget', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it("takes events aimed inside the viewer or at nothing, never at the page's own controls", () => {
    document.body.innerHTML =
      '<input id="search"><div class="viewer-window"><button id="reload"></button></div><div class="hex-view"><span id="byte"></span></div>';

    expect(isViewerEventTarget(null)).toBe(true);
    expect(isViewerEventTarget(window)).toBe(true);
    expect(isViewerEventTarget(document.body)).toBe(true);
    expect(isViewerEventTarget(document.documentElement)).toBe(true);
    expect(isViewerEventTarget(document.getElementById('reload'))).toBe(true);
    expect(isViewerEventTarget(document.getElementById('byte'))).toBe(true);
    expect(isViewerEventTarget(document.getElementById('search'))).toBe(false);
  });
});
