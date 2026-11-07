// @vitest-environment node

import { describe, expect, it } from 'vitest';

import { hexColour } from './Drawing.logic.js';

describe('a theme colour as a picture takes it', () => {
  it('reads a hex or rgb() colour as #rrggbb, and nothing else', () => {
    expect(hexColour('#abc')).toBe('#aabbcc');
    expect(hexColour(' #1E66F5 ')).toBe('#1e66f5');
    expect(hexColour('#1e66f580')).toBe('#1e66f5');
    expect(hexColour('rgb(30, 102, 245)')).toBe('#1e66f5');
    expect(hexColour('rgba(30 102 245 / 50%)')).toBe('#1e66f5');
    expect(hexColour('var(--x)')).toBeNull();
    expect(hexColour('')).toBeNull();
  });
});
