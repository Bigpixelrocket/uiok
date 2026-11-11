import { render } from '@testing-library/react';
import { Play } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { PanePathBar, PaneStatus } from './PaneFrame.js';
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
