import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { labelParts } from './NameCut.logic.js';
import { NameCut } from './NameCut.js';

describe('NameCut', () => {
  it('draws a long name as a head that gives way and a tail that stays, read whole once', () => {
    const line = 'Copying "Better.Call.Saul.S01E01.1080p.BluRay.CtrlHD.mkv" to "Seedbox"';
    const { container } = render(<NameCut parts={labelParts(line)} />);

    expect(container.querySelector('.visually-hidden')?.textContent).toBe(line);
    expect(container.querySelector('.name-cut-line')?.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelector('.name-cut-tail')?.textContent).toBe('CtrlHD.mkv"');
    // The tail's box runs right to left for its front ellipsis; its name keeps its own order.
    expect(container.querySelector('.name-cut-tail > bdi')?.getAttribute('dir')).toBe('ltr');
    expect(container.querySelector('.name-cut-rest')?.textContent).toBe(' to "Seedbox"');
  });

  it('draws a line with a short name as words that give way at their end, read as drawn', () => {
    const line = 'Copying "Breaking Bad" to "Seedbox"';
    const { container } = render(<NameCut parts={labelParts(line)} />);

    expect(container.querySelector('.visually-hidden')).toBeNull();
    expect(container.querySelector('.name-cut-head')).toBeNull();
    expect(container.querySelector('.name-cut-line')?.hasAttribute('aria-hidden')).toBe(false);
    expect(container.querySelector('.name-cut-rest')?.textContent).toBe(line);
  });
});
