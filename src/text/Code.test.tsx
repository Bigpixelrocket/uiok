import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Code } from './Code.js';

describe('Code', () => {
  it('sets a command inside a sentence as inline code', () => {
    render(
      <p>
        Run <Code>brew services list</Code> to see them.
      </p>
    );

    const code = screen.getByText('brew services list');

    expect(code.tagName).toBe('CODE');
    expect(code.className).toBe('inline-code');
    expect(code.parentElement?.textContent).toBe('Run brew services list to see them.');
  });
});
