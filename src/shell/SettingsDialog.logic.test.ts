import { describe, expect, it } from 'vitest';

import {
  spiedSubsection,
  subsectionScrollTop,
  SUBSECTION_SCROLL_INSET_PX,
  type SubsectionAnchor
} from './SettingsDialog.logic.js';

const anchors: readonly SubsectionAnchor[] = [
  { id: 'tree', top: 40 },
  { id: 'servers', top: 200 },
  { id: 'databases', top: 320 }
];

describe('spiedSubsection', () => {
  it('marks nothing on a page without subsections', () => {
    expect(spiedSubsection([], { scrollTop: 0, clientHeight: 400, scrollHeight: 800 })).toBeNull();
  });

  it('marks the first on a page too short to scroll', () => {
    expect(spiedSubsection(anchors, { scrollTop: 0, clientHeight: 500, scrollHeight: 500 })).toBe(
      'tree'
    );
  });

  it('marks the first before the page has scrolled past its title', () => {
    expect(spiedSubsection(anchors, { scrollTop: 0, clientHeight: 300, scrollHeight: 800 })).toBe(
      'tree'
    );
  });

  it('marks the last subsection whose start has reached the top edge', () => {
    const view = { clientHeight: 300, scrollHeight: 800 };

    expect(spiedSubsection(anchors, { ...view, scrollTop: 180 })).toBe('servers');
    expect(spiedSubsection(anchors, { ...view, scrollTop: 170 })).toBe('tree');
    expect(spiedSubsection(anchors, { ...view, scrollTop: 330 })).toBe('databases');
  });

  it('marks the last once the page is scrolled to its end, short as it may be', () => {
    expect(spiedSubsection(anchors, { scrollTop: 200, clientHeight: 300, scrollHeight: 500 })).toBe(
      'databases'
    );
  });
});

describe('subsectionScrollTop', () => {
  it('scrolls to the top for the first, keeping the page title in view', () => {
    expect(subsectionScrollTop(anchors, 'tree')).toBe(0);
  });

  it('brings a later subsection under the column’s top padding', () => {
    expect(subsectionScrollTop(anchors, 'servers')).toBe(200 - SUBSECTION_SCROLL_INSET_PX);
  });

  it('a subsection the page does not draw has nowhere to scroll', () => {
    expect(subsectionScrollTop(anchors, 'missing')).toBeNull();
  });
});
