import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PaneStatus } from './PaneFrame.js';

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
