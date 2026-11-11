import { render } from '@testing-library/react';
import { Play } from 'lucide-react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PanePathBar, PaneStatus, PathFact } from './PaneFrame.js';
import { QuietAction } from './PaneActions.js';

describe('PaneStatus', () => {
  it('carries a summary in words whole as its tooltip, opened while a pane cuts it', () => {
    const { container } = render(<PaneStatus>390 GB in 142 folders and 858 files</PaneStatus>);

    expect(container.querySelector('.pane-summary')?.getAttribute('data-tooltip')).toBe(
      '390 GB in 142 folders and 858 files'
    );
    // Opened only while the pane cuts it.
    expect(container.querySelector('.pane-summary')?.hasAttribute('data-tooltip-cut')).toBe(true);
  });

  it('gives a summary drawn as markup no tooltip of its own', () => {
    const { container } = render(
      <PaneStatus>
        <strong>3</strong> items
      </PaneStatus>
    );

    expect(container.querySelector('.pane-summary')?.hasAttribute('data-tooltip')).toBe(false);
  });
});

describe('PanePathBar', () => {
  it('cuts every crumb in an inner box that opens its label only while it is cut', () => {
    const { container } = render(
      <PanePathBar heading trail={['Servers', { label: 'local', onOpen: () => {} }, 'shop']} />
    );
    const words = [...container.querySelectorAll('.crumb-text')];

    expect(words.map((box) => box.textContent)).toEqual(['Servers', 'local', 'shop']);
    for (const box of words) {
      expect(box.getAttribute('data-tooltip')).toBe(box.textContent);
      expect(box.hasAttribute('data-tooltip-cut')).toBe(true);
    }
    // No crumb repeats its label in a tooltip that opens whether cut or not.
    expect(container.querySelectorAll('.crumb-label[data-tooltip]')).toHaveLength(0);
    expect(container.querySelector('h2.crumb-label > .crumb-text')?.textContent).toBe('shop');
  });

  it("keeps a control crumb's tip on the crumb itself, open whether cut or not", () => {
    const { container } = render(
      <PanePathBar trail={[{ label: 'Servers', onOpen: () => {}, tip: 'Back to servers' }, 'x']} />
    );
    const button = container.querySelector('button.crumb-label');

    expect(button?.getAttribute('data-tooltip')).toBe('Back to servers');
    expect(button?.hasAttribute('data-tooltip-cut')).toBe(false);
    expect(button?.querySelector('.crumb-text')?.hasAttribute('data-tooltip')).toBe(false);
  });
});

describe('QuietAction', () => {
  it('draws its verb in a box of its own, which a host can hide in an icons-only look', () => {
    const { container } = render(
      <QuietAction icon={Play} label="Start web" onClick={() => undefined} word="Start" />
    );
    const button = container.querySelector('button.pane-act');

    expect(button?.querySelector('.pane-act-word')?.textContent).toBe('Start');
    expect(button?.getAttribute('aria-label')).toBe('Start web');
  });
});

describe('PathFact', () => {
  it('writes the words in a box that cuts, with the cut-only tooltip, after its mark', () => {
    const { container } = render(
      <PathFact mark={<i className="mark" />} tone="danger">
        Stopped: port 5173 in use
      </PathFact>
    );
    const fact = container.querySelector('.path-facts');
    const text = fact?.querySelector(':scope > .path-fact-text');

    expect(fact?.className).toBe('path-facts danger');
    expect(fact?.firstElementChild?.className).toBe('mark');
    expect(text?.textContent).toBe('Stopped: port 5173 in use');
    expect(text?.getAttribute('data-tooltip')).toBe('Stopped: port 5173 in use');
    expect(text?.hasAttribute('data-tooltip-cut')).toBe(true);
  });

  it('is a plain fact without a tone', () => {
    const { container } = render(<PathFact>Synced</PathFact>);

    expect(container.querySelector('.path-facts')?.className).toBe('path-facts');
  });
});

describe('PanePathBar trail fit', () => {
  afterEach(() => vi.restoreAllMocks());

  /** Lays the row out as `rects` says, by class, before the bar renders. */
  function layout(rects: Record<string, { left: number; right: number }>): void {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element
    ) {
      const key = Object.keys(rects).find((name) => this.classList.contains(name));
      const { left, right } = key === undefined ? { left: 0, right: 0 } : rects[key]!;
      return {
        left,
        right,
        width: right - left,
        top: 0,
        bottom: 0,
        height: 0,
        x: left,
        y: 0
      } as DOMRect;
    });
    vi.spyOn(HTMLElement.prototype, 'offsetWidth', 'get').mockImplementation(function (
      this: HTMLElement
    ) {
      const key = Object.keys(rects).find((name) => this.classList.contains(name));
      return key === undefined ? 0 : rects[key]!.right - rects[key]!.left;
    });
  }

  it('sets the crumb count on the trail', () => {
    const { container } = render(<PanePathBar trail={['a', 'b', 'c']} />);

    expect(
      (container.querySelector('.pane-crumbs') as HTMLElement).style.getPropertyValue(
        '--pane-crumb-count'
      )
    ).toBe('3');
  });

  it('gives a trail what the row leaves it once the tools would leave the row', () => {
    // A 260px row whose tools, at their least, end 40px past it.
    layout({
      'pane-path-row': { left: 0, right: 260 },
      'pane-crumbs': { left: 0, right: 160 },
      'path-facts': { left: 160, right: 300 }
    });
    const { container } = render(
      <PanePathBar trail={['a', 'b', 'c', 'd', 'e']}>
        <span className="path-facts">Stopped</span>
      </PanePathBar>
    );
    const trail = container.querySelector('.pane-crumbs') as HTMLElement;

    expect(trail.style.getPropertyValue('--pane-crumb-fit')).toBe('120px');
    expect(trail.hasAttribute('data-cramped')).toBe(true);
  });

  it('leaves a trail its floor while everything fits', () => {
    layout({
      'pane-path-row': { left: 0, right: 360 },
      'pane-crumbs': { left: 0, right: 160 },
      'path-facts': { left: 160, right: 300 }
    });
    const { container } = render(
      <PanePathBar trail={['a', 'b', 'c']}>
        <span className="path-facts">Stopped</span>
      </PanePathBar>
    );
    const trail = container.querySelector('.pane-crumbs') as HTMLElement;

    expect(trail.style.getPropertyValue('--pane-crumb-fit')).toBe('');
    expect(trail.hasAttribute('data-cramped')).toBe(false);
  });
});
